import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Input } from './Input';
import { Button } from './Button';
import { ProfileInput } from '../api/profile';
import { getErrorMessage } from '../api/client';
import { colors, fonts } from '../theme';

type Field = 'name' | 'mobile' | 'address';
type Initial = {
  name?: string | null;
  mobile?: string | null;
  address?: string | null;
  businessName?: string | null;
} | null;

type Props = {
  initial?: Initial;
  submitLabel: string;
  onSubmit: (p: ProfileInput) => Promise<void>;
};

// Used by the first-login screen and the edit-profile screen.
// Must be rendered inside <Screen> (returns a fragment so inputs stay direct children).
export function ProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [mobile, setMobile] = useState(initial?.mobile || '+91');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [businessName, setBusinessName] = useState(initial?.businessName ?? '');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors: Partial<Record<Field, string>> = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (!/^\+91[6-9]\d{9}$/.test(mobile)) errors.mobile = 'Enter +91 followed by a valid 10-digit number.';
  if (address.trim().length < 5) errors.address = 'Address must be at least 5 characters.';

  const show = (f: Field) => (touched[f] || submitted ? errors[f] : undefined);
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  const submit = async () => {
    setSubmitted(true);
    setFormError('');
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        mobile,
        address: address.trim(),
        businessName: businessName.trim() || undefined,
      });
    } catch (err) {
      setFormError(getErrorMessage(err)); // inline, not a pop-up
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Input label="Name" value={name} onChangeText={setName} onBlur={blur('name')}
        autoCapitalize="words" error={show('name')} />
      <Input label="Mobile number" value={mobile}
        onChangeText={(t) => setMobile(t.replace(/[^\d+]/g, ''))} onBlur={blur('mobile')}
        keyboardType="phone-pad" maxLength={13} error={show('mobile')} />
      <Input label="Address" value={address} onChangeText={setAddress} onBlur={blur('address')}
        multiline autoCapitalize="sentences" error={show('address')} />
      <Input label="Business name (optional)" value={businessName}
        onChangeText={setBusinessName} autoCapitalize="words" />
      {formError ? <Text style={s.formError}>{formError}</Text> : null}
      <Button title={submitLabel} onPress={submit} loading={loading} />
    </>
  );
}

const s = StyleSheet.create({
  formError: { color: colors.danger, marginBottom: 12, fontFamily: fonts.regular },
});