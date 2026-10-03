import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authApi } from '../api/auth';
import { getErrorCode, getErrorMessage, saveToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

export default function VerifyOtpScreen({ route, navigation }: Props) {
  const { email, fromRegister, sendFailed } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // A code was just issued (register / login redirect), so the server cooldown is
  // running: start the timer at 30s.
  const [cooldown, setCooldown] = useState(fromRegister || sendFailed ? 30 : 0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { signIn } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // The account is already verified: the only way forward is to log in
  const handleAlreadyVerified = (message: string) =>
    Alert.alert('Already verified', message, [
      { text: 'Log in', onPress: () => navigation.navigate('Login') },
    ]);

  const verify = async () => {
    if (code.length !== 6) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email, code);
      await saveToken(res.accessToken);
      await signIn(); // navigator moves to Profile or Home
    } catch (err) {
      if (getErrorCode(err) === 'ALREADY_VERIFIED') handleAlreadyVerified(getErrorMessage(err));
      else setError(getErrorMessage(err)); // wrong / expired / too many attempts
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      await authApi.resendOtp(email);
      setCooldown(30);
      setCode('');
      setNotice('A new code has been sent.');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (getErrorCode(err) === 'ALREADY_VERIFIED') {
        handleAlreadyVerified(msg);
      } else if (getErrorCode(err) === 'OTP_COOLDOWN') {
        const m = /(\d+)s/.exec(msg); // sync the timer with "Please wait 25s ..."
        if (m) setCooldown(Number(m[1]));
      } else {
        setError(msg);
      }
    } finally {
      setResending(false);
    }
  };

  const resendOff = cooldown > 0 || resending;

  return (
    <Screen center>
      <Text style={s.title}>Check your email</Text>
      <Text style={s.sub}>
        {sendFailed
          ? `We couldn't send the code to ${email}. Tap "Resend code" to try again.`
          : `We sent a 6-digit code to ${email}`}
      </Text>
      <Input
        label="Code"
        value={code}
        onChangeText={(t) => {
          setCode(t.replace(/\D/g, '').slice(0, 6));
          setError('');
        }}
        keyboardType="number-pad"
        maxLength={6}
        error={error}
      />
      {notice ? <Text style={s.notice}>{notice}</Text> : null}
      <Button title="Verify" onPress={verify} loading={loading} disabled={code.length !== 6} />
      <Text style={[s.resend, resendOff && s.resendOff]} onPress={resendOff ? undefined : resend}>
        {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontFamily: fonts.bold, color: colors.text, marginBottom: 8 },
  sub: { color: colors.muted, marginBottom: 24, fontFamily: fonts.regular },
  notice: { color: colors.success, marginBottom: 12, fontFamily: fonts.regular },
  resend: { textAlign: 'center', marginTop: 20, color: colors.primary, fontFamily: fonts.semibold },
  resendOff: { color: colors.muted },
});