import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { LoadingView, ErrorView } from '../components/StateView';
import { profileApi } from '../api/profile';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={value ? s.value : s.valueEmpty}>{value?.trim() || 'Not provided'}</Text>
    </View>
  );
}

export default function AccountScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const q = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });

  if (q.isLoading) return <LoadingView />;
  if (q.error && !q.data) return <ErrorView message={getErrorMessage(q.error)} onRetry={q.refetch} />;

  const p = q.data?.profile;
  const initial = (p?.name?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <Screen>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={s.card}>
        <Field label="Name" value={p?.name} />
        <Field label="Mobile number" value={p?.mobile} />
        <Field label="Address" value={p?.address} />
        <Field label="Business name" value={p?.businessName} />
      </View>
      <Button title="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
      <View style={{ height: 10 }} />
      <Button title="Log out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const s = StyleSheet.create({
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20,
  },
  avatarText: { fontSize: 28, fontFamily: fonts.bold, color: colors.primary },
  card: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: 16, marginBottom: 20,
  },
  field: { paddingVertical: 8 },
  label: { fontSize: 12, color: colors.label, fontFamily: fonts.medium, marginBottom: 2 },
  value: { fontSize: 16, color: colors.text, fontFamily: fonts.medium },
  valueEmpty: { fontSize: 16, color: colors.muted, fontFamily: fonts.regular },
});