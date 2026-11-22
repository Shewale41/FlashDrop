import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';

const T = { bone: '#E9E4D9', ink: '#151B18', sage: '#B7C69A', clay: '#B66C4B', muted: '#77786E', line: '#C9C3B7' };
type ApiError = { message?: string };
type ManagedDrop = { id: string; name: string; available_inventory: number; release_at?: string | null };

export default function AdminScreen() {
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [inventory, setInventory] = useState('');
  const [dropId, setDropId] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [releaseAt, setReleaseAt] = useState('');
  const [releaseDate, setReleaseDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [drops, setDrops] = useState<ManagedDrop[]>([]);
  const [listBusy, setListBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isReady && user?.role !== 'admin') router.replace(user ? '/account' : '/auth');
  }, [isReady, user]);

  useEffect(() => {
    if (isReady && user?.role === 'admin') void loadDrops();
  }, [isReady, user]);

  async function loadDrops() {
    setListBusy(true);
    try {
      const [liveResponse, upcomingResponse] = await Promise.all([
        api.get<{ data: ManagedDrop[] }>('/drops?limit=100&offset=0'),
        api.get<{ data: ManagedDrop[] }>('/drops/upcoming'),
      ]);
      const unique = new Map<string, ManagedDrop>();
      [...liveResponse.data.data, ...upcomingResponse.data.data].forEach((drop) => unique.set(drop.id, drop));
      setDrops([...unique.values()].sort((a, b) => (a.release_at ?? '').localeCompare(b.release_at ?? '')));
    } catch {
      setIsError(true);
      setMessage('Could not load drops. Pull down to retry.');
    } finally {
      setListBusy(false);
    }
  }

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
      const parsed = Platform.OS === 'web' ? new Date(releaseAt) : releaseDate;
      if ((Platform.OS === 'web' && !releaseAt.trim()) || Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setIsError(true);
        setMessage('Enter a future release date and time. Example: 2026-12-15T18:30:00+05:30');
        return;
      }
      releaseIso = parsed.toISOString();
    }

    setBusy(true);
    setMessage('');
    try {
      if (editingId) {
        await api.put(`/drops/${encodeURIComponent(editingId)}`, {
          name: name.trim(), availableInventory: quantity, releaseAt: releaseIso,
        });
      } else {
        await api.post('/drops', {
          id: cleanId,
          name: name.trim(),
          availableInventory: quantity,
          releaseAt: releaseIso,
        });
      }
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
      setReleaseDate(new Date(Date.now() + 60 * 60 * 1000));
      setEditingId(null);
      await loadDrops();
    } catch (error) {
      setIsError(true);
      setMessage(axios.isAxiosError<ApiError>(error)
        ? error.response?.data?.message ?? 'Could not create this drop. Check the server and try again.'
        : 'Could not create this drop. Check the server and try again.');
    } finally {
      setBusy(false);
    }
  }

  function editDrop(drop: ManagedDrop) {
    setEditingId(drop.id);
    setDropId(drop.id);
    setName(drop.name);
    setInventory(String(drop.available_inventory));
    const hasFutureDate = Boolean(drop.release_at && new Date(drop.release_at).getTime() > Date.now());
    setScheduled(hasFutureDate);
    if (drop.release_at) setReleaseDate(new Date(drop.release_at));
    setReleaseAt(drop.release_at ?? '');
    setMessage(`Editing ${drop.id}. Save changes below.`);
  }

  function deleteDrop(drop: ManagedDrop) {
    const remove = async () => {
      try {
        await api.delete(`/drops/${encodeURIComponent(drop.id)}`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['drops'] }),
          queryClient.invalidateQueries({ queryKey: ['upcoming-drops'] }),
          loadDrops(),
        ]);
        setMessage(`Deleted “${drop.name}”.`);
        setIsError(false);
      } catch {
        setMessage('Could not delete this drop. Try again.');
        setIsError(true);
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Delete “${drop.name}”? This cannot be undone.`)) void remove();
    } else {
      Alert.alert('Delete this drop?', `“${drop.name}” will be removed. This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove() },
      ]);
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

          {scheduled ? Platform.OS === 'web' ? (
            <Field label="RELEASE DATE & TIME" value={releaseAt} onChangeText={setReleaseAt} placeholder="2026-12-15T18:30:00+05:30" autoCapitalize="none" />
          ) : (
            <View style={s.pickerBlock}>
              <Text style={s.label}>RELEASE DATE & LOCAL TIME</Text>
              <View style={s.pickerButtons}>
                <Pressable style={s.pickerButton} onPress={() => setPickerMode('date')} accessibilityRole="button" accessibilityLabel="Choose release date">
                  <Ionicons name="calendar-outline" size={17} color={T.ink} />
                  <Text style={s.pickerText}>{releaseDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </Pressable>
                <Pressable style={s.pickerButton} onPress={() => setPickerMode('time')} accessibilityRole="button" accessibilityLabel="Choose release time">
                  <Ionicons name="time-outline" size={17} color={T.ink} />
                  <Text style={s.pickerText}>{releaseDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                </Pressable>
              </View>
              {pickerMode ? <DateTimePicker
                value={releaseDate}
                mode={pickerMode}
                display="default"
                presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                accentColor={T.ink}
                onValueChange={(_event, date) => {
                  if (date) setReleaseDate(date);
                  if (Platform.OS === 'android') setPickerMode(null);
                }}
                onDismiss={() => setPickerMode(null)}
              /> : null}
            </View>
          ) : null}

          {scheduled ? <Text style={s.timeHint}>{Platform.OS === 'web' ? 'Scheduled time uses ISO format and an explicit timezone offset.' : `Your local time will be saved for ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`}</Text> : null}
          {message ? <Text style={[s.message, isError && s.error]} accessibilityLiveRegion="polite">{message}</Text> : null}

          <Pressable onPress={createDrop} disabled={busy} style={({ pressed }) => [s.submit, pressed && s.pressed, busy && s.busy]} accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}>
            {busy ? <ActivityIndicator color={T.bone} /> : <><Text style={s.submitText}>{editingId ? 'SAVE DROP CHANGES' : `CREATE ${scheduled ? 'SCHEDULED' : 'LIVE'} DROP`}</Text><Ionicons name="arrow-forward" size={18} color={T.bone} /></>}
          </Pressable>
          {editingId ? <Pressable onPress={() => { setEditingId(null); setDropId(''); setName(''); setInventory(''); setScheduled(false); setReleaseAt(''); }} style={s.cancelEdit}><Text style={s.cancelText}>CANCEL EDITING</Text></Pressable> : null}
          <Text style={s.note}>Only administrators can create releases. The server verifies your role for every request.</Text>
        </View>

        <View style={s.listHeader}>
          <View><Text style={s.eyebrow}>RELEASE CONTROL / 02</Text><Text style={s.listTitle}>Manage drops.</Text></View>
          <Pressable onPress={() => void loadDrops()} style={s.refresh} accessibilityRole="button" accessibilityLabel="Refresh drops">
            {listBusy ? <ActivityIndicator size="small" color={T.ink} /> : <Ionicons name="refresh" size={17} color={T.ink} />}
          </Pressable>
        </View>
        {drops.length === 0 && !listBusy ? <Text style={s.empty}>No drops found. New live and scheduled releases will appear here.</Text> : null}
        {drops.map((drop, index) => {
          const future = Boolean(drop.release_at && new Date(drop.release_at).getTime() > Date.now());
          return <View key={drop.id} style={s.dropRow}>
            <View style={s.dropMeta}><Text style={s.dropIndex}>DROP / {String(index + 1).padStart(2, '0')}</Text><Text style={[s.dropStatus, future && s.upcomingStatus]}>{future ? 'SCHEDULED' : 'LIVE'}</Text></View>
            <Text style={s.dropName}>{drop.name}</Text>
            <Text style={s.dropDetail}>{drop.id}  ·  {drop.available_inventory} remaining{drop.release_at ? `  ·  ${new Date(drop.release_at).toLocaleString()}` : ''}</Text>
            <View style={s.dropActions}>
              <Pressable onPress={() => editDrop(drop)} style={s.actionButton} accessibilityRole="button" accessibilityLabel={`Edit ${drop.name}`}><Ionicons name="create-outline" size={16} color={T.ink} /><Text style={s.actionText}>EDIT</Text></Pressable>
              <Pressable onPress={() => deleteDrop(drop)} style={[s.actionButton, s.deleteButton]} accessibilityRole="button" accessibilityLabel={`Delete ${drop.name}`}><Ionicons name="trash-outline" size={16} color={T.clay} /><Text style={[s.actionText, s.deleteText]}>DELETE</Text></Pressable>
            </View>
          </View>;
        })}
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
  pickerBlock: { marginTop: 20 },
  pickerButtons: { flexDirection: 'row', gap: 9, marginTop: 9 },
  pickerButton: { minHeight: 45, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderBottomWidth: 1, borderColor: T.line },
  pickerText: { color: T.ink, fontSize: 11 },
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
  cancelEdit: { padding: 13, alignItems: 'center' },
  cancelText: { color: T.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '700' },
  listHeader: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderColor: T.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { color: T.ink, fontFamily: 'serif', fontSize: 30, marginTop: 7 },
  refresh: { width: 40, height: 40, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' },
  empty: { color: T.muted, fontSize: 12, lineHeight: 18, paddingVertical: 20 },
  dropRow: { paddingVertical: 17, borderBottomWidth: 1, borderColor: T.line },
  dropMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropIndex: { color: T.muted, fontSize: 7, letterSpacing: 1.3, fontWeight: '700' },
  dropStatus: { color: '#53633F', backgroundColor: 'rgba(115,137,90,0.14)', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 7, letterSpacing: 1, fontWeight: '800' },
  upcomingStatus: { color: T.clay, backgroundColor: 'rgba(182,108,75,0.12)' },
  dropName: { color: T.ink, fontFamily: 'serif', fontSize: 22, marginTop: 12 },
  dropDetail: { color: T.muted, fontSize: 9, lineHeight: 15, marginTop: 8 },
  dropActions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  actionButton: { minHeight: 36, paddingHorizontal: 10, borderWidth: 1, borderColor: T.line, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: T.ink, fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
  deleteButton: { borderColor: 'rgba(182,108,75,0.35)' },
  deleteText: { color: T.clay },
});
