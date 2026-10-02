import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Alert } from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { profileApi } from '../api/profile';
import { getErrorMessage } from '../api/client';

export default function ProfileScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('+91');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (name.length < 2) return Alert.alert('Check name', 'Name is too short.');
    if (!/^\+91[6-9]\d{9}$/.test(mobile)) return Alert.alert('Check mobile', 'Use +91 followed by 10 digits.');
    if (address.length < 5) return Alert.alert('Check address', 'Address is too short.');

    setLoading(true);
    try {
      await profileApi.save({ name, mobile, address, businessName: businessName || undefined });
      navigation.reset({ index: 0, routes: [{ name: 'TaskSelection' }] });
    } catch (err) {
      Alert.alert('Could not save', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>Tell us about you</Text>
      <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Input
        label="Mobile (+91XXXXXXXXXX)"
        value={mobile}
        onChangeText={(t) => setMobile(t.replace(/[^\d+]/g, ''))}
        keyboardType="phone-pad"
        maxLength={13}
      />
      <Input label="Address" value={address} onChangeText={setAddress} multiline />
      <Input label="Business name (optional)" value={businessName} onChangeText={setBusinessName} autoCapitalize="words" />
      <Button title="Continue" onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
});