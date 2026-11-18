/**
 * CoachNotice: the Today screen's coach check-in notice, drawn with the kit's
 * Alert (kit trial 2, LOC-412; design rule 8).
 *
 * An amber-OUTLINED alert, not a filled banner: the card surface with a 1 px
 * amber edge, so amber marks "act here" and nothing more. It always carries an
 * icon and plain words, so it never relies on colour alone. The whole notice
 * is one button (the same tap as the old row); a notice that can be dismissed
 * has its own 48 dp close control beside it, never nested inside the button,
 * and one that cannot shows a chevron.
 *
 * Presentation only: the words, the tap and the dismissal come from
 * TodayLine and the arbiter behind it, unchanged. Safety messages (Beat UK
 * signposting, calm mode, ED-related copy) do not use this part in the trial.
 */
import { Alert, AlertDescription } from './alert';
import { Icon } from './icon';
import { KitThemeProvider } from './kit-theme-provider';
import { cn } from './utils';
import { Bell, ChevronRight, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

type CoachNoticeProps = {
  text: string;
  onPress?: () => void;
  onDismiss?: (() => void) | null;
  accessibilityLabel?: string;
  /** Show the sentence in full instead of clamping it at two lines. */
  wrap?: boolean;
  testID?: string;
};

function CoachNotice({ text, onPress, onDismiss, accessibilityLabel, wrap, testID }: CoachNoticeProps) {
  const label = accessibilityLabel || text;
  return (
    <KitThemeProvider>
    <View className="relative w-full">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}>
        <Alert
          icon={Bell}
          role="none"
          className={cn('border-ring bg-card', onDismiss ? 'pr-14' : 'pr-10')}>
          <AlertDescription className="text-foreground" numberOfLines={wrap ? undefined : 2}>
            {text}
          </AlertDescription>
        </Alert>
      </Pressable>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss: ${label}`}
          testID={testID ? `${testID}-dismiss` : undefined}
          className="absolute right-0 top-0 size-12 items-center justify-center">
          <Icon as={X} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : (
        <View
          pointerEvents="none"
          className="absolute right-3 top-0 h-full items-center justify-center">
          <Icon as={ChevronRight} size={16} className="text-foreground" />
        </View>
      )}
    </View>
    </KitThemeProvider>
  );
}

export { CoachNotice };
export type { CoachNoticeProps };
