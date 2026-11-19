/**
 * The Today screen's session card drawn with the kit (kit trial 2, LOC-412;
 * design rules 1, 2 and 3).
 *
 * src/screens/HomeScreen.js keeps every condition, handler and word; these are
 * the pieces it draws. The card is the raised charcoal step with a hairline
 * border. The card's ONE primary action is the screen's one solid amber button
 * (for example "Start workout"); every other action here is outlined or plain
 * text, and no amber is used for decoration.
 */
import { Button } from './button';
import { Card } from './card';
import { Icon } from './icon';
import { KitThemeProvider } from './kit-theme-provider';
import { Text } from './text';
import { cn } from './utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { fontFamily } from '../../styles/fontFamily';
import { fontScaleCaps } from '../../styles/theme';

/** The raised card (the third charcoal step) with a hairline border. */
function TodayHeroCard({ children }: { children: React.ReactNode }) {
  return (
    <KitThemeProvider>
      <Card className="bg-popover gap-3 rounded-lg px-4 py-4 shadow-none">{children}</Card>
    </KitThemeProvider>
  );
}

/** The small quiet label over the title ("Day 1 of 4", "Block complete"). */
function TodayHeroEyebrow({ children, numberOfLines }: { children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={fontScaleCaps.chrome}
      className="text-muted-foreground text-xs uppercase tracking-widest">
      {children}
    </Text>
  );
}

/** The session name, the biggest words on the card. */
function TodayHeroTitle({ children, numberOfLines }: { children: React.ReactNode; numberOfLines?: number }) {
  return (
    <Text
      role="heading"
      aria-level={2}
      numberOfLines={numberOfLines}
      style={{ fontFamily: fontFamily.displayBold }}
      className="text-foreground text-2xl leading-8">
      {children}
    </Text>
  );
}

/** One quiet line under the title ("5 exercises"). */
function TodayHeroMeta({ children }: { children: React.ReactNode }) {
  return <Text className="text-muted-foreground text-sm">{children}</Text>;
}

type HeroActionProps = {
  label: string;
  icon?: LucideIcon;
  onPress?: () => void;
  disabled?: boolean;
  /** The action is mid-attempt: shown disabled and spoken as busy. */
  busy?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * The card's primary action and, beside it, an optional outlined one. The row
 * wraps, so at the phone's largest text size the second button drops under the
 * first and both stay in reach.
 */
function TodayHeroActions({ primary, secondary }: { primary: HeroActionProps; secondary?: HeroActionProps }) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Button
        size="lg"
        onPress={primary.onPress}
        disabled={primary.disabled}
        accessibilityState={primary.busy ? { busy: true, disabled: true } : undefined}
        accessibilityLabel={primary.accessibilityLabel}
        testID={primary.testID}
        className="h-auto min-h-12 min-w-40 flex-1 py-3">
        {primary.icon ? <Icon as={primary.icon} size={18} className="text-primary-foreground" /> : null}
        <Text className="text-base" style={{ fontFamily: fontFamily.semibold }}>
          {primary.label}
        </Text>
      </Button>
      {secondary ? (
        <Button
          variant="outline"
          size="lg"
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          accessibilityLabel={secondary.accessibilityLabel}
          testID={secondary.testID}
          className="h-auto min-h-12 py-3">
          {secondary.icon ? <Icon as={secondary.icon} size={18} className="text-foreground" /> : null}
          <Text className="text-base" style={{ fontFamily: fontFamily.semibold }}>
            {secondary.label}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}

/** A plain-text action under the card's content ("Do another session"), in a 48 dp target. */
function TodayHeroLink({ label, onPress, accessibilityLabel, icon, outlined }: HeroActionProps & { outlined?: boolean }) {
  return (
    <Button
      variant={outlined ? 'outline' : 'ghost'}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className={cn('h-auto min-h-12 self-start py-3', outlined ? '' : 'px-0')}>
      {icon ? <Icon as={icon} size={18} className="text-foreground" /> : null}
      <Text className={outlined ? 'text-sm' : 'text-muted-foreground text-sm'}>{label}</Text>
    </Button>
  );
}

export { TodayHeroActions, TodayHeroCard, TodayHeroEyebrow, TodayHeroLink, TodayHeroMeta, TodayHeroTitle };
export type { HeroActionProps };
