import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

export function LoadingView() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry, onSecondary, secondaryLabel }:
  { message: string; onRetry?: () => void; onSecondary?: () => void; secondaryLabel?: string }) {
  return (
    <View style={s.center}>
      <Text style={s.err}>{message}</Text>
      {onRetry && <Text style={s.retry} onPress={onRetry}>Tap to retry</Text>}
      {onSecondary && <Text style={[s.retry, { marginTop: 16 }]} onPress={onSecondary}>{secondaryLabel}</Text>}
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View style={s.center}>
      <Text style={s.muted}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  err: { color: colors.danger, marginBottom: 12, textAlign: 'center', fontFamily: fonts.regular },
  retry: { color: colors.primary, fontFamily: fonts.semibold },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.regular },
});