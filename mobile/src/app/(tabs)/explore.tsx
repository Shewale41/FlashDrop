import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useUpcomingDrops } from '@/hooks/use-upcoming-drops';

const T = { bone: '#E9E4D9', ink: '#151B18', sage: '#B7C69A', clay: '#B66C4B', muted: '#77786E', line: '#C9C3B7' };

function formatRelease(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    date: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date),
  };
}

export default function UpcomingScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data = [], isLoading, isError, refetch, isRefetching } = useUpcomingDrops();

  async function refresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isRefetching} onRefresh={refresh} tintColor={T.clay} />
        }
      >
        <View style={s.header}>
          <View>
            <Text style={s.logo}>flashdrop<Text style={s.dot}>.</Text></Text>
            <Text style={s.tagline}>THE RELEASE CALENDAR</Text>
          </View>
          <Link href="/account" asChild>
            <Pressable style={s.accountButton} accessibilityRole="button" accessibilityLabel="View your account">
              <Ionicons name="person-outline" size={18} color={T.ink} />
            </Pressable>
          </Link>
        </View>

        <View style={s.hero}>
          <View style={s.heroOutline} />
          <View style={s.heroClay} />
          <View style={s.heroSage} />
          <Text style={s.heroEyebrow}>FLASHDROP / NEXT IN LINE</Text>
          <Text style={s.heroTitle}>Before it{ '\n' }opens.</Text>
          <View style={s.heroBottom}>
            <Text style={s.heroCopy}>A first look at what’s{ '\n' }coming into reach.</Text>
            <Text style={s.heroIndex}>PREVIEW{ '\n' }/ 02</Text>
          </View>
        </View>

        <View style={s.sectionHeading}>
          <View>
            <Text style={s.eyebrow}>ON THE HORIZON</Text>
            <Text style={s.sectionTitle}>Coming up.</Text>
          </View>
          {!isLoading && !isError ? (
            <Text style={s.releaseCount}>{String(data.length).padStart(2, '0')} RELEASES</Text>
          ) : null}
        </View>

        {isLoading ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <ActivityIndicator color={T.clay} />
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>Looking ahead.</Text>
              <Text style={s.stateText}>Checking the release calendar.</Text>
            </View>
          </View>
        ) : null}

        {isError ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={20} color={T.clay} />
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>The calendar didn’t come through.</Text>
              <Text style={s.stateText}>Check your connection, then try again.</Text>
            </View>
            <Pressable
              onPress={() => refetch()}
              disabled={isRefetching}
              style={({ pressed }) => [s.retry, pressed && !isRefetching && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading upcoming releases"
              accessibilityState={{ busy: isRefetching, disabled: isRefetching }}
            >
              {isRefetching ? <ActivityIndicator color={T.bone} size="small" /> : <Ionicons name="refresh" size={16} color={T.bone} />}
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError && data.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyOrbit}>
              <View style={s.emptyDot} />
            </View>
            <Text style={s.emptyEyebrow}>NO RELEASES ANNOUNCED</Text>
            <Text style={s.stateTitle}>Nothing on the calendar. Yet.</Text>
            <Text style={s.stateText}>New releases will appear here when their dates are set.</Text>
          </View>
        ) : null}

        {!isLoading && !isError ? data.map((drop, index) => {
          const release = formatRelease(drop.release_at);

          return (
            <Link
              key={drop.id}
              href={{ pathname: '/drop/[id]', params: { id: drop.id } }}
              asChild
            >
              <Pressable
                style={({ pressed }) => [s.release, pressed && s.releasePressed]}
                accessibilityRole="button"
                accessibilityLabel={release
                  ? `View ${drop.name}, releases ${release.date} at ${release.time}`
                  : `View ${drop.name}, release date not available`}
              >
                <View style={s.releaseTop}>
                  <Text style={s.releaseIndex}>UPCOMING / {String(index + 1).padStart(2, '0')}</Text>
                  <View style={s.glassArrow}>
                    <Ionicons name="arrow-forward" size={15} color={T.ink} />
                  </View>
                </View>
                <Text style={s.releaseName}>{drop.name}</Text>
                <View style={s.releaseBottom}>
                  <View style={s.dateBlock}>
                    <Text style={s.dateLabel}>LOCAL RELEASE TIME</Text>
                    <Text style={s.releaseDate}>{release?.date ?? 'SCHEDULE TO BE CONFIRMED'}</Text>
                    {release ? <Text style={s.releaseTime}>{release.time}</Text> : null}
                  </View>
                  <Text style={s.dropId} numberOfLines={1} ellipsizeMode="middle">{drop.id}</Text>
                </View>
              </Pressable>
            </Link>
          );
        }) : null}

        <View style={s.footer}>
          <Text style={s.footerLogo}>flashdrop<Text style={s.dot}>.</Text></Text>
          <Text style={s.footerCopy}>THE WAIT IS PART OF IT.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, paddingBottom: 17 },
  logo: { color: T.ink, fontSize: 25, fontWeight: '800', letterSpacing: -1.6 },
  dot: { color: T.clay },
  tagline: { color: T.muted, fontSize: 7, letterSpacing: 1.7, marginTop: 2 },
  accountButton: { width: 40, height: 40, borderWidth: 1, borderColor: '#B8B2A7', alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 246, marginHorizontal: -22, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20, backgroundColor: T.ink, overflow: 'hidden', justifyContent: 'space-between' },
  heroOutline: { position: 'absolute', right: 20, bottom: 20, width: 155, height: 155, borderRadius: 78, borderWidth: 1, borderColor: 'rgba(183,198,154,0.42)' },
  heroClay: { position: 'absolute', right: -19, bottom: 15, width: 91, height: 150, borderTopLeftRadius: 55, borderTopRightRadius: 55, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, backgroundColor: T.clay, transform: [{ rotate: '16deg' }] },
  heroSage: { position: 'absolute', right: 93, bottom: 80, width: 45, height: 45, borderRadius: 23, backgroundColor: T.sage },
  heroEyebrow: { color: T.sage, fontSize: 8, fontWeight: '700', letterSpacing: 1.6 },
  heroTitle: { color: T.bone, fontFamily: 'serif', fontSize: 43, lineHeight: 46, letterSpacing: -1.3, marginTop: 18 },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heroCopy: { color: '#C6C6BA', fontSize: 11, lineHeight: 17 },
  heroIndex: { color: 'rgba(233,228,217,0.68)', fontSize: 7, lineHeight: 11, textAlign: 'right', letterSpacing: 1.2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 14 },
  eyebrow: { color: T.clay, fontSize: 8, letterSpacing: 1.5, fontWeight: '800' },
  sectionTitle: { color: T.ink, fontFamily: 'serif', fontSize: 31, lineHeight: 37, marginTop: 4 },
  releaseCount: { color: T.muted, fontSize: 7, letterSpacing: 1.1, marginBottom: 5 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 21, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.line },
  stateCopy: { flex: 1 },
  stateTitle: { color: T.ink, fontFamily: 'serif', fontSize: 21, lineHeight: 26 },
  stateText: { color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  retry: { width: 42, height: 42, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.66 },
  empty: { minHeight: 213, padding: 19, backgroundColor: '#F4F0E8', borderWidth: 1, borderColor: T.line, justifyContent: 'center' },
  emptyOrbit: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#AEB69A', alignItems: 'center', justifyContent: 'center' },
  emptyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.sage },
  emptyEyebrow: { color: T.clay, fontSize: 7, fontWeight: '800', letterSpacing: 1.4, marginTop: 17, marginBottom: 8 },
  release: { marginBottom: 13, padding: 17, borderRadius: 9, borderWidth: 1, borderColor: '#CFC7BA', backgroundColor: '#FBF9F3', shadowColor: T.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  releasePressed: { opacity: 0.66 },
  releaseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  releaseIndex: { color: T.muted, fontSize: 7, fontWeight: '700', letterSpacing: 1.2 },
  glassArrow: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: '#fff' },
  releaseName: { color: T.ink, fontFamily: 'serif', fontSize: 25, lineHeight: 31, marginTop: 12 },
  releaseBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderColor: 'rgba(201,195,183,0.72)' },
  dateBlock: { flex: 1 },
  dateLabel: { color: T.muted, fontSize: 7, letterSpacing: 1.2, fontWeight: '700' },
  releaseDate: { color: T.ink, fontSize: 15, fontWeight: '600', marginTop: 4 },
  releaseTime: { color: T.muted, fontSize: 10, marginTop: 3 },
  dropId: { color: T.muted, fontSize: 7, maxWidth: 112, marginBottom: 2 },
  footer: { paddingTop: 24, marginTop: 6, borderTopWidth: 1, borderColor: T.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLogo: { color: T.ink, fontSize: 14, fontWeight: '800', letterSpacing: -0.7 },
  footerCopy: { color: T.muted, fontSize: 6, letterSpacing: 1 },
});
