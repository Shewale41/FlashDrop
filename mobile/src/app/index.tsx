
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS as C } from '@/constants/flashdrop';
import { useDrops } from '@/hooks/use-drops';

export default function HomeScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useDrops();
  const [refreshing, setRefreshing] = useState(false);

  const drops = data?.data ?? [];

  async function refresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={refresh}
            tintColor={C.accent}
          />
        }
      >
        <View style={s.header}>
          <View>
            <Text style={s.logo}>flashdrop<Text style={s.dot}>.</Text></Text>
            <Text style={s.tagline}>THE ART OF THE DROP</Text>
          </View>
          <View style={s.actions}>
            <Pressable style={s.iconButton}>
              <Ionicons name="search-outline" size={20} color={C.cream} />
            </Pressable>
            <Pressable style={s.iconButton}>
              <Ionicons name="notifications-outline" size={20} color={C.cream} />
            </Pressable>
          </View>
        </View>

        <View style={s.intro}>
          <Text style={s.eyebrow}>CURATED RELEASES / 001</Text>
          <Text style={s.headline}>
            Not everything{'\n'}is meant to be{'\n'}
            <Text style={s.italic}>available.</Text>
          </Text>
          <View style={s.introBottom}>
            <Text style={s.description}>
              Limited releases. A fair chance.{'\n'}
              One moment to make it yours.
            </Text>
            <Ionicons name="arrow-down" size={26} color={C.accent} />
          </View>
        </View>

        <View style={s.sectionHeading}>
          <Text style={s.eyebrow}>LIVE FROM THE DATABASE</Text>
          <Text style={s.sectionTitle}>Available drops.</Text>
        </View>

        {isLoading && (
          <View style={s.state}>
            <Text style={s.stateTitle}>Finding the next drop...</Text>
            <Text style={s.stateText}>Connecting to FlashDrop.</Text>
          </View>
        )}

        {isError && (
          <View style={s.state}>
            <Text style={s.stateTitle}>Couldn't load drops.</Text>
            <Text style={s.stateText}>
              Check that your backend is running and try again.
            </Text>
            <Pressable onPress={() => refetch()} style={s.retry}>
              <Text style={s.retryText}>TRY AGAIN</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && drops.length === 0 && (
          <View style={s.state}>
            <Text style={s.stateTitle}>Nothing here. Yet.</Text>
            <Text style={s.stateText}>New releases will appear here.</Text>
          </View>
        )}

        {drops.map((drop, index) => {
          const soldOut = drop.available_inventory <= 0;

          return (
            <View key={drop.id} style={s.drop}>
              <View style={s.dropTop}>
                <Text style={s.dropIndex}>
                  DROP / {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={[s.status, soldOut && s.soldOut]}>
                  <View style={[s.statusDot, soldOut && s.soldOutDot]} />
                  <Text style={s.statusText}>
                    {soldOut ? 'SOLD OUT' : 'AVAILABLE'}
                  </Text>
                </View>
              </View>

              <Text style={s.dropName}>{drop.name}</Text>

              <View style={s.dropBottom}>
                <View>
                  <Text style={s.label}>REMAINING INVENTORY</Text>
                  <Text style={s.inventory}>
                    {drop.available_inventory.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={s.dropId}>{drop.id}</Text>
              </View>

              <View style={s.inventoryTrack}>
                <View
                  style={[
                    s.inventoryFill,
                    {
                      width: soldOut ? '0%' : '100%',
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}

        <View style={s.footer}>
          <Text style={s.footerLogo}>flashdrop.</Text>
          <Text style={s.footerCopy}>LESS ACCESS. MORE MEANING.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background, width: '100%' },
  scroll: { flex: 1, width: '100%' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 35 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 18,
  },
  logo: { color: C.cream, fontSize: 27, fontWeight: '800', letterSpacing: -1.8 },
  dot: { color: C.accent },
  tagline: { color: C.muted, fontSize: 8, letterSpacing: 2.2, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 42, height: 42, borderWidth: 1, borderColor: C.border,
    borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  intro: { paddingTop: 38, paddingBottom: 35 },
  eyebrow: { color: C.accent, fontSize: 9, letterSpacing: 2.1, fontWeight: '700' },
  headline: {
    color: C.cream, fontSize: 43, lineHeight: 48,
    fontWeight: '600', letterSpacing: -2.2, marginTop: 17,
  },
  italic: { color: C.accent, fontStyle: 'italic', fontWeight: '400' },
  introBottom: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 19,
  },
  description: { color: C.muted, fontSize: 13, lineHeight: 21 },
  sectionHeading: { marginBottom: 17 },
  sectionTitle: {
    color: C.cream, fontSize: 27, fontWeight: '500',
    letterSpacing: -1, marginTop: 9,
  },
  state: {
    padding: 24, backgroundColor: C.surface,
    borderRadius: 5, marginBottom: 16,
  },
  stateTitle: { color: C.cream, fontSize: 17, fontWeight: '600' },
  stateText: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  retry: {
    marginTop: 18, backgroundColor: C.accent,
    padding: 13, alignSelf: 'flex-start',
  },
  retryText: { color: C.background, fontWeight: '800', fontSize: 10 },
  drop: {
    backgroundColor: C.surface, padding: 19,
    marginBottom: 13, borderRadius: 4,
  },
  dropTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropIndex: { color: C.muted, fontSize: 9, letterSpacing: 1.5 },
  status: {
    backgroundColor: '#29382B', paddingHorizontal: 10,
    paddingVertical: 7, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  soldOut: { backgroundColor: '#392725' },
  statusDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: C.success },
  soldOutDot: { backgroundColor: C.danger },
  statusText: { color: C.cream, fontSize: 8, letterSpacing: 1 },
  dropName: {
    color: C.cream, fontSize: 26, fontWeight: '600',
    letterSpacing: -0.8, marginTop: 27, marginBottom: 24,
  },
  dropBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: { color: C.muted, fontSize: 8, letterSpacing: 1.2 },
  inventory: { color: C.accent, fontSize: 23, fontWeight: '600', marginTop: 5 },
  dropId: { color: C.muted, fontSize: 9 },
  inventoryTrack: {
    height: 2, backgroundColor: C.line, marginTop: 17, overflow: 'hidden',
  },
  inventoryFill: { height: 2, backgroundColor: C.accent },
  footer: {
    paddingTop: 35, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  footerLogo: { color: C.cream, fontSize: 17, fontWeight: '800' },
  footerCopy: { color: C.muted, fontSize: 8, letterSpacing: 1.1 },
});
