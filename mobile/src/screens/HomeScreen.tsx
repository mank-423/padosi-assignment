import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, Task } from '../api/tasks';
import { profileApi } from '../api/profile';
import { getErrorMessage } from '../api/client';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { LoadingView, ErrorView } from '../components/StateView';
import { categoryIcon } from '../utils/categoryIcon';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });
  const catsQ = useQuery({ queryKey: ['categories'], queryFn: tasksApi.categories });
  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => tasksApi.list() });
  const selectedQ = useQuery({ queryKey: ['selected-tasks'], queryFn: tasksApi.selected });

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const selected = selectedQ.data ?? [];

  const countByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    selected.forEach((t) => (m[t.category.id] = (m[t.category.id] ?? 0) + 1));
    return m;
  }, [selected]);

  const q = search.trim().toLowerCase();
  const results = useMemo(
    () =>
      !q
        ? []
        : (tasksQ.data ?? []).filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q) ||
              t.category.name.toLowerCase().includes(q)
          ),
    [tasksQ.data, q]
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([profileQ.refetch(), catsQ.refetch(), tasksQ.refetch(), selectedQ.refetch()]);
    setRefreshing(false);
  };

  const openCategory = (t: Task) =>
    navigation.navigate('CategoryTasks', { categoryId: t.category.id, categoryName: t.category.name });

  if (catsQ.isLoading || selectedQ.isLoading) return <LoadingView />;
  if ((catsQ.error && !catsQ.data) || (selectedQ.error && !selectedQ.data)) {
    return <ErrorView message={getErrorMessage(catsQ.error ?? selectedQ.error)} onRetry={refresh} />;
  }

  const firstName = profileQ.data?.profile?.name?.trim().split(' ')[0];

  return (
    <Screen
      topInset={insets.top}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <View style={s.header}>
        <Text style={s.greeting}>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Pressable onPress={() => navigation.navigate('Account')} hitSlop={12} accessibilityLabel="Profile">
          <Ionicons name="person-outline" size={26} color={colors.text} />
        </Pressable>
      </View>

      <Text style={s.eyebrow}>Your tasks</Text>
      {selected.length === 0 ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Nothing selected yet</Text>
          <Text style={s.cardSub}>Pick a category below to choose your tasks.</Text>
        </View>
      ) : (
        selected.map((t) => (
          <Pressable key={t.id} style={s.card} onPress={() => openCategory(t)}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{t.name}</Text>
              <Text style={s.cardSub}>{t.category.name}</Text>
            </View>
            <Text style={s.view}>Edit ›</Text>
          </Pressable>
        ))
      )}

      <Text style={s.heading}>What do you need help with?</Text>
      <SearchField placeholder="AC leaking, cook for weekends…" value={search} onChangeText={setSearch} />

      {q ? (
        <>
          <Text style={[s.eyebrow, { marginTop: 24 }]}>Results</Text>
          {tasksQ.isLoading ? (
            <Text style={s.muted}>Searching…</Text>
          ) : tasksQ.error ? (
            <Text style={s.muted} onPress={() => tasksQ.refetch()}>
              Could not load tasks. Tap to retry.
            </Text>
          ) : results.length === 0 ? (
            <Text style={s.muted}>No tasks match "{search.trim()}".</Text>
          ) : (
            results.map((t) => (
              <Pressable key={t.id} style={s.card} onPress={() => openCategory(t)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{t.name}</Text>
                  <Text style={s.cardSub}>{t.category.name}</Text>
                </View>
                <Text style={s.view}>View ›</Text>
              </Pressable>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={[s.eyebrow, { marginTop: 24 }]}>Explore</Text>
          <View style={s.chips}>
            {(catsQ.data ?? []).map((c) => {
              const n = countByCategory[c.id] ?? 0;
              return (
                <Pressable
                  key={c.id}
                  style={({ pressed }) => [s.chip, pressed && { backgroundColor: colors.primarySoft }]}
                  onPress={() => navigation.navigate('CategoryTasks', { categoryId: c.id, categoryName: c.name })}
                >
                  <Ionicons name={categoryIcon(c.name)} size={18} color={colors.primary} />
                  <Text style={s.chipText}>{c.name}</Text>
                  {n > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{n}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  greeting: { flex: 1, fontSize: 24, fontFamily: fonts.semibold, color: colors.text, paddingRight: 12 },
  eyebrow: { fontSize: 12, letterSpacing: 0.6, color: colors.label, fontFamily: fonts.semibold, marginBottom: 10, textTransform: 'uppercase' },
  heading: { fontSize: 22, fontFamily: fonts.semibold, color: colors.text, marginTop: 28, marginBottom: 14 },
  card: {
    flexDirection: 'column', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, marginBottom: 10, backgroundColor: '#fff',
  },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  cardSub: { fontSize: 14, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  view: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 15, marginLeft: 12 },
  muted: { color: colors.muted, fontFamily: fonts.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: '#fff',
  },
  chipText: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold },
});