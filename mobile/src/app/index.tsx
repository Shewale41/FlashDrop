import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/auth-context';

const T = { bone: '#E9E4D9', ink: '#151B18', sage: '#B7C69A', clay: '#B66C4B', muted: '#77786E' };

export default function WelcomeScreen() {
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && user) router.replace('/(tabs)');
  }, [isReady, user]);

  if (!isReady || user) {
    return (
      <SafeAreaView style={s.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator color={T.clay} />
        <Text style={s.loadingText}>OPENING FLASHDROP</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View>
            <Text style={s.logo}>flashdrop<Text style={s.dot}>.</Text></Text>
            <Text style={s.tagline}>THE ART OF THE DROP</Text>
          </View>
          <Text style={s.edition}>EST. FOR THE MOMENT</Text>
        </View>

        <View style={s.stage}>
          <View style={s.frame} />
          <View style={s.orbit} />
          <View style={s.sculpture} />
          <View style={s.sculptureCore} />
          <Text style={s.stageIndex}>RELEASE CULTURE{ '\n' }STUDY 001</Text>
          <Text style={s.stageNote}>A PLACE FOR{ '\n' }WHAT’S NEXT</Text>
          <View style={s.glassTag}>
            <View style={s.liveDot} />
            <Text style={s.glassText}>LIMITED / INTENTIONAL</Text>
          </View>
        </View>

        <View style={s.intro}>
          <Text style={s.eyebrow}>FLASHDROP / A NEW WAY IN</Text>
          <Text style={s.headline}>The moment{ '\n' }before it’s <Text style={s.italic}>yours.</Text></Text>
          <Text style={s.copy}>Rare releases. Real availability. A fair chance to be there when it happens.</Text>
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/auth', params: { mode: 'register' } })}
          style={({ pressed }) => [s.primary, pressed && s.pressed]}
          accessibilityRole="button"
        >
          <Text style={s.primaryText}>CREATE YOUR ACCOUNT</Text>
          <Ionicons name="arrow-forward" size={18} color={T.bone} />
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: '/auth', params: { mode: 'login' } })}
          style={({ pressed }) => [s.secondary, pressed && s.pressed]}
          accessibilityRole="button"
        >
          <Text style={s.secondaryText}>ALREADY A MEMBER?</Text>
          <Text style={s.signInText}>SIGN IN</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone },
  loading: { flex: 1, backgroundColor: T.bone, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: T.muted, fontSize: 8, letterSpacing: 1.7, fontWeight: '700' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 24 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: T.ink, fontSize: 25, lineHeight: 27, fontWeight: '800', letterSpacing: -1.5 },
  dot: { color: T.clay },
  tagline: { color: T.muted, fontSize: 7, letterSpacing: 1.7, marginTop: 1 },
  edition: { color: T.muted, fontSize: 7, letterSpacing: 1.1 },
  stage: { height: 250, marginHorizontal: -22, backgroundColor: T.ink, overflow: 'hidden' },
  frame: { position: 'absolute', top: 15, right: 15, bottom: 15, left: 15, borderWidth: 1, borderColor: 'rgba(233,228,217,0.18)' },
  orbit: { position: 'absolute', right: 45, top: 26, width: 166, height: 166, borderWidth: 1, borderColor: 'rgba(183,198,154,0.44)', borderRadius: 83 },
  sculpture: { position: 'absolute', right: 64, top: 54, width: 112, height: 158, backgroundColor: T.clay, borderTopLeftRadius: 58, borderTopRightRadius: 58, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, transform: [{ rotate: '12deg' }] },
  sculptureCore: { position: 'absolute', right: 101, top: 96, width: 46, height: 46, borderRadius: 23, backgroundColor: T.sage },
  stageIndex: { position: 'absolute', left: 31, top: 33, color: T.bone, fontSize: 8, lineHeight: 13, letterSpacing: 1.2 },
  stageNote: { position: 'absolute', left: 31, bottom: 31, color: 'rgba(233,228,217,0.72)', fontSize: 8, lineHeight: 13, letterSpacing: 1.5, fontWeight: '700' },
  glassTag: { position: 'absolute', right: 27, bottom: 26, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(233,228,217,0.14)', borderWidth: 1, borderColor: 'rgba(233,228,217,0.25)' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.sage },
  glassText: { color: T.bone, fontSize: 6, letterSpacing: 1.1, fontWeight: '700' },
  intro: { paddingTop: 24, paddingBottom: 19 },
  eyebrow: { color: T.clay, fontSize: 8, letterSpacing: 1.5, fontWeight: '800' },
  headline: { color: T.ink, fontFamily: 'serif', fontSize: 36, lineHeight: 39, letterSpacing: -1.1, marginTop: 9 },
  italic: { color: '#798A60', fontStyle: 'italic' },
  copy: { maxWidth: 294, color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
  primary: { minHeight: 54, paddingHorizontal: 16, backgroundColor: T.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { color: T.bone, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  secondary: { minHeight: 48, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryText: { color: T.muted, fontSize: 8, letterSpacing: 0.9 },
  signInText: { color: T.ink, fontSize: 8, letterSpacing: 1.1, fontWeight: '800' },
});
