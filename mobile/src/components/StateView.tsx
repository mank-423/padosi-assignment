import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingView() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.err}>{message}</Text>
      {onRetry && <Text style={s.retry} onPress={onRetry}>Tap to retry</Text>}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: '#c0392b', marginBottom: 12, textAlign: 'center' },
  retry: { color: '#2563eb', fontWeight: '600' },
  muted: { color: '#666' },
});