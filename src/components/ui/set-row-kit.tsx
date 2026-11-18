/**
 * Set row parts drawn with the kit (kit trial 2, LOC-412; design rules 1 to 6).
 *
 * src/components/workout/session/SetRow.js keeps the row's grid, behaviour and
 * accessibility wiring; these are the pieces it draws. Every number is the
 * loudest thing on the row: the weight and reps wells use the screen's largest
 * type in tabular figures (so a changing value never jiggles) and the labels
 * around them are smaller and quieter. A well is an OUTLINED box; the one being
 * edited takes the amber ring and is the only amber on the row. A finished set
 * fades back to the muted ink, which keeps at least 4.5:1 against the card in
 * every palette (setRowContrast.test.js computes it). The tick box is a square
 * with a 48 by 48 dp touch target. Related rows sit in one card, separated by
 * the kit's Separator.
 *
 * Colour comes only from the kit's CSS variables (src/styles/kitTheme.js).
 */
import { Separator } from './separator';
import { Text } from './text';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { cn } from './utils';
import * as React from 'react';
import {
  Pressable,
  TextInput,
  View,
  type AccessibilityProps,
  type AccessibilityState,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { fontFamily } from '../../styles/fontFamily';
import { fontScaleCaps } from '../../styles/theme';

// Numbers: Inter SemiBold in tabular figures, the same on every well, the Last
// cell and the typed value, so a column of sets reads as a column.
const NUMERAL = { fontFamily: fontFamily.semibold, fontVariant: ['tabular-nums' as const] };
const LABEL_NUMERAL = { fontFamily: fontFamily.medium, fontVariant: ['tabular-nums' as const] };

/** The layout box of the tick: 48 by 48 dp, the platform's touch minimum. */
const CHECK_TARGET = 48;
/** The drawn square inside it. With CHECK_HIT_SLOP on every side the touch area is 48 dp. */
const CHECK_BOX = 32;
const CHECK_HIT_SLOP = (CHECK_TARGET - CHECK_BOX) / 2;

type RowShellProps = ViewProps & {
  onLongPress?: (() => void) | null;
  holdOff?: boolean;
  longPressMs?: number;
};

/**
 * One row of the set table plus the divider under it. With onLongPress the row
 * answers a hold (the screen's set sheet); holdOff disables that Pressable
 * while the keyboard is up so a tap on blank space reaches the scroll view.
 */
function SetRowShell({ children, onLongPress, holdOff, longPressMs = 300, testID, onLayout }: RowShellProps) {
  const row = 'min-h-16 flex-row items-center gap-2 pl-3 pr-0';
  return (
    <>
      {onLongPress ? (
        <Pressable
          testID={testID}
          className={row}
          onLayout={onLayout}
          onLongPress={() => onLongPress()}
          delayLongPress={longPressMs}
          disabled={!!holdOff}
          accessible={false}>
          {children}
        </Pressable>
      ) : (
        <View testID={testID} className={row} onLayout={onLayout}>
          {children}
        </View>
      )}
      <Separator />
    </>
  );
}

type MarkerTone = 'number' | 'warmup' | 'failure' | 'typed';

/** The set number or its type letter, on a quiet round badge; PR is plain bold ink, never amber. */
function SetMarkerBadge({ tone, text, record }: { tone: MarkerTone; text: string; record?: boolean }) {
  return (
    <View className="items-center">
      <View
        className={cn(
          'size-6 items-center justify-center rounded-full',
          tone === 'failure' ? 'bg-destructive' : tone === 'number' ? '' : 'bg-secondary'
        )}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCaps.numeral}
          style={LABEL_NUMERAL}
          className={cn(
            'text-xs',
            tone === 'failure' ? 'text-destructive-foreground' : 'text-muted-foreground'
          )}>
          {text}
        </Text>
      </View>
      {record ? (
        <Text
          accessible
          accessibilityLabel="Personal record"
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCaps.numeral}
          className="text-foreground text-xs font-bold">
          PR
        </Text>
      ) : null}
    </View>
  );
}

