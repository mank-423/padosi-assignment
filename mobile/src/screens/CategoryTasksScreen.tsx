import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/Button';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { LoadingView, ErrorView, EmptyView } from '../components/StateView';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryTasks'>;

export default function CategoryTasksScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => tasksApi.list() });
  const selectedQ = useQuery({ queryKey: ['selected-tasks'], queryFn: tasksApi.selected });

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const prefilled = useRef(false);

  const inCategory = useMemo(
    () => (tasksQ.data ?? []).filter((t) => t.category.id === categoryId),
    [tasksQ.data, categoryId]
  );

  // Pre-fill with what is already saved in this category
  useEffect(() => {
    if (selectedQ.data && !prefilled.current) {
      setChecked(new Set(selectedQ.data.filter((t) => t.category.id === categoryId).map((t) => t.id)));
      prefilled.current = true;
    }
  }, [selectedQ.data, categoryId]);

  // POST /tasks/select replaces the WHOLE selection, so keep picks from other categories
  const otherIds = useMemo(
    () => (selectedQ.data ?? []).filter((t) => t.category.id !== categoryId).map((t) => t.id),
    [selectedQ.data, categoryId]
  );
  const finalIds = useMemo(() => [...otherIds, ...Array.from(checked)], [otherIds, checked]);

  const savedInCategory = useMemo(
    () => new Set((selectedQ.data ?? []).filter((t) => t.category.id === categoryId).map((t) => t.id)),
    [selectedQ.data, categoryId]
  );
  const changed =
    checked.size !== savedInCategory.size || Array.from(checked).some((id) => !savedInCategory.has(id));

  const chosen = useMemo(() => inCategory.filter((t) => checked.has(t.id)), [inCategory, checked]);

  const save = useMutation({
    mutationFn: () => tasksApi.select(finalIds),
    onSuccess: (saved) => {
      qc.setQueryData(['selected-tasks'], saved);
      setConfirming(false);
      navigation.navigate('Home');
    },
    onError: (e) => Alert.alert('Could not save', getErrorMessage(e)),
  });

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (tasksQ.isLoading || selectedQ.isLoading) return <LoadingView />;
  if (tasksQ.error || selectedQ.error) {
    return (
      <ErrorView
        message={getErrorMessage(tasksQ.error ?? selectedQ.error)}
        onRetry={() => {
          tasksQ.refetch();
          selectedQ.refetch();
        }}
      />
    );
  }

  const nothingLeft = finalIds.length === 0; // the API needs at least one task

  return (
    <View style={s.container}>
      {inCategory.length === 0 ? (
        <EmptyView message="No tasks in this category yet." />
      ) : (
        <FlatList
          data={inCategory}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          renderItem={({ item }) => {
            const on = checked.has(item.id);
            return (
              <Pressable style={[s.row, on && s.rowOn]} onPress={() => toggle(item.id)}>
                <View style={[s.checkbox, on && s.checkboxOn]}>
                  {on && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  <Text style={s.desc}>{item.description}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        {nothingLeft && changed ? (
          <Text style={s.hint}>Pick at least one task to save.</Text>
        ) : null}
        <Button
          title={`Save ${checked.size} task${checked.size === 1 ? '' : 's'}`}
          onPress={() => setConfirming(true)}
          disabled={!changed || nothingLeft}
        />
      </View>

      <ConfirmSheet
        visible={confirming}
        title="Confirm your tasks"
        subtitle={route.params.categoryName}
        tasks={chosen}
        emptyText="You're removing all tasks from this category."
        loading={save.isPending}
        onConfirm={() => save.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff',
  },
  rowOn: { backgroundColor: colors.primarySoft },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  name: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  desc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 8, textAlign: 'center', fontFamily: fonts.regular },
});