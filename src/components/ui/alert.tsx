import { Icon } from './icon';
import { Text, TextClassContext } from './text';
import { cn } from './utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';

function Alert({
  className,
  variant,
  children,
  icon,
  iconClassName,
  ...props
}: ViewProps &
  React.RefAttributes<View> & {
    icon: LucideIcon;
    variant?: 'default' | 'destructive';
    iconClassName?: string;
  }) {
  return (
    // The text context carries only the alert's text styling. The container's own
    // className (its padding, edge and fill) must never reach the sentence: with
    // the notice's pr-14 in here the text got that padding a second time, so its
    // column was half as wide as the room between the icon and the close control
    // (LOC-683).
    <TextClassContext.Provider
      value={cn('text-sm text-foreground', variant === 'destructive' && 'text-destructive')}>
      <View
        role="alert"
        className={cn(
          'bg-card border-border relative w-full rounded-lg border px-4 pb-2 pt-3.5',
          className
        )}
        {...props}>
        <View className="absolute left-3.5 top-3">
          <Icon
            as={icon}
            className={cn('size-4', variant === 'destructive' && 'text-destructive', iconClassName)}
          />
        </View>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      className={cn('mb-1 ml-0.5 min-h-4 pl-6 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <Text
      className={cn(
        'text-muted-foreground ml-0.5 pb-1.5 pl-6 text-sm leading-relaxed',
        textClass?.includes('text-destructive') && 'text-destructive/90',
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
