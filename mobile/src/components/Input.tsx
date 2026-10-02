import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

type Props = TextInputProps & { label: string; error?: string };

export function Input({ label, error, ...rest }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, error && s.inputErr]}
        placeholderTextColor="#999"
        autoCapitalize="none"
        {...rest}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { marginBottom: 6, fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputErr: { borderColor: '#c0392b' },
  err: { color: '#c0392b', marginTop: 4, fontSize: 12 },
});