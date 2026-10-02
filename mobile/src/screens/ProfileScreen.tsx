import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../components/Screen';
import { ProfileForm } from '../components/ProfileForm';
import { profileApi } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { colors, fonts } from '../theme';

// Shown once, right after the first successful login
export default function ProfileScreen() {
  const { profileCompleted, signOut } = useAuth();
  const qc = useQueryClient();

  return (
    <Screen>
      <Text style={s.title}>Tell us about you</Text>
      <Text style={s.sub}>This helps your Lifestyle Manager get things done for you.</Text>
      <ProfileForm
        submitLabel="Continue"
        onSubmit={async (p) => {
          const res = await profileApi.save(p);
          qc.setQueryData(['profile'], res);
          profileCompleted(); // goes to Home; this screen never shows again
        }}
      />
      <Text style={s.link} onPress={signOut}>Log out</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontFamily: fonts.bold, color: colors.text, marginBottom: 6 },
  sub: { color: colors.muted, marginBottom: 24, fontFamily: fonts.regular },
  link: { textAlign: 'center', marginTop: 20, color: colors.primary, fontFamily: fonts.semibold },
});