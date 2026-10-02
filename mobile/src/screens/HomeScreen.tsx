import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { getErrorMessage } from '../api/client';
import { LoadingView, ErrorView, EmptyView } from '../components/StateView';
import { Button } from '../components/Button';
import { useAuth } from '../auth/AuthContext';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['selected-tasks'],
    queryFn: tasksApi.selected,
  });

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={s.container}>
      <Text style={s.greeting}>Your selected tasks</Text>
      {(!data || data.length === 0) ? (
        <EmptyView message="You haven't picked any tasks yet." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.cat}>{item.category.name}</Text>
              <Text style={s.desc}>{item.description}</Text>
            </View>
          )}
        />
      )}
      <View style={s.footer}>
        <Button title="Log out" onPress={signOut} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 16 },
  greeting: { fontSize: 20, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  cat: { fontSize: 12, color: '#2563eb', marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  desc: { color: '#666', fontSize: 13, marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
});