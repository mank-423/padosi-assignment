import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Brand } from '../components/Brand';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authApi } from '../api/auth';
import { getErrorCode, getErrorMessage, normalizeEmail, saveToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { signIn } = useAuth();

  const emailErr = !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Enter a valid email address.' : undefined;
  const passErr = !password ? 'Enter your password.' : undefined;

  const submit = async () => {
    setSubmitted(true);
    if (emailErr || passErr) return;
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      await saveToken(res.accessToken);
      // Checks the profile on the server, then the navigator picks Profile or Home
      await signIn();
    } catch (err) {
      const msg = getErrorMessage(err);
      if (getErrorCode(err) === 'EMAIL_NOT_VERIFIED') {
        // Login never sends an OTP itself, so request one when they choose to verify
        Alert.alert('Verify your email', msg, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Verify now',
            onPress: () => {
              authApi.resendOtp(email).catch(() => {}); // cooldown errors are fine
              navigation.navigate('VerifyOtp', { email: normalizeEmail(email), fromRegister: true });
            },
          },
        ]);
      } else {
        Alert.alert('Login failed', msg);
      }
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <Brand />
      <Text style={s.title}>Welcome back</Text>
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
        autoComplete="email" error={submitted ? emailErr : undefined} />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry
        error={submitted ? passErr : undefined} />
      <Button title="Log in" onPress={submit} loading={loading} />
      <Text style={s.link} onPress={() => navigation.navigate('Register')}>
        New here? Create an account
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontFamily: fonts.bold, color: colors.text, marginBottom: 20 },
  link: { textAlign: 'center', marginTop: 20, color: colors.primary, fontFamily: fonts.semibold },
});