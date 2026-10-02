import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export function Button({
  title, onPress, loading, disabled,
}: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.btn, (disabled || loading) && s.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.text}>{title}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  text: { color: '#fff', fontWeight: '600', fontSize: 16 },
});