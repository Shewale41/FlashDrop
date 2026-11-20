
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS as C } from '@/constants/flashdrop';

export default function UpcomingScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>FLASHDROP / RELEASES</Text>
        <Text style={s.title}>The next{'\n'}chapter.</Text>
        <Text style={s.subtitle}>
          Discover what's coming. Be ready when the moment arrives.
        </Text>

        <View style={s.line} />

        <View style={s.empty}>
          <Text style={s.number}>COMING SOON</Text>
          <Text style={s.emptyTitle}>Nothing on the calendar. Yet.</Text>
          <Text style={s.emptyDescription}>
            New limited releases will appear here as they're announced.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  content: { padding: 22, flexGrow: 1 },
  eyebrow: { color: C.accent, fontSize: 9, letterSpacing: 2, fontWeight: '700', marginTop: 25 },
  title: { color: C.cream, fontSize: 48, lineHeight: 52, fontWeight: '600', letterSpacing: -2, marginTop: 22 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 16 },
  line: { height: 1, backgroundColor: C.border, marginTop: 35 },
  empty: { paddingVertical: 30 },
  number: { color: C.accent, fontSize: 9, letterSpacing: 2 },
  emptyTitle: { color: C.cream, fontSize: 19, marginTop: 18, fontWeight: '500' },
  emptyDescription: { color: C.muted, fontSize: 13, lineHeight: 21, marginTop: 9 },
});
