import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { Keyboard, RefreshControlProps, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Keyboard handling done by hand: on Android edge-to-edge builds the system
// no longer resizes the window, so the keyboard would cover the inputs.
// We pad the bottom by the keyboard height and scroll the focused field into view.
type Ctx = { scrollTo: (y: number) => void };
const ScreenCtx = createContext<Ctx | null>(null);
export const useScreen = () => useContext(ScreenCtx);

type Props = {
  children: React.ReactNode;
  center?: boolean;
  topInset?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function Screen({ children, center, topInset = 0, refreshControl }: Props) {
  const ref = useRef<ScrollView>(null);
  const kbRef = useRef(0);
  const pending = useRef<number | null>(null);
  const [kb, setKb] = useState(0);

  const doScroll = useCallback((y: number) => {
    ref.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      kbRef.current = e.endCoordinates.height;
      setKb(e.endCoordinates.height);
      if (pending.current !== null) {
        const y = pending.current;
        setTimeout(() => doScroll(y), 80); // wait for the padding to render
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      kbRef.current = 0;
      pending.current = null;
      setKb(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [doScroll]);

  const scrollTo = useCallback(
    (y: number) => {
      pending.current = y;
      if (kbRef.current > 0) setTimeout(() => doScroll(y), 50); // moving between fields
    },
    [doScroll]
  );

  return (
    <ScreenCtx.Provider value={{ scrollTo }}>
      <ScrollView
        ref={ref}
        style={s.flex}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.content,
          { paddingTop: 24 + topInset, paddingBottom: 24 + kb },
          center && s.center,
        ]}
      >
        {children}
      </ScrollView>
    </ScreenCtx.Provider>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  center: { justifyContent: 'center' },
});