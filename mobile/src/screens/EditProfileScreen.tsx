import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { ProfileForm } from '../components/ProfileForm';
import { LoadingView, ErrorView } from '../components/StateView';
import { profileApi } from '../api/profile';
import { getErrorMessage } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });

  if (q.isLoading) return <LoadingView />;
  if (q.error && !q.data) return <ErrorView message={getErrorMessage(q.error)} onRetry={q.refetch} />;

  return (
    <Screen>
      <ProfileForm
        initial={q.data?.profile}
        submitLabel="Save changes"
        onSubmit={async (p) => {
          const res = await profileApi.save(p);
          qc.setQueryData(['profile'], res);
          navigation.goBack();
        }}
      />
    </Screen>
  );
}