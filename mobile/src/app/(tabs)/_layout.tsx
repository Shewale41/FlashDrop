import AppTabs from '@/components/app-tabs';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/auth-context';

export default function TabsLayout() {
  const { user, isReady } = useAuth();
  if (!isReady) {
    return <View style={s.loading}><ActivityIndicator color="#B66C4B" /></View>;
  }
  if (!user) return <Redirect href="/" />;
  return <AppTabs />;
}

const s = StyleSheet.create({ loading: { flex: 1, backgroundColor: '#E9E4D9', alignItems: 'center', justifyContent: 'center' } });
