import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Brand } from '../components/Brand';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authApi } from '../api/auth';
import { getErrorCode, getErrorMessage, normalizeEmail } from '../api/client';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type Field = 'email' | 'password' | 'confirm';

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors: Partial<Record<Field, string>> = {};
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (password !== confirm) errors.confirm = 'Passwords do not match.';

  // Inline validation: show an error once the field was visited or submit was tried
  const show = (f: Field) => (touched[f] || submitted ? errors[f] : undefined);
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      await authApi.register(email, password);
      navigation.navigate('VerifyOtp', { email: normalizeEmail(email), fromRegister: true });
    } catch (err) {
      if (getErrorCode(err) === 'EMAIL_TAKEN') {
        Alert.alert('Account exists', getErrorMessage(err), [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log in', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Sign up failed', getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center>
      <Brand />
      <Text style={s.title}>Create your account</Text>
      <Input label="Email" value={email} onChangeText={setEmail} onBlur={blur('email')}
        keyboardType="email-address" autoComplete="email" error={show('email')} />
      <Input label="Password" value={password} onChangeText={setPassword} onBlur={blur('password')}
        secureTextEntry error={show('password')} />
      <Input label="Confirm password" value={confirm} onChangeText={setConfirm} onBlur={blur('confirm')}
        secureTextEntry error={show('confirm')} />
      <Button title="Sign up" onPress={submit} loading={loading} />
      <Text style={s.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Log in
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontFamily: fonts.bold, color: colors.text, marginBottom: 20 },
  link: { textAlign: 'center', marginTop: 20, color: colors.primary, fontFamily: fonts.semibold },
});