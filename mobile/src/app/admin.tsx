import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';

const T = { bone: '#E9E4D9', ink: '#151B18', sage: '#B7C69A', clay: '#B66C4B', muted: '#77786E', line: '#C9C3B7' };
type ApiError = { message?: string };

export default function AdminScreen() {
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [inventory, setInventory] = useState('');
  const [dropId, setDropId] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [releaseAt, setReleaseAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isReady && user?.role !== 'admin') router.replace(user ? '/account' : '/auth');
  }, [isReady, user]);

  async function createDrop() {
    const cleanId = dropId.trim();
    const quantity = Number(inventory);
    if (!cleanId || !name.trim() || !Number.isSafeInteger(quantity) || quantity < 0) {
      setIsError(true);
      setMessage('Enter a drop ID, name and whole number inventory of zero or more.');
      return;
    }
    let releaseIso: string | null = null;
    if (scheduled) {
      const parsed = new Date(releaseAt);
      if (!releaseAt.trim() || Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setIsError(true);
        setMessage('Enter a future release date and time. Example: 2026-12-15T18:30:00+05:30');
        return;
      }
      releaseIso = parsed.toISOString();
    }

    setBusy(true);
    setMessage('');
    try {
      await api.post('/drops', {
        id: cleanId,
        name: name.trim(),
        availableInventory: quantity,
        releaseAt: releaseIso,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drops'] }),
        queryClient.invalidateQueries({ queryKey: ['upcoming-drops'] }),
      ]);
      setIsError(false);
      setMessage(scheduled ? 'Scheduled drop created.' : 'Live drop created.');
      setDropId('');
      setName('');
      setInventory('');
      setReleaseAt('');
    } catch (error) {
      setIsError(true);
      setMessage(axios.isAxiosError<ApiError>(error)
        ? error.response?.data?.message ?? 'Could not create this drop. Check the server and try again.'
        : 'Could not create this drop. Check the server and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!isReady || user?.role !== 'admin') {
    return <SafeAreaView style={s.loading}><ActivityIndicator color={T.clay} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back} accessibilityRole="button" accessibilityLabel="Back to account">
            <Ionicons name="arrow-back" size={19} color={T.ink} />
          </Pressable>
          <Text style={s.logo}>flashdrop<Text style={s.dot}>.</Text></Text>
          <Text style={s.meta}>ADMIN / 01</Text>
        </View>

        <Text style={s.eyebrow}>RELEASE CONTROL / ADMINISTRATOR</Text>
        <Text style={s.title}>Set the{ '\n' }moment <Text style={s.italic}>in motion.</Text></Text>
        <Text style={s.copy}>Create a release with the inventory and schedule supplied by your team.</Text>

        <View style={s.form}>
          <Field label="DROP ID" value={dropId} onChangeText={setDropId} placeholder="e.g. release_001" autoCapitalize="none" />
          <Field label="PRODUCT NAME" value={name} onChangeText={setName} placeholder="Name shown to members" />
          <Field label="AVAILABLE INVENTORY" value={inventory} onChangeText={setInventory} placeholder="Enter actual quantity" keyboardType="number-pad" />

          <Pressable
            onPress={() => setScheduled(!scheduled)}
            style={s.scheduleToggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: scheduled }}
          >
            <View>
              <Text style={s.label}>SCHEDULE THIS DROP</Text>
              <Text style={s.toggleHelp}>Off means it appears as live now.</Text>
            </View>
            <View style={[s.switchTrack, scheduled && s.switchOn]}><View style={[s.switchThumb, scheduled && s.thumbOn]} /></View>
          </Pressable>

          {scheduled ? (
            <Field label="RELEASE DATE & TIME" value={releaseAt} onChangeText={setReleaseAt} placeholder="2026-12-15T18:30:00+05:30" autoCapitalize="none" />
          ) : null}

          <Text style={s.timeHint}>Scheduled time uses ISO format and an explicit timezone offset.</Text>
          {message ? <Text style={[s.message, isError && s.error]} accessibilityLiveRegion="polite">{message}</Text> : null}

          <Pressable onPress={createDrop} disabled={busy} style={({ pressed }) => [s.submit, pressed && s.pressed, busy && s.busy]} accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}>
            {busy ? <ActivityIndicator color={T.bone} /> : <><Text style={s.submitText}>CREATE {scheduled ? 'SCHEDULED' : 'LIVE'} DROP</Text><Ionicons name="arrow-forward" size={18} color={T.bone} /></>}
          </Pressable>
          <Text style={s.note}>Only administrators can create releases. The server verifies your role for every request.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'number-pad'; autoCapitalize?: 'none' | 'sentences' }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{props.label}</Text>
      <TextInput {...props} style={s.input} placeholderTextColor="#929187" editable accessibilityLabel={props.label} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone },
  loading: { flex: 1, backgroundColor: T.bone, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingBottom: 36 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B8B2A7' },
  logo: { color: T.ink, fontSize: 20, fontWeight: '800', letterSpacing: -1.3 },
  dot: { color: T.clay },
  meta: { color: T.muted, fontSize: 7, letterSpacing: 1.2 },
  eyebrow: { color: T.clay, fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: T.ink, fontFamily: 'serif', fontSize: 38, lineHeight: 41, letterSpacing: -0.9, marginTop: 20 },
  italic: { color: '#798A60', fontStyle: 'italic' },
  copy: { maxWidth: 285, color: T.muted, fontSize: 12, lineHeight: 18, marginTop: 13 },
  form: { marginTop: 25, paddingTop: 5, borderTopWidth: 1, borderTopColor: T.line },
  field: { marginTop: 20 },
  label: { color: T.muted, fontSize: 7, fontWeight: '800', letterSpacing: 1.45 },
  input: { minHeight: 45, paddingHorizontal: 0, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.line, color: T.ink, fontSize: 14 },
  scheduleToggle: { minHeight: 64, marginTop: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleHelp: { color: T.muted, fontSize: 10, marginTop: 5 },
  switchTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#C9C3B7', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: T.ink },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: T.bone },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: T.sage },
  timeHint: { color: T.muted, fontSize: 9, lineHeight: 14, marginTop: 11 },
  message: { color: '#53633F', fontSize: 11, lineHeight: 16, marginTop: 14 },
  error: { color: T.clay },
  submit: { minHeight: 56, marginTop: 21, paddingHorizontal: 16, backgroundColor: T.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitText: { color: T.bone, fontSize: 9, fontWeight: '800', letterSpacing: 1.15 },
  pressed: { opacity: 0.78 },
  busy: { opacity: 0.72 },
  note: { color: T.muted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 13 },
});
