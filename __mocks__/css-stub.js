// Jest stand-in for a `.css` import (the kit trial's global.css, LOC-411).
// On device NativeWind's Metro transformer turns that import into the
// compiled kit stylesheet; Jest cannot, so kit tests that need real styles
// compile and inject them themselves (src/components/ui/__tests__/kitTestEnv.js).
module.exports = {};