/** Last session's set at this position, quiet and tabular. */
function SetLastText({ text }: { text: string }) {
  return (
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={fontScaleCaps.numeral}
      style={LABEL_NUMERAL}
      className="text-muted-foreground text-center text-sm">
      {text}
    </Text>
  );
}

type WellState = 'logged' | 'next' | 'pending' | 'editing';

type SetWellProps = {
  text: string;
  state: WellState;
  /** The coach's numbers, not yet touched. */
  ghost?: boolean;
  isEditing: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel: string;
  accessibilityValueText: string;
  accessibilityState: AccessibilityState;
  hitSlop: PressableProps['hitSlop'];
  /** While editing, the well is a TextInput on the phone's keyboard. */
  input?: (TextInputProps & { ref?: React.Ref<TextInput> }) | null;
};

const WELL_BOX = 'h-12 min-w-0 flex-1 items-center justify-center rounded-md bg-background';

/** The weight or reps box: an outlined field, amber only while it is the one being edited. */
function SetWell({
  text,
  state,
  ghost,
  isEditing,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityValueText,
  accessibilityState,
  hitSlop,
  input,
}: SetWellProps) {
  if (input) {
    return (
      <View className={cn(WELL_BOX, 'border-2 border-ring')}>
        <Input
          {...input}
          // textAlign and textAlignVertical as style, not classes: the field
          // keeps the number centred in its box on both platforms whatever the
          // class pipeline resolves for a TextInput.
          style={{ ...NUMERAL, textAlign: 'center', textAlignVertical: 'center' }}
          maxFontSizeMultiplier={fontScaleCaps.numeral}
          accessibilityLabel={accessibilityLabel}
          hitSlop={hitSlop}
          className="text-foreground h-full w-full min-w-0 flex-1 self-stretch rounded-none border-0 bg-transparent p-0 text-center text-xl leading-8 shadow-none dark:bg-transparent"
        />
      </View>
    );
  }
  const faded = state === 'logged' || state === 'pending' || !!ghost;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValueText }}
      accessibilityState={accessibilityState}
      className={cn(
        WELL_BOX,
        isEditing ? 'border-2 border-ring' : state === 'logged' ? 'border border-border' : 'border border-input'
      )}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCaps.numeral}
        style={NUMERAL}
        className={cn('text-xl leading-8', faded && !isEditing ? 'text-muted-foreground' : 'text-foreground')}>
        {text}
      </Text>
    </Pressable>
  );
}

type SetCheckProps = {
  logged: boolean;
  /** The set you are on: the box edge is the stronger ink, never amber. */
  next: boolean;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityActions?: { name: string; label?: string }[];
  onAccessibilityAction?: AccessibilityProps['onAccessibilityAction'];
};

/** The tick: a square box in a 48 by 48 dp target. A logged set is a filled square with a tick. */
function SetCheck({
  logged,
  next,
  onPress,
  disabled,
  busy,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
}: SetCheckProps) {
  return (
    <View className="size-12 items-center justify-center">
      <Checkbox
        testID={testID}
        checked={logged}
        onCheckedChange={() => onPress?.()}
        disabled={disabled}
        hitSlop={CHECK_HIT_SLOP}
        aria-label={accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ checked: logged, disabled: !!disabled, busy: !!busy } as AccessibilityState}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
        className={cn(
          'size-8 rounded-sm border-2 bg-background shadow-none dark:bg-background',
          next ? 'border-foreground' : 'border-input',
          logged && 'border-muted-foreground'
        )}
        checkedClassName="border-muted-foreground"
        indicatorClassName="bg-secondary"
        iconClassName="text-foreground"
      />
    </View>
  );
}

export {
  CHECK_BOX,
  CHECK_HIT_SLOP,
  CHECK_TARGET,
  SetCheck,
  SetLastText,
  SetMarkerBadge,
  SetRowShell,
  SetWell,
};
export type { MarkerTone, SetCheckProps, SetWellProps, WellState };
