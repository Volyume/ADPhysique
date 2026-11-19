/**
 * The Today screen's offer cards and the Community row drawn with the kit
 * (kit trial 2, LOC-412; design rules 1, 2 and 6).
 *
 * src/components/Home*Card.js and CoachingSetupCard.js keep every condition,
 * handler and word; these are the pieces they draw. The card is the charcoal
 * card step with a hairline border and no shadow. The icon sits in a quiet
 * raised tile in neutral ink, and every action is outlined or plain text in
 * a 48 dp target: the screen's one solid amber button belongs to the session
 * card, so an offer never spends amber on its icon, its tint or its buttons.
 * Rows wrap, so at the phone's largest text size the second action drops
 * under the first and both stay in reach.
 */
import { Button } from './button';
import { Card } from './card';
import { Icon } from './icon';
import { KitThemeProvider } from './kit-theme-provider';
import { Text } from './text';
import { cn } from './utils';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { fontFamily } from '../../styles/fontFamily';

/** An offer: a muted icon tile, a title, a sentence and the actions beneath. */
function TodayOfferCard({
  icon,
  title,
  body,
  accessibilityLabel,
  testID,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  accessibilityLabel?: string;
  testID?: string;
  children?: React.ReactNode;
}) {
  return (
    <KitThemeProvider>
      <Card
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        className="gap-3 rounded-lg px-4 py-4 shadow-none">
        <View className="flex-row items-start gap-3">
          {icon ? (
            <View className="bg-popover border-border size-10 shrink-0 items-center justify-center rounded-md border">
              <Icon as={icon} size={20} className="text-muted-foreground" />
            </View>
          ) : null}
          <View className="min-w-0 flex-1 gap-1">
            <Text
              role="heading"
              aria-level={3}
              style={{ fontFamily: fontFamily.semibold }}
              className="text-foreground text-base">
              {title}
            </Text>
            <Text className="text-muted-foreground text-sm">{body}</Text>
          </View>
        </View>
        {children}
      </Card>
    </KitThemeProvider>
  );
}

/** The offer's actions: wrapping, so large text drops the second under the first. */
function TodayOfferActions({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap items-center gap-2">{children}</View>;
}

type OfferButtonProps = {
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  icon?: LucideIcon;
  /** 'outline' (a bordered button) or 'plain' (text only). */
  look?: 'outline' | 'plain';
  full?: boolean;
};

/** An offer action: outlined or plain text, never solid amber, in a 48 dp target. */
function TodayOfferButton({ label, onPress, accessibilityLabel, testID, icon, look = 'outline', full }: OfferButtonProps) {
  return (
    <Button
      variant={look === 'plain' ? 'ghost' : 'outline'}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      className={cn('h-auto min-h-12 py-3', full && 'w-full', look === 'plain' && 'px-2')}>
      {icon ? <Icon as={icon} size={18} className="text-foreground" /> : null}
      <Text className={cn('text-sm', look === 'plain' && 'text-muted-foreground')}>{label}</Text>
    </Button>
  );
}

/**
 * One slim row in a card: a quiet icon, a line, and either a chevron (the
 * whole row opens) or a plain-text action on the right. The row and the action
 * are siblings, never nested, so each is its own 48 dp target.
 */
function TodayInfoRow({
  icon,
  line,
  onPress,
  accessibilityLabel,
  testID,
  action,
}: {
  icon: LucideIcon;
  line: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  action?: { label: string; onPress?: () => void; accessibilityLabel?: string } | null;
}) {
  return (
    <KitThemeProvider>
      <Card className="flex-row items-center gap-1 rounded-lg px-4 py-0 shadow-none">
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? line}
          testID={testID}
          className="min-h-12 flex-1 flex-row items-center gap-3 py-2">
          <Icon as={icon} size={18} className="text-muted-foreground" />
          <Text className="text-foreground min-w-0 flex-1 text-sm" style={{ fontFamily: fontFamily.semibold }}>
            {line}
          </Text>
          {!action ? <Icon as={ChevronRight} size={16} className="text-muted-foreground" /> : null}
        </Pressable>
        {action ? (
          <Button
            variant="ghost"
            onPress={action.onPress}
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            className="h-auto min-h-12 px-2 py-3">
            <Text className="text-foreground text-sm">{action.label}</Text>
          </Button>
        ) : null}
      </Card>
    </KitThemeProvider>
  );
}

export { TodayInfoRow, TodayOfferActions, TodayOfferButton, TodayOfferCard };
