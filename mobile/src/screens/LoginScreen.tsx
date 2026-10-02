import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authApi } from '../api/auth';
import { getErrorMessage, saveToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const submit = async () => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      await saveToken(res.accessToken);
      signIn();
      // If profile exists, skip the profile screen
      if (res.user.hasProfile) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      // Special case: route unverified users to OTP screen
      if (err?.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        Alert.alert('Verify your email', msg, [
          { text: 'Verify now', onPress: () => navigation.navigate('VerifyOtp', { email }) },
        ]);
      } else {
        Alert.alert('Login failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Welcome back</Text>
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Log in" onPress={submit} loading={loading} />
      <Text style={s.link} onPress={() => navigation.navigate('Register')}>
        New here? Create an account
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  link: { textAlign: 'center', marginTop: 16, color: '#2563eb' },
});