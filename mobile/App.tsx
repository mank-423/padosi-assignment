import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOtpScreen from './src/screens/VerifyOtpScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TaskSelectionScreen from './src/screens/TaskSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();
const qc = new QueryClient();

function RootNavigator() {
  const { loading, isLoggedIn } = useAuth();

  if (loading) return null; // splash placeholder

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Sign up' }} />
          <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: 'Verify email' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Your profile' }} />
          <Stack.Screen name="TaskSelection" component={TaskSelectionScreen} options={{ title: 'Pick tasks' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PadosiPro' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}