// Stub for `@react-native-community/datetimepicker` (a native module that
// pulls native bindings, unavailable in the node test env). Mapped in via
// package.json jest.moduleNameMapper. Renders a locatable host element that
// carries its props, so a test can drive `onChange(event, date)` directly.
const React = require('react');

function DateTimePicker(props) {
  return React.createElement('DateTimePicker', props);
}

module.exports = DateTimePicker;
module.exports.__esModule = true;
module.exports.default = DateTimePicker;
module.exports.DateTimePickerAndroid = {
  open: jest.fn(),
  dismiss: jest.fn(),
};
