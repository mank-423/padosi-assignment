import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authApi } from '../api/auth';
import { getErrorMessage, saveToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function VerifyOtpScreen({ route, navigation }: any) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { signIn } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const verify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email, code);
      await saveToken(res.accessToken);
      signIn();
      // Navigation resets: Profile is shown once, then Home
      navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
    } catch (err) {
      Alert.alert('Verification failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authApi.resendOtp(email);
      setCooldown(30);
      Alert.alert('Sent', 'A new code has been sent.');
    } catch (err) {
      Alert.alert('Could not resend', getErrorMessage(err));
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Check your email</Text>
      <Text style={s.sub}>We sent a 6-digit code to {email}</Text>
      <Input
        label="Code"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
      />
      <Button title="Verify" onPress={verify} loading={loading} disabled={code.length !== 6} />
      <Text
        style={[s.resend, cooldown > 0 && s.resendDisabled]}
        onPress={cooldown > 0 ? undefined : resend}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#666', marginBottom: 24 },
  resend: { textAlign: 'center', marginTop: 16, color: '#2563eb', fontWeight: '600' },
  resendDisabled: { color: '#999' },
});