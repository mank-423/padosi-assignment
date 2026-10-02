import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert, SectionList,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tasksApi, Task } from '../api/tasks';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/Button';
import { LoadingView, ErrorView, EmptyView } from '../components/StateView';

export default function TaskSelectionScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', search],
    queryFn: () => tasksApi.list({ search: search || undefined }),
  });

  const save = useMutation({
    mutationFn: () => tasksApi.select(Array.from(selected)),
    onSuccess: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }),
    onError: (e) => Alert.alert('Could not save', getErrorMessage(e)),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  // Group by category
  const sections = (data ?? []).reduce<Record<string, Task[]>>((acc, t) => {
    (acc[t.category.name] ??= []).push(t);
    return acc;
  }, {});
  const sectionList = Object.entries(sections).map(([title, data]) => ({ title, data }));

  return (
    <View style={s.container}>
      <TextInput
        style={s.search}
        placeholder="Search tasks"
        value={search}
        onChangeText={setSearch}
      />

      {sectionList.length === 0 ? (
        <EmptyView message="No tasks match your search." />
      ) : (
        <SectionList
          sections={sectionList}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={s.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const on = selected.has(item.id);
            return (
              <TouchableOpacity style={[s.row, on && s.rowOn]} onPress={() => toggle(item.id)}>
                <View style={[s.checkbox, on && s.checkboxOn]}>
                  {on && <Text style={s.check}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.taskName}>{item.name}</Text>
                  <Text style={s.taskDesc}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <View style={s.footer}>
        <Button
          title={`Confirm ${selected.size} task${selected.size === 1 ? '' : 's'}`}
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  search: {
    margin: 16, padding: 12, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 8, fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f4f4f4',
    fontWeight: '700', fontSize: 13, textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  rowOn: { backgroundColor: '#eff6ff' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  check: { color: '#fff', fontWeight: '700' },
  taskName: { fontSize: 15, fontWeight: '600' },
  taskDesc: { color: '#666', fontSize: 13, marginTop: 2 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
});