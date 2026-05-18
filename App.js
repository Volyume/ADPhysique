import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RootNavigator from './src/navigation/RootNavigator';
import PRCelebration from './src/components/PRCelebration';
import useAppStore from './src/store/useAppStore';
import { getWellbeingMode, isCalm } from './src/lib/wellbeing';

const CRASH_LOG_KEY = '@volyume_crash_log';

// Catch unhandled JS exceptions and write them to AsyncStorage so the next
// launch can surface the error message on screen.
if (global.ErrorUtils) {
  const prev = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler(async (error, isFatal) => {
    try {
      const entry = JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack?.slice(0, 1200) || '',
        isFatal,
        ts: Date.now(),
      });
      await AsyncStorage.setItem(CRASH_LOG_KEY, entry);
    } catch (_) {}
    if (prev) prev(error, isFatal);
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify({
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 1200) || '',
      ts: Date.now(),
    })).catch(() => {});
  }

  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Volyume — Crash Report</Text>
          <Text style={eb.subtitle}>Send this to support:</Text>
          <View style={eb.msgBox}>
            <Text selectable style={eb.msg}>
              {this.state.error?.message || String(this.state.error)}
            </Text>
          </View>
          <ScrollView style={eb.scroll}>
            <Text selectable style={eb.stack}>{this.state.error?.stack}</Text>
          </ScrollView>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null })}>
            <Text style={eb.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', padding: 20, paddingTop: 60 },
  title: { color: '#FF3B30', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 12 },
  scroll: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12 },
  msgBox: { backgroundColor: '#2a1212', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FF3B30' },
  msg: { color: '#FF6B60', fontSize: 14, fontWeight: 'bold' },
  stack: { color: '#ccc', fontSize: 11, fontFamily: 'monospace' },
  btn: { marginTop: 16, backgroundColor: '#2979FF', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default function App() {
  const prCelebration = useAppStore(s => s.prCelebration);
  const hidePRCelebration = useAppStore(s => s.hidePRCelebration);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    if (prCelebration) getWellbeingMode().then(m => setCalm(isCalm(m)));
  }, [prCelebration]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#0D0D0D" />
          <RootNavigator />
          {prCelebration && (
            <PRCelebration
              pr={prCelebration}
              onDismiss={hidePRCelebration}
              subdued={calm}
            />
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
