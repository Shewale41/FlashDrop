import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/auth-context';

const T = { bone: '#E9E4D9', ink: '#151B18', sage: '#B7C69A', clay: '#B66C4B', muted: '#77786E', line: '#C9C3B7' };

export default function AccountScreen() {
  const { user, isReady, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (isReady && !user) router.replace('/');
  }, [isReady, user]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.replace('/');
  }

  if (!isReady || !user) {
    return <SafeAreaView style={s.loading}><ActivityIndicator color={T.clay} /></SafeAreaView>;
  }

  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} accessibilityRole="button" accessibilityLabel="Back to discovery">
          <Ionicons name="arrow-back" size={19} color={T.ink} />
        </Pressable>
        <Text style={s.logo}>flashdrop<Text style={s.dot}>.</Text></Text>
        <Text style={s.meta}>YOUR ACCOUNT</Text>
      </View>

      <View style={s.body}>
        <Text style={s.eyebrow}>MEMBER / ACCOUNT DETAILS</Text>
        <View style={s.portrait} accessibilityLabel={`Account initials ${initials || 'FD'}`}>
          <Text style={s.initials}>{initials || 'FD'}</Text>
          <View style={s.portraitAccent} />
        </View>
        <Text style={s.title}>Good to have{ '\n' }you <Text style={s.italic}>here.</Text></Text>

        <View style={s.infoBlock}>
          <Text style={s.label}>NAME</Text>
          <Text style={s.value}>{user.name}</Text>
          <View style={s.rule} />
          <Text style={s.label}>EMAIL ADDRESS</Text>
          <Text style={s.value}>{user.email}</Text>
          <View style={s.rule} />
          <Text style={s.label}>MEMBER ID</Text>
          <Text style={s.id} numberOfLines={1}>{user.id}</Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          style={({ pressed }) => [s.signOut, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
        >
          {isSigningOut ? <ActivityIndicator color={T.bone} /> : <>
            <Text style={s.signOutText}>SIGN OUT</Text>
            <Ionicons name="arrow-forward" size={17} color={T.bone} />
          </>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone },
  loading: { flex: 1, backgroundColor: T.bone, alignItems: 'center', justifyContent: 'center' },
  header: { height: 62, marginHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B8B2A7' },
  logo: { color: T.ink, fontSize: 20, fontWeight: '800', letterSpacing: -1.3 },
  dot: { color: T.clay },
  meta: { color: T.muted, fontSize: 7, letterSpacing: 1.2 },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 29 },
  eyebrow: { color: T.clay, fontSize: 8, letterSpacing: 1.6, fontWeight: '800' },
  portrait: { width: 86, height: 86, marginTop: 25, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: T.sage, fontFamily: 'serif', fontSize: 35 },
  portraitAccent: { position: 'absolute', width: 95, height: 1, backgroundColor: 'rgba(233,228,217,0.42)', transform: [{ rotate: '-34deg' }] },
  title: { color: T.ink, fontFamily: 'serif', fontSize: 37, lineHeight: 40, letterSpacing: -0.9, marginTop: 20 },
  italic: { color: '#798A60', fontStyle: 'italic' },
  infoBlock: { marginTop: 26, paddingTop: 17, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.line },
  label: { color: T.muted, fontSize: 7, letterSpacing: 1.5, fontWeight: '700' },
  value: { color: T.ink, fontSize: 16, marginTop: 5, marginBottom: 14 },
  id: { color: T.muted, fontSize: 10, marginTop: 6, marginBottom: 14 },
  rule: { height: 1, backgroundColor: T.line, marginBottom: 13 },
  signOut: { minHeight: 54, marginTop: 24, paddingHorizontal: 16, backgroundColor: T.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signOutText: { color: T.bone, fontSize: 9, fontWeight: '800', letterSpacing: 1.25 },
  pressed: { opacity: 0.68 },
});
