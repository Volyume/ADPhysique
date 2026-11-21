/**
 * CoachNotice and QuietNotice: the Today screen's notices, drawn with the
 * kit's Alert (kit trial 2, LOC-412; design rules 1 and 8).
 *
 * CoachNotice is the coach's own check-in notice: an amber-OUTLINED alert, not
 * a filled banner (the card surface with a 1 px amber edge), so amber marks
 * "act here" and nothing more. QuietNotice is every other Today row and
 * banner (the plan, recovery, re-entry, limitation and nutrition-phase rows,
 * the getting-started and plateau notes, the first-workout card): the same
 * alert on the same surface with the neutral hairline edge, so no amber is
 * spent on decoration. Both always carry an icon and plain words, so neither
 * relies on colour. The whole notice is one button (the same tap as the old
 * row); a notice that can be dismissed has its own 48 dp close control beside
 * it, never nested inside the button, and one that cannot shows a chevron.
 *
 * A notice never cuts its sentence short (LOC-683, design rules 6 and 8):
 * the title and the sentence carry no line limit at any text size, so the
 * notice grows in height instead. Never put numberOfLines on them here or in
 * a caller; a notice that cannot show its whole sentence is the wrong part.
 *
 * Presentation only: the words, the tap and the dismissal come from the
 * caller, unchanged. Safety messages (Beat UK signposting, calm mode,
 * ED-related copy) do not use these parts in the trial.
 */
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Icon } from './icon';
import { KitThemeProvider } from './kit-theme-provider';
import { cn } from './utils';
import { Bell, ChevronRight, Info, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

type NoticeProps = {
  text: string;
  /** An optional bold line above the sentence. */
  title?: string;
  icon?: LucideIcon;
  onPress?: () => void;
  onDismiss?: (() => void) | null;
  accessibilityLabel?: string;
  /** The close control's spoken label; defaults to "Dismiss: <label>". */
  dismissLabel?: string;
  testID?: string;
};

function Notice({
  tone,
  icon,
  text,
  title,
  onPress,
  onDismiss,
  accessibilityLabel,
  dismissLabel,
  testID,
}: NoticeProps & { tone: 'coach' | 'quiet' }) {
  const label = accessibilityLabel || text;
  const coach = tone === 'coach';
  return (
    <KitThemeProvider>
      <View className="relative w-full">
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={testID}>
          <Alert
            icon={icon ?? (coach ? Bell : Info)}
            role="none"
            className={cn(coach ? 'border-ring bg-card' : 'border-border bg-card', onDismiss ? 'pr-14' : 'pr-10')}>
            {title ? (
              <AlertTitle className="text-foreground">
                {title}
              </AlertTitle>
            ) : null}
            <AlertDescription className="text-foreground">
              {text}
            </AlertDescription>
          </Alert>
        </Pressable>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel || `Dismiss: ${label}`}
            testID={testID ? `${testID}-dismiss` : undefined}
            className="absolute right-0 top-0 size-12 items-center justify-center">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        ) : (
          <View
            pointerEvents="none"
            className="absolute right-3 top-0 h-full items-center justify-center">
            <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
          </View>
        )}
      </View>
    </KitThemeProvider>
  );
}

function CoachNotice(props: NoticeProps) {
  return <Notice tone="coach" {...props} />;
}

function QuietNotice(props: NoticeProps) {
  return <Notice tone="quiet" {...props} />;
}

export { CoachNotice, QuietNotice };
export type { NoticeProps as CoachNoticeProps };
