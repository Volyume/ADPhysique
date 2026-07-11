// Manual mock for zeego/context-menu (campaign item 14, D25 — first surface:
// long-press menu on ActiveWorkoutScreen's logged-set rows). Automatically
// applied by Jest for the exact subpath specifier 'zeego/context-menu'
// (node_modules-relative __mocks__ folder mirrors the real package's own
// subpath layout, same convention as __mocks__/@gorhom/bottom-sheet.js and
// __mocks__/@expo/vector-icons.js for scoped packages in this directory).
//
// The real package resolves 'zeego/context-menu' to an ESM re-export of its
// native (iOS: react-native-ios-context-menu, Android: @react-native-menu/
// menu) implementation — none of that native surface matters to unit tests,
// which only assert that the menu items exist and their onSelect fires the
// same handlers the row's own tap-to-edit sheet already uses. Rendered as
// plain host elements, Root/Trigger/Content passthrough their children so a
// wrapped TouchableOpacity (the Trigger's `asChild` target) keeps its own
// press behaviour and props exactly as the real library preserves them.
//
// Trigger is the one exception (founder defect 2026-07-11, zeego 3.0.6 asChild
// clobber -- see LoggedSetRow's rowStyle comment in ActiveWorkoutScreen.js):
// the real library's asChild Trigger (Android AND iOS) does
// `cloneElement(children, { style, ...props })`, which OVERWRITES the
// child's own `style` prop with the Trigger's own `style` prop (undefined if
// the caller didn't pass one). A passthrough mock would never exercise this
// failure mode, so Trigger below deliberately reproduces the clobber rather
// than being a no-op -- a caller that forgets to forward its row's style
// onto the Trigger will lose that style in tests exactly as it does on
// device.

const React = require('react');

function passthroughChildren({ children }) {
  return React.createElement(React.Fragment, null, children);
}

// Trigger with asChild clones its single child and overwrites the clone's
// `style` prop with the Trigger's own `style` prop (mirrors the real
// library's cloneElement(children, { style, ...props }) -- see header
// comment above). If the Trigger receives no `style` of its own, this
// reproduces the real clobber (child style -> undefined).
function Trigger({ children, style }) {
  if (!children) return null;
  return React.cloneElement(children, { style });
}

function passthrough(name) {
  const Comp = ({ children, ...props }) => React.createElement(name, props, children);
  Comp.displayName = name;
  return Comp;
}

const mock = {
  Root: passthroughChildren,
  Trigger,
  Content: passthroughChildren,
  Item: passthrough('ContextMenuItem'),
  ItemTitle: passthrough('ContextMenuItemTitle'),
  ItemSubtitle: passthrough('ContextMenuItemSubtitle'),
  ItemIcon: passthrough('ContextMenuItemIcon'),
  ItemImage: passthrough('ContextMenuItemImage'),
  ItemIndicator: passthrough('ContextMenuItemIndicator'),
  Group: passthroughChildren,
  Separator: passthrough('ContextMenuSeparator'),
  CheckboxItem: passthrough('ContextMenuCheckboxItem'),
  Label: passthrough('ContextMenuLabel'),
  Preview: passthrough('ContextMenuPreview'),
  Arrow: passthrough('ContextMenuArrow'),
  Sub: passthroughChildren,
  SubTrigger: passthrough('ContextMenuSubTrigger'),
  SubContent: passthroughChildren,
  Auxiliary: passthroughChildren,
  create: (Comp) => Comp,
};

module.exports = mock;
