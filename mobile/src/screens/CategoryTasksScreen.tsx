import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/Button';
import { LoadingView, ErrorView, EmptyView } from '../components/StateView';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryTasks'>;

export default function CategoryTasksScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => tasksApi.list() });
  const selectedQ = useQuery({ queryKey: ['selected-tasks'], queryFn: tasksApi.selected });

  // notes map: taskId -> user's note (empty string means "checked, no note")
  // A task is selected iff its id is a key in this map.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const prefilled = useRef(false);

  // Original selection for this category, captured on first load.
  // Used to detect what needs to be removed on save.
  const originalIds = useRef<string[]>([]);

  const inCategory = useMemo(
    () => (tasksQ.data ?? []).filter((t) => t.category.id === categoryId),
    [tasksQ.data, categoryId],
  );

  // Pre-fill the notes map from what the server already has for this category
  useEffect(() => {
    if (selectedQ.data && !prefilled.current) {
      const initial: Record<string, string> = {};
      selectedQ.data
        .filter((t) => t.category.id === categoryId)
        .forEach((t) => {
          initial[t.id] = t.customDescription ?? '';
        });
      setNotes(initial);
      originalIds.current = Object.keys(initial);
      prefilled.current = true;
    }
  }, [selectedQ.data, categoryId]);

  const toggle = (taskId: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      if (taskId in next) {
        delete next[taskId];
      } else {
        next[taskId] = '';
      }
      return next;
    });
  };

  const setNote = (taskId: string, text: string) => {
    setNotes((prev) => ({ ...prev, [taskId]: text }));
  };

  // Only enable save when something actually changed
  const changed = useMemo(() => {
    const before = new Set(originalIds.current);
    const after = new Set(Object.keys(notes));
    if (before.size !== after.size) return true;
    for (const id of after) if (!before.has(id)) return true;
    // Same set of ids — check if any note text changed
    for (const id of after) {
      const priorNote = (selectedQ.data ?? []).find((t) => t.id === id)?.customDescription ?? '';
      if ((notes[id] ?? '') !== priorNote) return true;
    }
    return false;
  }, [notes, selectedQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      // 1. Remove tasks that were in the original set but are no longer checked
      const stillChecked = new Set(Object.keys(notes));
      const toRemove = originalIds.current.filter((id) => !stillChecked.has(id));
      for (const id of toRemove) {
        await tasksApi.remove(id);
      }

      // 2. Add/update everything currently checked
      for (const [id, desc] of Object.entries(notes)) {
        await tasksApi.add(id, desc.trim() || undefined);
      }

      // 3. Return the fresh list from the server
      return tasksApi.selected();
    },
    onSuccess: (fresh) => {
      qc.setQueryData(['selected-tasks'], fresh);
      navigation.navigate('Home');
    },
    onError: (e) => Alert.alert('Could not save', getErrorMessage(e)),
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

  // The backend allows an empty selection globally, but we block it only if the
  // user is trying to end up with zero tasks total. Per-category is fine to empty.
  const totalSelected = Object.keys(notes).length;
  const otherCategoriesCount = (selectedQ.data ?? []).filter(
    (t) => t.category.id !== categoryId,
  ).length;
  const wouldBeEmpty = totalSelected === 0 && otherCategoriesCount === 0;

  const checkedCount = Object.keys(notes).length;

  return (
    <View style={s.container}>
      {inCategory.length === 0 ? (
        <EmptyView message="No tasks in this category yet." />
      ) : (
        <FlatList
          data={inCategory}
          keyExtractor={(t) => t.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          renderItem={({ item }) => {
            const on = item.id in notes;
            return (
              <View style={[s.rowWrap, on && s.rowWrapOn]}>
                <Pressable style={s.row} onPress={() => toggle(item.id)}>
                  <View style={[s.checkbox, on && s.checkboxOn]}>
                    {on && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.name}</Text>
                    <Text style={s.desc}>{item.description}</Text>
                  </View>
                </Pressable>

                {on && (
                  <TextInput
                    style={s.note}
                    placeholder="Add a note (optional) — e.g. 'kitchen tap dripping'"
                    placeholderTextColor={colors.muted}
                    value={notes[item.id] ?? ''}
                    onChangeText={(t) => setNote(item.id, t)}
                    maxLength={300}
                    multiline
                  />
                )}
              </View>
            );
          }}
        />
      )}

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        {wouldBeEmpty && changed ? (
          <Text style={s.hint}>Pick at least one task to save.</Text>
        ) : null}
        <Button
          title={`Save ${checkedCount} task${checkedCount === 1 ? '' : 's'}`}
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={!changed || wouldBeEmpty}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  rowWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowWrapOn: { backgroundColor: colors.primarySoft },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  name: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  desc: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.regular },

  note: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  hint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
});