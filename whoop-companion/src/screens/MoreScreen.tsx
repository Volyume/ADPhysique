import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, NavRow, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';

export function MoreScreen({ nav }: { nav: Nav }) {
  const status = useStoreSelector(appStore, (s) => s.status);
  const battery = useStoreSelector(appStore, (s) => s.battery);
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const historyDay = today?.day ?? recentDays[0]?.day ?? null;

  return (
    <Screen title="More">
      <SectionLabel>Health &amp; performance</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Health Monitor" icon="pulse" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'health' })} />
        <NavRow label="Stress Monitor" icon="speedometer" iconColor={colors.strainBlue} onPress={() => nav.navigate({ name: 'stress' })} />
        <NavRow label="Steps" icon="footsteps" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'metric', key: 'steps' })} />
        <NavRow label="Training Status" icon="fitness" iconColor={colors.strainBlue} onPress={() => nav.navigate({ name: 'training' })} />
        <NavRow label="Readiness" icon="speedometer" iconColor={colors.recoveryYellow} onPress={() => nav.navigate({ name: 'readiness' })} />
        <NavRow label="Energy Reserve" icon="battery-charging" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'energyReserve' })} />
        <NavRow label="Resilience" icon="shield-half" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'resilience' })} />
        <NavRow label="Sick-Risk Monitor" icon="medkit" iconColor={colors.recoveryYellow} onPress={() => nav.navigate({ name: 'illness' })} last />
      </Card>

      <SectionLabel>Plan &amp; history</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Sleep Coach" icon="moon" iconColor={colors.sleepTeal} onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <NavRow label="Weekly Plan" icon="calendar" iconColor={colors.greenVibrant} onPress={() => nav.navigate({ name: 'weeklyPlan' })} />
        {historyDay ? (
          <NavRow
            label="Daily history"
            icon="calendar"
            iconColor={colors.strainBlue}
            value={historyDay}
            onPress={() => nav.navigate({ name: 'day', day: historyDay })}
          />
        ) : null}
        <NavRow label="Trends" icon="trending-up" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'trends' })} />
        <NavRow label="Journal" icon="book" iconColor={colors.recoveryYellow} onPress={() => nav.navigate({ name: 'journal' })} last />
      </Card>

      <SectionLabel>Log</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Add an activity" icon="add-circle" onPress={() => nav.navigate({ name: 'logActivity' })} last />
      </Card>

      <SectionLabel>Device &amp; account</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow
          label="Device"
          icon="watch"
          value={status === 'connected' ? `Connected${battery != null ? ` - ${battery}%` : ''}` : 'Not connected'}
          onPress={() => nav.navigate({ name: 'device' })}
        />
        <NavRow label="Settings &amp; profile" icon="settings" onPress={() => nav.navigate({ name: 'settings' })} last />
      </Card>

      <View style={styles.about}>
        <Text style={styles.aboutText}>VOLYUME Pulse - private WHOOP companion</Text>
        <Text style={styles.aboutSub}>Your data stays on this device. Derived metrics are approximations, not medical advice.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  about: { marginTop: 28, alignItems: 'center' },
  aboutText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.textSemibold },
  aboutSub: { color: colors.textTertiary, fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 16, fontFamily: fonts.text },
});
