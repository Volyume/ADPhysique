import * as FileSystem from 'expo-file-system/legacy';
import { copyPhotoStrippingExif } from './progressPhotos';

const BASE_DIR = `${FileSystem.documentDirectory}profile_avatars/`;

function safeUserPart(userId) {
  return String(userId || 'local').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function profileAvatarDir() {
  return BASE_DIR;
}

export function isProfileAvatarUriForUser(userId, uri) {
  if (!userId || typeof uri !== 'string') return false;
  if (!uri.startsWith(BASE_DIR)) return false;
  const filename = uri.slice(BASE_DIR.length);
  const owner = safeUserPart(userId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${owner}_\\d+\\.(?:jpe?g|png|webp|heic)$`, 'i').test(filename);
}

export async function saveAvatarPhoto(userId, srcUri, previousUri = null) {
  if (!userId || !srcUri) return null;
  await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true }).catch(() => {});
  const dest = `${BASE_DIR}${safeUserPart(userId)}_${Date.now()}.jpg`;
  await copyPhotoStrippingExif(srcUri, dest);
  if (previousUri && previousUri !== dest && isProfileAvatarUriForUser(userId, previousUri)) {
    await FileSystem.deleteAsync(previousUri, { idempotent: true }).catch(() => {});
  }
  return dest;
}

export async function deleteAvatarPhoto(userId, uri) {
  if (!uri) return true;
  if (!isProfileAvatarUriForUser(userId, uri)) return false;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch (_) {
    return false;
  }
}
