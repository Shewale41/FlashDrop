import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
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
import { useDrops } from '@/hooks/use-drops';

const T = {
  bone: '#E9E4D9',
  ink: '#151B18',
  sage: '#B7C69A',
  clay: '#B66C4B',
  muted: '#77786E',
  line: '#C9C3B7',
};

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
      <StatusBar style="dark" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={refresh}
            tintColor={T.clay}
          />
        }
      >
        <View style={s.header}>
          <View>
            <Text style={s.logo}>flashdrop<Text style={s.logoDot}>.</Text></Text>
            <Text style={s.tagline}>THE ART OF THE DROP</Text>
          </View>
          <View style={s.actions}>
            <Link href="/account" asChild>
              <Pressable
                style={s.iconButton}
                accessibilityRole="button"
                accessibilityLabel="View your account"
              >
                <Ionicons name="person-outline" size={19} color={T.ink} />
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={s.campaign}>
          <View style={s.campaignOutline} />
          <View style={s.campaignClay} />
          <View style={s.campaignSage} />
          <View style={s.campaignTop}>
            <Text style={s.campaignEyebrow}>FLASHDROP / RELEASE CULTURE</Text>
            <Ionicons name="sparkles-outline" size={17} color={T.sage} />
          </View>
          <Text style={s.headline}>
            Every drop{ '\n' }is an{ '\n' }
            <Text style={s.headlineItalic}>event.</Text>
          </Text>
          <View style={s.campaignBottom}>
            <Text style={s.campaignCopy}>
              Limited releases. A fair chance.{ '\n' }
              One moment to make it yours.
            </Text>
            <Ionicons name="arrow-down" size={19} color={T.sage} />
          </View>
        </View>

        <View style={s.sectionHeading}>
          <View>
            <Text style={s.sectionEyebrow}>LIVE FROM FLASHDROP</Text>
            <Text style={s.sectionTitle}>The drops.</Text>
          </View>
          <Text style={s.sectionAside}>CURRENT{ '\n' }RELEASES</Text>
        </View>

        {isLoading ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <ActivityIndicator color={T.clay} size="small" />
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>The next release is opening.</Text>
              <Text style={s.stateText}>Checking live availability.</Text>
            </View>
          </View>
        ) : null}

        {isError ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>The releases didn’t come through.</Text>
              <Text style={s.stateText}>Check your connection, then try again.</Text>
            </View>
            <Pressable
              onPress={() => refetch()}
              disabled={isRefetching}
              style={({ pressed }) => [s.retry, pressed && !isRefetching && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading drops"
              accessibilityState={{ busy: isRefetching, disabled: isRefetching }}
            >
              <Text style={s.retryText}>{isRefetching ? 'CHECKING…' : 'TRY AGAIN'}</Text>
              {isRefetching
                ? <ActivityIndicator size="small" color={T.bone} />
                : <Ionicons name="arrow-forward" size={16} color={T.bone} />}
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError && drops.length === 0 ? (
          <View style={s.state}>
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>Nothing is live right now.</Text>
              <Text style={s.stateText}>New releases will appear here.</Text>
            </View>
          </View>
        ) : null}

        {drops.map((drop, index) => {
          const soldOut = drop.available_inventory <= 0;

          return (
            <Link
              key={drop.id}
              href={{ pathname: '/drop/[id]', params: { id: drop.id } }}
              asChild
            >
              <Pressable
                style={({ pressed }) => [s.dropPress, pressed && s.dropPressed]}
                accessibilityRole="button"
                accessibilityLabel={`View ${drop.name}, ${soldOut ? 'sold out' : `${drop.available_inventory} available`}`}
              >
                <View style={[s.drop, soldOut && s.dropSoldOut]}>
                  <View style={s.dropTop}>
                    <Text style={s.dropIndex}>
                      DROP / {String(index + 1).padStart(2, '0')}
                    </Text>
                    <View style={[s.dropStatus, soldOut && s.dropStatusSoldOut]}>
                      <View style={[s.statusDot, soldOut && s.statusDotSoldOut]} />
                      <Text style={[s.statusText, soldOut && s.statusTextSoldOut]}>
                        {soldOut ? 'SOLD OUT' : 'AVAILABLE'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.dropTitleRow}>
                    <Text style={s.dropName}>{drop.name}</Text>
                    <View style={s.glassAction}>
                      <Ionicons name="arrow-forward" size={16} color={T.ink} />
                    </View>
                  </View>

                  <View style={s.dropBottom}>
                    <View>
                      <Text style={s.inventoryLabel}>REMAINING UNITS</Text>
                      <View style={s.dropInventory}>
                        <Text style={[s.inventoryValue, soldOut && s.inventorySoldOut]}>
                          {drop.available_inventory.toLocaleString('en-IN')}
                        </Text>
                        <Text style={s.unitsText}>UNITS</Text>
                      </View>
                    </View>
                    <Text style={s.dropId} numberOfLines={1} ellipsizeMode="middle">
                      {drop.id}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        })}

        <View style={s.footer}>
          <Text style={s.footerLogo}>flashdrop<Text style={s.logoDot}>.</Text></Text>
          <Text style={s.footerCopy}>LESS ACCESS. MORE MEANING.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone, width: '100%' },
  scroll: { flex: 1, width: '100%' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 13,
    paddingBottom: 17,
  },
  logo: { color: T.ink, fontSize: 26, fontWeight: '800', letterSpacing: -1.7 },
  logoDot: { color: T.clay },
  tagline: { color: T.muted, fontSize: 8, letterSpacing: 2, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 9 },
  iconButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#B8B2A7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaign: {
    minHeight: 330,
    marginHorizontal: -22,
    paddingHorizontal: 22,
    paddingTop: 21,
    paddingBottom: 21,
    backgroundColor: T.ink,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  campaignOutline: {
    position: 'absolute',
    width: 186,
    height: 186,
    borderWidth: 1,
    borderColor: 'rgba(183, 198, 154, 0.38)',
    borderRadius: 93,
    right: 12,
    bottom: 28,
  },
  campaignClay: {
    position: 'absolute',
    width: 126,
    height: 198,
    right: -42,
    bottom: 27,
    backgroundColor: T.clay,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    transform: [{ rotate: '19deg' }],
  },
  campaignSage: {
    position: 'absolute',
    width: 69,
    height: 69,
    right: 80,
    bottom: 115,
    backgroundColor: T.sage,
    borderRadius: 35,
  },
  campaignTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campaignEyebrow: { color: T.sage, fontSize: 8, letterSpacing: 1.8, fontWeight: '700' },
  headline: {
    color: T.bone,
    fontFamily: 'serif',
    fontSize: 43,
    lineHeight: 45,
    letterSpacing: -1.6,
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  headlineItalic: { color: T.sage, fontStyle: 'italic' },
  campaignBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingRight: 2,
  },
  campaignCopy: { color: '#C6C6BA', fontSize: 11, lineHeight: 17 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 31,
    paddingBottom: 14,
  },
  sectionEyebrow: { color: T.clay, fontSize: 8, letterSpacing: 1.6, fontWeight: '800' },
  sectionTitle: {
    color: T.ink,
    fontFamily: 'serif',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  sectionAside: { color: T.muted, fontSize: 7, lineHeight: 11, letterSpacing: 1.3, textAlign: 'right', marginBottom: 4 },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 23,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: T.line,
  },
  stateCopy: { flex: 1 },
  stateTitle: { color: T.ink, fontFamily: 'serif', fontSize: 20, lineHeight: 25 },
  stateText: { color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  retry: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    backgroundColor: T.ink,
  },
  retryText: { color: T.bone, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  pressed: { opacity: 0.7 },
  dropPress: { width: '100%' },
  drop: {
    marginBottom: 14,
    padding: 18,
    backgroundColor: '#FBF9F3',
    borderWidth: 1,
    borderColor: '#CFC7BA',
    borderRadius: 10,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.085,
    shadowRadius: 12,
    elevation: 2,
  },
  dropSoldOut: { backgroundColor: '#F4ECE5' },
  dropPressed: { opacity: 0.62 },
  dropTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropIndex: { color: T.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: '700' },
  dropStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 999,
    backgroundColor: 'rgba(183, 198, 154, 0.27)',
  },
  dropStatusSoldOut: { backgroundColor: 'rgba(182, 108, 75, 0.13)' },
  statusDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: '#63774D' },
  statusDotSoldOut: { backgroundColor: T.clay },
  statusText: { color: T.ink, fontSize: 8, letterSpacing: 1.1, fontWeight: '700' },
  statusTextSoldOut: { color: T.clay },
  dropTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 13,
    minHeight: 42,
  },
  dropName: {
    flex: 1,
    color: T.ink,
    fontFamily: 'serif',
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.4,
  },
  glassAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  dropBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderColor: 'rgba(201, 195, 183, 0.72)',
  },
  dropInventory: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  inventoryLabel: { color: T.muted, fontSize: 7, letterSpacing: 1.2, fontWeight: '700' },
  inventoryValue: { color: T.ink, fontSize: 25, lineHeight: 29, fontWeight: '700', letterSpacing: -0.8 },
  inventorySoldOut: { color: T.clay },
  unitsText: { color: T.muted, fontSize: 7, letterSpacing: 1.1 },
  dropId: { color: T.muted, fontSize: 8, letterSpacing: 0.4, maxWidth: 145, marginBottom: 4 },
  footer: {
    paddingTop: 27,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: T.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLogo: { color: T.ink, fontSize: 15, fontWeight: '800', letterSpacing: -0.7 },
  footerCopy: { color: T.muted, fontSize: 7, letterSpacing: 1 },
});
