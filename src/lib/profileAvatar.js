import * as FileSystem from 'expo-file-system/legacy';

const BASE_DIR = `${FileSystem.documentDirectory}profile_avatars/`;

function safeUserPart(userId) {
  return String(userId || 'local').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extensionOf(uri) {
  const match = String(uri || '').match(/\.([a-zA-Z0-9]{3,5})(?:\?|#|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

export async function saveAvatarPhoto(userId, srcUri, previousUri = null) {
  if (!srcUri) return null;
  await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true }).catch(() => {});
  const dest = `${BASE_DIR}${safeUserPart(userId)}_${Date.now()}.${extensionOf(srcUri)}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  if (previousUri && previousUri !== dest) {
    await FileSystem.deleteAsync(previousUri, { idempotent: true }).catch(() => {});
  }
  return dest;
}

export async function deleteAvatarPhoto(uri) {
  if (!uri) return true;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch (_) {
    return false;
  }
}
