import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import PRCelebration from './src/components/PRCelebration';
import useAppStore from './src/store/useAppStore';

export default function App() {
  const prCelebration = useAppStore(s => s.prCelebration);
  const hidePRCelebration = useAppStore(s => s.hidePRCelebration);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0D0D0D" />
        <RootNavigator />
        {prCelebration && (
          <PRCelebration
            pr={prCelebration}
            onDismiss={hidePRCelebration}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
