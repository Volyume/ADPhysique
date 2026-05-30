// Stub for react-native-url-polyfill/auto. The real module is shipped as
// untransformed ESM (`import {Platform} from 'react-native'`), which Jest's
// default transformIgnorePatterns leaves untransformed, so any suite that
// transitively imports src/lib/supabase.js (which does
// `import 'react-native-url-polyfill/auto'`) can hit a "Cannot use import
// statement outside a module" parse error. Whether it fired depended on
// worker/transform-cache ordering under parallel runs, which is why it
// surfaced as an intermittent failure. Mapping the module to this empty
// stub globally (moduleNameMapper) makes it deterministic: the polyfill is
// a no-op in the node test environment, where global URL already exists.
module.exports = {};
