import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDrop } from '@/hooks/use-drop';
import { useAuth } from '@/context/auth-context';

const T = {
  bone: '#E9E4D9',
  ink: '#151B18',
  sage: '#B7C69A',
  clay: '#B66C4B',
  muted: '#77786E',
  line: '#C9C3B7',
  stage: '#D4CFC3',
};

export default function DropDetailScreen() {
  const { user, isReady } = useAuth();
  const { id: routeId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const { data: drop, isLoading, isError, error, refetch, isRefetching } = useDrop(id ?? '');
  const notFound = axios.isAxiosError(error) && error.response?.status === 404;
  const imageReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drop) return;
    imageReveal.setValue(0);
    Animated.timing(imageReveal, {
      toValue: 1,
      duration: 440,
      useNativeDriver: true,
    }).start();
  }, [drop?.id, imageReveal]);

  if (isReady && !user) return <Redirect href="/" />;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.backButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to discovery"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={T.ink} />
          </Pressable>
          <Text style={s.brand}>flashdrop<Text style={s.brandDot}>.</Text></Text>
          <Text style={s.edition}>FIELD NOTES / 01</Text>
        </View>

        {isLoading ? (
          <View style={s.state} accessibilityLiveRegion="polite">
            <ActivityIndicator color={T.clay} size="large" />
            <Text style={s.stateTitle}>The next release is opening.</Text>
            <Text style={s.stateText}>Checking live availability.</Text>
          </View>
        ) : null}

        {!id ? (
          <StateMessage
            eyebrow="DROP / UNAVAILABLE"
            title="This release has no address."
            message="Return to discovery and choose a live drop."
            action="BACK TO DISCOVERY"
            onAction={() => router.replace('/(tabs)')}
          />
        ) : null}

        {isError && id ? (
          <StateMessage
            eyebrow={notFound ? 'DROP / NOT FOUND' : 'CONNECTION / INTERRUPTED'}
            title={notFound ? 'This release is no longer here.' : 'The release could not load.'}
            message={notFound
              ? 'Return to discovery to see the drops currently available.'
              : 'Check the connection, then try again.'}
            action={notFound ? 'BACK TO DISCOVERY' : isRefetching ? 'CHECKING…' : 'TRY AGAIN'}
            onAction={notFound ? () => router.replace('/(tabs)') : () => refetch()}
            disabled={!notFound && isRefetching}
          />
        ) : null}

        {drop ? (
          <>
            <View style={s.stageMeta}>
              <Text style={s.micro}>FLASHDROP / RELEASE {String(drop.id).replace(/^drop_/, '')}</Text>
              <Text style={s.micro}>OBJECT STUDY</Text>
            </View>

            <Animated.View
              style={[
                s.artStage,
                {
                  opacity: imageReveal,
                  transform: [{ translateY: imageReveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                },
              ]}
              accessible
              accessibilityLabel="Abstract release artwork placeholder. Product photography has not been provided."
            >
              <View style={s.artFrame} />
              <View style={s.inkForm} />
              <View style={s.clayForm} />
              <View style={s.sageForm} />
              <View style={s.hairline} />
              <Text style={s.artSideNote}>AN{ '\n' }IMAGE{ '\n' }STUDY</Text>
              <View style={s.pendingTag}>
                <View style={s.pendingDot} />
                <Text style={s.pendingText}>PRODUCT IMAGE PENDING</Text>
              </View>
              <Text style={s.artCaption}>A PLACEHOLDER FOR THE{ '\n' }CAMPAIGN IMAGE</Text>
            </Animated.View>

            <View style={s.titleBlock}>
              <Text style={s.kicker}>THE DROP / {drop.id.toUpperCase()}</Text>
              <Text style={s.name}>{drop.name}</Text>
              <Text style={s.eventLine}>A release is a moment.</Text>
            </View>

            <View style={s.availability}>
              <View style={s.availabilityTop}>
                <View style={s.availabilityLabelRow}>
                  <View style={[s.availabilityDot, drop.available_inventory <= 0 && s.closedDot]} />
                  <Text style={s.label}>
                    {drop.available_inventory <= 0 ? 'RELEASE CLOSED' : 'LIVE AVAILABILITY'}
                  </Text>
                </View>
                <Text style={s.unitsLabel}>UNITS</Text>
              </View>
              <View style={s.inventoryRow}>
                <Text style={[s.inventory, drop.available_inventory <= 0 && s.inventoryClosed]}>
                  {drop.available_inventory.toLocaleString('en-IN')}
                </Text>
                <Text style={s.inventoryAside}>
                  {drop.available_inventory <= 0 ? 'SOLD\nOUT' : 'REMAINING\nIN THIS DROP'}
                </Text>
              </View>
            </View>

            <Pressable
              disabled
              style={({ pressed }) => [
                s.cta,
                drop.available_inventory <= 0 && s.ctaClosed,
                pressed && s.ctaPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel={drop.available_inventory <= 0 ? 'This drop is sold out' : 'Reservation flow is coming soon'}
            >
              <Text style={s.ctaText}>
                {drop.available_inventory <= 0 ? 'RELEASE CLOSED' : 'RESERVE THIS DROP'}
              </Text>
              {drop.available_inventory > 0 ? (
                <Ionicons name="arrow-forward" size={18} color={T.bone} />
              ) : null}
            </Pressable>
            {drop.available_inventory > 0 ? (
              <Text style={s.ctaNote}>RESERVATIONS OPEN IN THE NEXT UPDATE</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StateMessage({
  eyebrow,
  title,
  message,
  action,
  onAction,
  disabled = false,
}: {
  eyebrow: string;
  title: string;
  message: string;
  action: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.state}>
      <Text style={s.micro}>{eyebrow}</Text>
      <Text style={s.stateTitle}>{title}</Text>
      <Text style={s.stateText}>{message}</Text>
      <Pressable
        onPress={onAction}
        disabled={disabled}
        style={({ pressed }) => [s.stateAction, pressed && !disabled && s.pressed]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={s.stateActionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 24 },
  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: '#A9A497',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.65 },
  brand: { color: T.ink, fontSize: 19, fontWeight: '800', letterSpacing: -1.2 },
  brandDot: { color: T.clay },
  edition: { color: T.muted, fontSize: 8, letterSpacing: 1.4 },
  stageMeta: {
    height: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  micro: { color: T.ink, fontSize: 8, letterSpacing: 1.6, fontWeight: '700' },
  artStage: {
    height: 352,
    marginHorizontal: -22,
    backgroundColor: T.stage,
    overflow: 'hidden',
  },
  artFrame: {
    position: 'absolute',
    top: 17,
    right: 17,
    bottom: 17,
    left: 17,
    borderWidth: 1,
    borderColor: 'rgba(21, 27, 24, 0.18)',
  },
  inkForm: {
    position: 'absolute',
    width: 237,
    height: 292,
    right: 28,
    top: 26,
    backgroundColor: T.ink,
    borderTopLeftRadius: 112,
    borderTopRightRadius: 112,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '7deg' }],
  },
  clayForm: {
    position: 'absolute',
    width: 206,
    height: 150,
    left: -39,
    bottom: 13,
    backgroundColor: T.clay,
    borderRadius: 110,
    transform: [{ rotate: '-26deg' }],
  },
  sageForm: {
    position: 'absolute',
    width: 134,
    height: 189,
    right: 72,
    top: 78,
    backgroundColor: T.sage,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 72,
    borderBottomRightRadius: 22,
    transform: [{ rotate: '-11deg' }],
  },
  hairline: {
    position: 'absolute',
    width: 1,
    height: 246,
    left: 62,
    top: 50,
    backgroundColor: 'rgba(21, 27, 24, 0.32)',
    transform: [{ rotate: '12deg' }],
  },
  artSideNote: {
    position: 'absolute',
    top: 39,
    left: 31,
    color: T.ink,
    fontSize: 10,
    lineHeight: 17,
    letterSpacing: 1,
    fontWeight: '700',
  },
  pendingTag: {
    position: 'absolute',
    right: 29,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: T.ink,
  },
  pendingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.clay },
  pendingText: { color: T.bone, fontSize: 7, letterSpacing: 1.2, fontWeight: '700' },
  artCaption: {
    position: 'absolute',
    left: 29,
    bottom: 31,
    color: T.ink,
    fontSize: 7,
    lineHeight: 12,
    letterSpacing: 1,
    fontWeight: '700',
  },
  titleBlock: { paddingTop: 25, paddingBottom: 24 },
  kicker: { color: T.clay, fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
  name: {
    color: T.ink,
    fontFamily: 'serif',
    fontSize: 39,
    lineHeight: 43,
    fontWeight: '600',
    letterSpacing: -1.5,
    marginTop: 8,
  },
  eventLine: {
    color: T.ink,
    fontFamily: 'serif',
    fontSize: 17,
    fontStyle: 'italic',
    marginTop: 8,
  },
  availability: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: T.line,
    paddingTop: 14,
    paddingBottom: 13,
  },
  availabilityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availabilityLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#63774D' },
  closedDot: { backgroundColor: T.clay },
  label: { color: T.ink, fontSize: 8, letterSpacing: 1.6, fontWeight: '700' },
  unitsLabel: { color: T.muted, fontSize: 7, letterSpacing: 1.6 },
  inventoryRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  inventory: {
    color: T.ink,
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '700',
    letterSpacing: -3.5,
    marginTop: 2,
  },
  inventoryClosed: { color: T.clay },
  inventoryAside: {
    color: T.muted,
    fontSize: 8,
    lineHeight: 13,
    letterSpacing: 1.3,
    textAlign: 'right',
    marginBottom: 12,
  },
  cta: {
    minHeight: 56,
    marginTop: 20,
    paddingHorizontal: 18,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPressed: { backgroundColor: '#303833', transform: [{ scale: 0.99 }] },
  ctaClosed: { backgroundColor: '#A8A397' },
  ctaText: { color: T.bone, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  ctaNote: { color: T.muted, fontSize: 7, textAlign: 'center', letterSpacing: 1.1, marginTop: 10 },
  state: { flex: 1, minHeight: 400, justifyContent: 'center', alignItems: 'flex-start', paddingVertical: 42 },
  stateTitle: { color: T.ink, fontFamily: 'serif', fontSize: 28, lineHeight: 34, marginTop: 14 },
  stateText: { color: T.muted, fontSize: 13, lineHeight: 20, marginTop: 9, maxWidth: 300 },
  stateAction: { minHeight: 48, justifyContent: 'center', backgroundColor: T.ink, paddingHorizontal: 18, marginTop: 22 },
  stateActionText: { color: T.bone, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
});
