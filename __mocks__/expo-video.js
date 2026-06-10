// expo-video native module stub: the jest env has no expo-modules-core
// runtime (same reason as the other expo-* mocks here). The demo player is a
// side effect only; tests assert that the right branch renders, never playback.
const React = require('react');

function useVideoPlayer(_source, setup) {
  const player = {
    loop: false,
    muted: false,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
  };
  if (typeof setup === 'function') setup(player);
  return player;
}

function VideoView(props) {
  return React.createElement('VideoView', props, props.children);
}

module.exports = { useVideoPlayer, VideoView };
