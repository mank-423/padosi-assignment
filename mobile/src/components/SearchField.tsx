import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScreen } from './Screen';
import { colors, fonts, radius } from '../theme';

export function SearchField({ onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const y = useRef(0);
  const screen = useScreen();
  return (
    <View
      style={[s.box, focused && s.focused]}
      onLayout={(e) => (y.current = e.nativeEvent.layout.y)}
    >
      <Ionicons name="search-outline" size={20} color={colors.muted} />
      <TextInput
        style={s.input}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          screen?.scrollTo(y.current);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  focused: { borderColor: colors.primary },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, fontFamily: fonts.regular, color: colors.text },
});