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

const React = require('react');

function passthroughChildren({ children }) {
  return React.createElement(React.Fragment, null, children);
}

// Trigger with asChild renders its single child directly (mirrors the real
// library's asChild contract) so the wrapped row's own onPress/accessibility
// props are untouched in tests.
function Trigger({ children }) {
  return children ?? null;
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
