import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radius } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: Props) {
  const secondary = variant === 'secondary';
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        secondary ? s.secondary : s.primary,
        pressed && (secondary ? s.secondaryPressed : s.primaryPressed),
        off && s.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : '#fff'} />
      ) : (
        <Text style={[s.text, secondary && s.textSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary },
  secondaryPressed: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontFamily: fonts.semibold, fontSize: 16 },
  textSecondary: { color: colors.primary },
});