import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

// Text-only wordmark for the auth screens (no logo)
export function Brand() {
  return <Text style={s.brand}>PadosiPro</Text>;
}

const s = StyleSheet.create({
  brand: {
    textAlign: 'center',
    fontSize: 34,
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 32,
  },
});