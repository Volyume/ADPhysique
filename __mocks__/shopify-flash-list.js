// Manual mock for @shopify/flash-list (E8). Tests render the same
// passthrough host the react-native manual mock uses for FlatList, so a
// screen converted to FlashList keeps identical test behaviour (items are
// carried as props, not rendered). Wired via jest moduleNameMapper.
const { FlatList } = require('react-native');

module.exports = {
  FlashList: FlatList,
  AnimatedFlashList: FlatList,
};
