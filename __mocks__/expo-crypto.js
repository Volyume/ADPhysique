// Test stub for expo-crypto. The real module's getRandomValues is backed by a
// native secure source; in Jest we fill the array with Math.random so uuid.js's
// CSPRNG code path runs without the native module. Mirrors the real API: fills
// the typed array in place and returns it.
function getRandomValues(typedArray) {
  for (let i = 0; i < typedArray.length; i += 1) {
    typedArray[i] = Math.floor(Math.random() * 256);
  }
  return typedArray;
}

function getRandomBytes(count) {
  return getRandomValues(new Uint8Array(count));
}

module.exports = { getRandomValues, getRandomBytes };
