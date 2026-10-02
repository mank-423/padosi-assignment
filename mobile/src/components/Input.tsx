import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScreen } from './Screen';
import { colors, fonts, radius } from '../theme';

type Props = TextInputProps & { label: string; error?: string };

export function Input({ label, error, secureTextEntry, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true); // password visibility
  const y = useRef(0);
  const screen = useScreen();
  const isPassword = !!secureTextEntry;

  return (
    <View style={s.wrap} onLayout={(e) => (y.current = e.nativeEvent.layout.y)}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.field, focused && s.fieldFocused, !!error && s.fieldErr]}>
        <TextInput
          style={[s.input, rest.multiline && s.multiline]}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          {...rest}
          secureTextEntry={isPassword && hidden}
          autoCorrect={isPassword ? false : rest.autoCorrect}
          onFocus={(e) => {
            setFocused(true);
            screen?.scrollTo(y.current); // keep the active field above the keyboard
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12} style={s.eye}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { marginBottom: 6, fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
  },
  fieldFocused: { borderColor: colors.primary },
  fieldErr: { borderColor: colors.danger },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  eye: { paddingLeft: 8 },
  err: { color: colors.danger, marginTop: 4, fontSize: 12, fontFamily: fonts.regular },
});