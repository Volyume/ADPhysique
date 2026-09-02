import { getStateFromPath as getNavigationStateFromPath } from '@react-navigation/native';

// Deep links are attacker-controlled input. React Navigation 6's query parser
// reaches decode-uri-component, whose permissive malformed-input recovery is
// super-linear. Validate and bound the path before handing it to that parser.
const MAX_DEEP_LINK_PATH_LENGTH = 4096;
const MAX_DEEP_LINK_QUERY_LENGTH = 2048;

export function safeGetStateFromPath(path, options) {
  if (typeof path !== 'string' || path.length > MAX_DEEP_LINK_PATH_LENGTH) {
    return undefined;
  }

  const queryStart = path.indexOf('?');
  if (queryStart !== -1) {
    const hashStart = path.indexOf('#', queryStart + 1);
    const query = path.slice(
      queryStart + 1,
      hashStart === -1 ? path.length : hashStart,
    );

    if (query.length > MAX_DEEP_LINK_QUERY_LENGTH) return undefined;

    try {
      // This native decoder performs a linear validation pass and rejects
      // incomplete or invalid UTF-8 percent encodings before the vulnerable
      // dependency can attempt recovery.
      decodeURIComponent(query);
    } catch {
      return undefined;
    }
  }

  return getNavigationStateFromPath(path, options);
}
