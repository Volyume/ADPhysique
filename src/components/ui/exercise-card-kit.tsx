/**
 * Exercise card parts drawn with the kit (kit trial 2, LOC-412; design rules
 * 1, 2, 3 and 7).
 *
 * src/components/workout/session/ExerciseSection.js keeps the header, footer
 * and countdown wiring; these are the pieces it draws. Related rows sit in one
 * card (the middle charcoal step with a hairline border) separated by
 * dividers. The exercises still to do fold into one collapsible list, so the
 * page is the active exercise's card plus one quiet row. Actions in the
 * footer are plain text with an icon, never a boxed or filled button: the one
 * solid amber button on the logger belongs to the screen's primary control.
 */
import { Button } from './button';
import { Card } from './card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { Icon } from './icon';
import { KitThemeProvider } from './kit-theme-provider';
import { Separator } from './separator';
import { Text } from './text';
import { cn } from './utils';
import type { LucideIcon } from 'lucide-react-native';
import { Check, ChevronDown, ChevronUp, Ellipsis, Info } from 'lucide-react-native';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { fontFamily } from '../../styles/fontFamily';
import { fontScaleCaps } from '../../styles/theme';

const NUMERAL = { fontFamily: fontFamily.semibold, fontVariant: ['tabular-nums' as const] };

/**
 * The card an exercise (or a list of exercises) lives in: middle charcoal step,
 * hairline border, no shadow. It also carries the kit's colours (the palette
 * variables) for everything drawn inside it.
 */
function ExerciseCard({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return (
    <KitThemeProvider>
      <Card className={cn('gap-0 overflow-hidden rounded-lg py-0 shadow-none', className)} {...props} />
    </KitThemeProvider>
  );
}

/** The order badge in the exercise's header. */
function ExerciseIndex({ index }: { index: number | string }) {
  return (
    <View className="bg-secondary size-6 items-center justify-center rounded-full">
      <Text
        style={NUMERAL}
        maxFontSizeMultiplier={fontScaleCaps.chrome}
        className="text-muted-foreground text-xs">
        {index}
      </Text>
    </View>
  );
}

/** The exercise name on one line; shrinks a little rather than wrapping or clipping. */
function ExerciseName({
  children,
  skipped,
  minimumFontScale,
}: {
  children: React.ReactNode;
  skipped?: boolean;
  minimumFontScale?: number;
}) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={minimumFontScale}
      maxFontSizeMultiplier={fontScaleCaps.chrome}
      style={{ fontFamily: fontFamily.semibold }}
      className={cn('shrink text-base', skipped ? 'text-muted-foreground' : 'text-foreground')}>
      {children}
    </Text>
  );
}

/** A quiet second line or state word beside the name ("Superset", "2 of 4", "Left out"). */
function ExerciseCaption({
  children,
  numberOfLines,
  ...props
}: React.ComponentProps<typeof Text> & { children: React.ReactNode }) {
  return (
    <Text
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={fontScaleCaps.chrome}
      className="text-muted-foreground text-xs"
      {...props}>
      {children}
    </Text>
  );
}

/** The done mark: a tick in the plain ink (the amber and the green are not spent on a finished exercise). */
function ExerciseDoneMark() {
  return <Icon as={Check} size={16} className="text-foreground" />;
}

/** The glyph that says the active header opens the exercise guide. */
function ExerciseInfoMark() {
  return <Icon as={Info} size={18} className="text-muted-foreground" />;
}

/** The overflow glyph in the footer; the stronger ink while a first-use hint sits beside it. */
function ExerciseMoreMark({ strong }: { strong?: boolean }) {
  return <Icon as={Ellipsis} size={20} className={strong ? 'text-foreground' : 'text-muted-foreground'} />;
}

type FooterActionProps = {
  icon: LucideIcon;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
  testID?: string;
};

/** A footer action: an icon and a label as plain text in a 48 dp target. */
function ExerciseFooterAction({ icon, label, accessibilityLabel, onPress, testID }: FooterActionProps) {
  return (
    <Button
      variant="ghost"
      testID={testID}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className="h-auto min-h-12 px-2 py-2">
      <Icon as={icon} size={18} className="text-foreground" />
      <Text maxFontSizeMultiplier={fontScaleCaps.chrome} style={{ fontFamily: fontFamily.semibold }}>
        {label}
      </Text>
    </Button>
  );
}

/** The fold line of the set table: "3 earlier sets logged" / "Hide earlier sets". */
function SetFoldLabel({ collapsed, label }: { collapsed: boolean; label: string }) {
  return (
    <View className="min-h-9 flex-row items-center gap-1 px-3">
      <Icon as={collapsed ? ChevronDown : ChevronUp} size={16} className="text-muted-foreground" />
      <Text maxFontSizeMultiplier={fontScaleCaps.chrome} className="text-muted-foreground text-sm">
        {label}
      </Text>
    </View>
  );
}

/** A column label over the set table ("SET", "LAST", "KG", "REPS"): small and quiet. */
function SetColumnLabel({ children, chrome }: { children: React.ReactNode; chrome?: boolean }) {
  return (
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={chrome ? fontScaleCaps.chrome : fontScaleCaps.numeral}
      className="text-muted-foreground text-center text-xs tracking-widest">
      {children}
    </Text>
  );
}

/** The column-label row of the set table, with the hairline under it. */
function SetColumnsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <View className="min-h-9 flex-row items-center gap-2 pl-3 pr-0">{children}</View>
      <Separator />
    </>
  );
}

/** The divider the fold line sits above. */
function SetFoldShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Separator />
    </>
  );
}

type ExerciseListProps = {
  title: string;
  accessibilityLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

/**
 * The exercises still to do, folded into one collapsible list inside one card:
 * a trigger row that says how many, then the rows separated by dividers. It
 * opens by default (the next exercise stays one glance away) and the person
 * can fold it away.
 */
function ExerciseList({ title, accessibilityLabel, defaultOpen = true, children }: ExerciseListProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const rows = React.Children.toArray(children);
  return (
    <ExerciseCard>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityState={{ expanded: open }}
          className="min-h-12 flex-row items-center justify-between gap-2 px-3">
          <Text
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            style={{ fontFamily: fontFamily.semibold }}
            className="text-foreground shrink text-sm">
            {title}
          </Text>
          <Icon as={open ? ChevronUp : ChevronDown} size={18} className="text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {rows.map((row, i) => (
            <React.Fragment key={(row as React.ReactElement).key ?? i}>
              <Separator />
              {row}
            </React.Fragment>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </ExerciseCard>
  );
}

export {
  ExerciseCaption,
  ExerciseCard,
  ExerciseDoneMark,
  ExerciseFooterAction,
  ExerciseIndex,
  ExerciseInfoMark,
  ExerciseList,
  ExerciseMoreMark,
  ExerciseName,
  SetColumnLabel,
  SetColumnsShell,
  SetFoldLabel,
  SetFoldShell,
};
export type { ExerciseListProps, FooterActionProps };
