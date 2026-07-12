/**
 * SetRowMenu — the zeego long-press menu wrap around a logged-set row
 * (campaign item 14, D25), platform-forked after the iOS TestFlight
 * crash-loop (Sentry VOLYUME-1X, 2026-07-12, build 40).
 *
 * This file is the Android (and default) variant: the zeego native
 * long-press menu, exactly as it lived inline in LoggedSetRow before the
 * fork. SetRowMenu.ios.js is the iOS variant and renders the bare row with
 * no menu: react-native-ios-context-menu's native layer
 * (react-native-ios-utilities, RNIBaseView) throws a fatal
 * NSUnknownKeyException ("reactPropHandler" on a plain RCTView) during
 * Fabric component-descriptor registration at app START on RN 0.81, before
 * any long-press ever happens. Both packages are also excluded from iOS
 * autolinking in react-native.config.js, so the iOS bundle must never
 * import zeego/context-menu — keep every zeego import inside THIS file.
 *
 * No functionality is lost on iOS: the menu's two actions mirror the row's
 * own tap affordance (the edit sheet, which carries delete).
 */
import * as ContextMenu from 'zeego/context-menu';

export default function SetRowMenu({ rowStyle, set, onEdit, onDelete, children }) {
  return (
    <ContextMenu.Root>
      {/* `style={rowStyle}` here is NOT decorative -- see rowStyle's comment
          in LoggedSetRow. zeego's asChild clobber overwrites the cloned row's
          style with whatever the Trigger itself was given, so the Trigger
          must carry the row's own array or the row loses its layout. */}
      <ContextMenu.Trigger action="longPress" asChild style={rowStyle}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item key="edit-set" onSelect={() => onEdit(set)}>
          <ContextMenu.ItemTitle>Edit set</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key="delete-set" destructive onSelect={() => onDelete(set)}>
          <ContextMenu.ItemTitle>Delete set</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
