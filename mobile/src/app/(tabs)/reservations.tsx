import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { Link, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

const T = { bone: '#E9E4D9', ink: '#151B18', sage: '#B7C69A', clay: '#B66C4B', muted: '#77786E', line: '#C9C3B7' };

type Reservation = {
  id: string;
  drop_id: string;
  drop_name: string | null;
  status: 'confirmed';
};
type ReservationsResponse = { data: Reservation[] };

export default function ReservationsScreen() {
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: async () => {
      const response = await api.get<ReservationsResponse>('/reservations/mine');
      return response.data;
    },
    staleTime: 15_000,
  });
  const reservations = data?.data ?? [];
  const errorMessage = axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : undefined;
  const isSessionExpired = axios.isAxiosError(error) && error.response?.status === 401;

  async function refresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleExpiredSession() {
    await signOut();
    router.replace({ pathname: '/auth', params: { mode: 'login' } });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
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
            <Text style={s.tagline}>A RECORD OF THE MOMENT</Text>
          </View>
          <Link href="/account" asChild>
            <Pressable style={s.accountButton} accessibilityRole="button" accessibilityLabel="View your account">
              <Ionicons name="person-outline" size={18} color={T.ink} />
            </Pressable>
          </Link>
        </View>

        <View style={s.intro}>
          <Text style={s.eyebrow}>FLASHDROP / YOUR HISTORY</Text>
          <View style={s.titleRow}>
            <Text style={s.title}>The ones{ '\n' }you <Text style={s.italic}>claimed.</Text></Text>
            {!isLoading && !isError ? (
              <View style={s.count}>
                <Text style={s.countValue}>{String(reservations.length).padStart(2, '0')}</Text>
                <Text style={s.countLabel}>ON{ '\n' }RECORD</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.subtitle}>Every confirmed place, kept here for you.</Text>
        </View>

        {isLoading ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <ActivityIndicator color={T.clay} />
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>Gathering your releases.</Text>
              <Text style={s.stateText}>Checking your reservation history.</Text>
            </View>
          </View>
        ) : null}

        {isError ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <View style={s.stateIcon}><Ionicons name="cloud-offline-outline" size={18} color={T.clay} /></View>
            <View style={s.stateCopy}>
              <Text style={s.stateTitle}>Your history didn’t come through.</Text>
              <Text style={s.stateText}>
                {isSessionExpired
                  ? 'Your sign-in expired. Sign in again to view your reservations.'
                  : errorMessage ?? 'Check your connection, then try again.'}
              </Text>
            </View>
            <Pressable
              onPress={isSessionExpired ? handleExpiredSession : () => refetch()}
              disabled={!isSessionExpired && isRefetching}
              style={({ pressed }) => [s.retry, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityState={{ busy: !isSessionExpired && isRefetching, disabled: !isSessionExpired && isRefetching }}
            >
              <Text style={s.retryText}>{isSessionExpired ? 'SIGN IN' : isRefetching ? 'CHECKING…' : 'TRY AGAIN'}</Text>
              {!isSessionExpired && isRefetching ? <ActivityIndicator size="small" color={T.bone} /> : <Ionicons name="arrow-forward" size={15} color={T.bone} />}
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError && reservations.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyMark}><Ionicons name="ticket-outline" size={22} color={T.sage} /></View>
            <Text style={s.emptyIndex}>YOUR FIRST RELEASE / AHEAD</Text>
            <Text style={s.stateTitle}>Nothing claimed. Yet.</Text>
            <Text style={s.stateText}>When you reserve a drop, the confirmation will live here.</Text>
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => [s.emptyAction, pressed && s.pressed]}
              accessibilityRole="button"
            >
              <Text style={s.emptyActionText}>EXPLORE LIVE DROPS</Text>
              <Ionicons name="arrow-forward" size={16} color={T.bone} />
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError ? reservations.map((reservation, index) => (
          <View key={reservation.id} style={s.reservation}>
            <View style={s.cardTop}>
              <Text style={s.cardIndex}>RESERVATION / {String(index + 1).padStart(2, '0')}</Text>
              <View style={s.status}>
                <View style={s.statusDot} />
                <Text style={s.statusText}>CONFIRMED</Text>
              </View>
            </View>
            <Text style={s.dropName}>{reservation.drop_name ?? 'Release no longer listed'}</Text>
            <View style={s.cardBottom}>
              <View style={s.referenceBlock}>
                <Text style={s.referenceLabel}>DROP REFERENCE</Text>
                <Text style={s.referenceValue}>{reservation.drop_id}</Text>
              </View>
              <View style={s.ticketMark}>
                <Ionicons name="checkmark" size={17} color={T.ink} />
              </View>
            </View>
            <View style={s.reservationIdRow}>
              <Text style={s.reservationIdLabel}>RESERVATION ID</Text>
              <Text style={s.reservationId} numberOfLines={1}>{reservation.id}</Text>
            </View>
          </View>
        )) : null}

        <View style={s.footer}>
          <Text style={s.footerLogo}>flashdrop<Text style={s.logoDot}>.</Text></Text>
          <Text style={s.footerCopy}>SAVED WITH THE RELEASE.</Text>
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
  logoDot: { color: T.clay },
  tagline: { color: T.muted, fontSize: 7, letterSpacing: 1.7, marginTop: 2 },
  accountButton: { width: 40, height: 40, borderWidth: 1, borderColor: '#B8B2A7', alignItems: 'center', justifyContent: 'center' },
  intro: { paddingTop: 16, paddingBottom: 19 },
  eyebrow: { color: T.clay, fontSize: 8, letterSpacing: 1.6, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { color: T.ink, fontFamily: 'serif', fontSize: 39, lineHeight: 41, letterSpacing: -1.2, marginTop: 10 },
  italic: { color: '#798A60', fontStyle: 'italic' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  countValue: { color: T.ink, fontSize: 27, fontWeight: '700', letterSpacing: -1.4 },
  countLabel: { color: T.muted, fontSize: 6, lineHeight: 9, letterSpacing: 1 },
  subtitle: { color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 21, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.line },
  stateCopy: { flex: 1 },
  stateIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(182,108,75,0.12)', alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: T.ink, fontFamily: 'serif', fontSize: 22, lineHeight: 27 },
  stateText: { color: T.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  retry: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, backgroundColor: T.ink },
  retryText: { color: T.bone, fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
  pressed: { opacity: 0.68 },
  empty: { marginTop: 2, padding: 20, borderWidth: 1, borderColor: T.line, backgroundColor: '#F4F0E8' },
  emptyMark: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center' },
  emptyIndex: { color: T.clay, fontSize: 7, letterSpacing: 1.4, fontWeight: '800', marginTop: 20 },
  emptyAction: { minHeight: 48, marginTop: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.ink },
  emptyActionText: { color: T.bone, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  reservation: { marginBottom: 14, padding: 17, borderRadius: 9, borderWidth: 1, borderColor: '#CFC7BA', backgroundColor: '#FBF9F3', shadowColor: T.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIndex: { color: T.muted, fontSize: 7, letterSpacing: 1.2, fontWeight: '700' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)', borderRadius: 999, backgroundColor: 'rgba(183,198,154,0.28)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#63774D' },
  statusText: { color: T.ink, fontSize: 7, letterSpacing: 1, fontWeight: '700' },
  dropName: { color: T.ink, fontFamily: 'serif', fontSize: 25, lineHeight: 31, marginTop: 15 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 17, paddingTop: 11, borderTopWidth: 1, borderColor: 'rgba(201,195,183,0.72)' },
  referenceBlock: { flex: 1, paddingRight: 10 },
  referenceLabel: { color: T.muted, fontSize: 7, letterSpacing: 1.2, fontWeight: '700' },
  referenceValue: { color: T.ink, fontSize: 11, marginTop: 4 },
  ticketMark: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: '#fff' },
  reservationIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  reservationIdLabel: { color: T.muted, fontSize: 6, letterSpacing: 1 },
  reservationId: { flex: 1, color: T.muted, fontSize: 7 },
  footer: { paddingTop: 24, marginTop: 5, borderTopWidth: 1, borderColor: T.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLogo: { color: T.ink, fontSize: 14, fontWeight: '800', letterSpacing: -0.7 },
  footerCopy: { color: T.muted, fontSize: 6, letterSpacing: 1 },
});
