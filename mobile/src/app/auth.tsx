import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

const T = {
  bone: '#E9E4D9',
  ink: '#151B18',
  sage: '#B7C69A',
  clay: '#B66C4B',
  muted: '#77786E',
  line: '#C9C3B7',
};

type AuthMode = 'login' | 'register';
type LoginResponse = { user: { id: string; name: string; email: string; token: string } };
type ApiError = { message?: string };

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>(params.mode === 'register' ? 'register' : 'login');
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || (mode === 'register' && !name.trim())) {
      setErrorMessage(mode === 'register'
        ? 'Add your name, email and password to continue.'
        : 'Add your email and password to continue.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await api.post('/auth/register', {
          name: name.trim(),
          email: cleanEmail,
          password,
        });
      }

      // The register endpoint creates the account but does not issue a JWT.
      const response = await api.post<LoginResponse>('/auth/login', {
        email: cleanEmail,
        password,
      });
      const account = response.data.user;
      const token = account?.token;

      if (!token) throw new Error('The server did not return a sign-in token.');

      await signIn({ id: account.id, name: account.name, email: account.email }, token);
      router.replace('/(tabs)');
    } catch (error) {
      const serverMessage = axios.isAxiosError<ApiError>(error)
        ? error.response?.data?.message
        : undefined;
      setErrorMessage(serverMessage ?? (error instanceof Error
        ? error.message
        : 'We could not sign you in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage('');
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
            style={({ pressed }) => [s.back, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={19} color={T.ink} />
          </Pressable>
          <Text style={s.logo}>flashdrop<Text style={s.logoDot}>.</Text></Text>
          <Text style={s.headerMeta}>MEMBER ACCESS</Text>
        </View>

        <View style={s.hero}>
          <View style={s.heroRule} />
          <View style={s.heroOrb} />
          <Text style={s.heroEyebrow}>FLASHDROP / YOUR RELEASES</Text>
          <Text style={s.heroTitle}>
            {mode === 'login' ? <>Make this{ '\n' }moment <Text style={s.italic}>yours.</Text></> : <>Come in{ '\n' }for the <Text style={s.italic}>moment.</Text></>}
          </Text>
          <Text style={s.heroCopy}>
            {mode === 'login'
              ? 'Sign in to keep your place when the next release opens.'
              : 'Create an account for a fair chance at what comes next.'}
          </Text>
          <Text style={s.heroIndex}>ACCESS / 01</Text>
        </View>

        <View style={s.form}>
          <View style={s.modeSwitch} accessibilityRole="tablist">
            <Pressable
              onPress={() => switchMode('login')}
              style={[s.modeTab, mode === 'login' && s.modeTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'login' }}
            >
              <Text style={[s.modeText, mode === 'login' && s.modeTextActive]}>SIGN IN</Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode('register')}
              style={[s.modeTab, mode === 'register' && s.modeTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'register' }}
            >
              <Text style={[s.modeText, mode === 'register' && s.modeTextActive]}>CREATE ACCOUNT</Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <View style={s.field}>
              <Text style={s.fieldLabel}>YOUR NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor="#929187"
                style={s.input}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!isSubmitting}
                accessibilityLabel="Your name"
              />
            </View>
          ) : null}

          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#929187"
              style={s.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isSubmitting}
              accessibilityLabel="Email address"
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <View style={s.passwordRow}>
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor="#929187"
                style={[s.input, s.passwordInput]}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!isSubmitting}
                accessibilityLabel="Password"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={s.showPassword}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={T.muted} />
              </Pressable>
            </View>
          </View>

          {errorMessage ? (
            <View style={s.errorBox} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={17} color={T.clay} />
              <Text style={s.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={isSubmitting}
            style={({ pressed }) => [s.submit, pressed && !isSubmitting && s.submitPressed, isSubmitting && s.submitDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={T.bone} />
            ) : (
              <>
                <Text style={s.submitText}>{mode === 'login' ? 'ENTER FLASHDROP' : 'CREATE YOUR ACCOUNT'}</Text>
                <Ionicons name="arrow-forward" size={18} color={T.bone} />
              </>
            )}
          </Pressable>

          <View style={s.footnote}>
            <View style={s.footnoteDot} />
            <Text style={s.footnoteText}>Your account gives you access to the moment.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bone },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 },
  header: { height: 61, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B8B2A7' },
  pressed: { opacity: 0.62 },
  logo: { color: T.ink, fontSize: 20, fontWeight: '800', letterSpacing: -1.3 },
  logoDot: { color: T.clay },
  headerMeta: { color: T.muted, fontSize: 7, letterSpacing: 1.25 },
  hero: { minHeight: 258, marginHorizontal: -22, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, backgroundColor: T.ink, overflow: 'hidden', justifyContent: 'space-between' },
  heroRule: { position: 'absolute', top: 18, right: 17, width: 102, height: 102, borderWidth: 1, borderColor: 'rgba(233,228,217,0.18)', borderRadius: 51 },
  heroOrb: { position: 'absolute', right: 47, top: 48, width: 31, height: 31, borderRadius: 16, backgroundColor: 'rgba(183,198,154,0.75)' },
  heroEyebrow: { color: T.sage, fontSize: 8, fontWeight: '700', letterSpacing: 1.6 },
  heroTitle: { color: T.bone, fontFamily: 'serif', fontSize: 39, lineHeight: 42, letterSpacing: -1 },
  italic: { color: T.sage, fontStyle: 'italic' },
  heroCopy: { maxWidth: 255, color: '#BABCB1', fontSize: 11, lineHeight: 17 },
  heroIndex: { position: 'absolute', right: 21, bottom: 18, color: 'rgba(233,228,217,0.58)', fontSize: 7, letterSpacing: 1.2 },
  form: { paddingTop: 22 },
  modeSwitch: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.line, marginBottom: 5 },
  modeTab: { minHeight: 44, justifyContent: 'center', marginRight: 23, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeTabActive: { borderBottomColor: T.clay },
  modeText: { color: T.muted, fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  modeTextActive: { color: T.ink },
  field: { marginTop: 17 },
  fieldLabel: { color: T.muted, fontSize: 7, letterSpacing: 1.5, fontWeight: '700' },
  input: { minHeight: 46, paddingHorizontal: 0, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line, color: T.ink, fontSize: 15 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.line },
  passwordInput: { flex: 1, borderBottomWidth: 0 },
  showPassword: { width: 42, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, marginTop: 17, backgroundColor: 'rgba(182,108,75,0.09)', borderWidth: 1, borderColor: 'rgba(182,108,75,0.2)' },
  errorText: { flex: 1, color: T.ink, fontSize: 11, lineHeight: 16 },
  submit: { minHeight: 56, marginTop: 23, paddingHorizontal: 17, backgroundColor: T.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitPressed: { backgroundColor: '#343B36', transform: [{ scale: 0.99 }] },
  submitDisabled: { opacity: 0.78 },
  submitText: { color: T.bone, fontSize: 9, fontWeight: '800', letterSpacing: 1.25 },
  footnote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' },
  footnoteDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.clay },
  footnoteText: { color: T.muted, fontSize: 9 },
});
