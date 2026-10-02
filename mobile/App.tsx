import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { RootStackParamList } from './src/navigation/types';
import { colors, fonts } from './src/theme';
import { LoadingView, ErrorView } from './src/components/StateView';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOtpScreen from './src/screens/VerifyOtpScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryTasksScreen from './src/screens/CategoryTasksScreen';
import AccountScreen from './src/screens/AccountScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

const screenOptions = {
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  headerStyle: { backgroundColor: colors.bg },
  contentStyle: { backgroundColor: colors.bg },
};

function RootNavigator() {
  const { status, retryBoot, bootMessage, signOut } = useAuth();

  if (status === 'loading') return <LoadingView />;
  if (status === 'bootError') {
    return <ErrorView message={bootMessage || "Can't reach the server."} onRetry={retryBoot}
      onSecondary={signOut} secondaryLabel="Log out" />;
  }

  // `key` forces a fresh navigator whenever the auth state changes,
  // so history from one state never leaks into the next.
  if (status === 'signedOut') {
    return (
      <Stack.Navigator key="auth" screenOptions={screenOptions}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: 'Verify email' }} />
      </Stack.Navigator>
    );
  }

  if (status === 'needsProfile') {
    return (
      <Stack.Navigator key="profile" screenOptions={screenOptions}>
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Your profile', headerBackVisible: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator key="app" screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CategoryTasks"
        component={CategoryTasksScreen}
        options={({ route }) => ({ title: route.params.categoryName })}
      />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Your profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}