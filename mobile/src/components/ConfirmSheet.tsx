import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Task } from '../api/tasks';
import { colors, fonts } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  tasks: Task[];
  emptyText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Bottom sheet for the "confirm" step before saving a selection
export function ConfirmSheet({
  visible, title, subtitle, tasks, emptyText, loading, onConfirm, onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => !loading && onCancel()}
    >
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
          <ScrollView style={s.list}>
            {tasks.length === 0 ? (
              <Text style={s.empty}>{emptyText ?? 'Nothing selected.'}</Text>
            ) : (
              tasks.map((t) => (
                <View key={t.id} style={s.row}>
                  <Text style={s.name}>{t.name}</Text>
                  <Text style={s.cat}>{t.category.name}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <Button title="Confirm and save" onPress={onConfirm} loading={loading} />
          <View style={{ height: 8 }} />
          <Button title="Go back" variant="secondary" onPress={onCancel} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  title: { fontSize: 20, fontFamily: fonts.bold, color: colors.text },
  sub: { color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  list: { marginVertical: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  cat: { fontSize: 12, color: colors.primary, marginTop: 2, fontFamily: fonts.medium },
  empty: { color: colors.muted, fontFamily: fonts.regular, paddingVertical: 12 },
});