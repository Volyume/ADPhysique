import * as FileSystem from 'expo-file-system/legacy';
import { copyPhotoStrippingExif } from './progressPhotos';

const BASE_DIR = `${FileSystem.documentDirectory}profile_avatars/`;

function safeUserPart(userId) {
  const raw = String(userId || '');
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(raw) ? raw : null;
}

export function profileAvatarDir() {
  return BASE_DIR;
}

export function isProfileAvatarUriForUser(userId, uri) {
  if (!userId || typeof uri !== 'string') return false;
  if (!uri.startsWith(BASE_DIR)) return false;
  const filename = uri.slice(BASE_DIR.length);
  const safe = safeUserPart(userId);
  if (!safe) return false;
  const owner = safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${owner}_\\d+\\.jpg$`, 'i').test(filename);
}

export async function saveAvatarPhoto(userId, srcUri, previousUri = null) {
  if (!userId || !srcUri) return null;
  const owner = safeUserPart(userId);
  if (!owner) throw new Error('Invalid profile-avatar owner id');
  await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true }).catch(() => {});
  const dest = `${BASE_DIR}${owner}_${Date.now()}.jpg`;
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

export async function wipeProfileAvatarsForUser(userId) {
  const owner = safeUserPart(userId);
  if (!owner) throw new Error('wipeProfileAvatarsForUser requires a valid user id');
  const info = await FileSystem.getInfoAsync(BASE_DIR);
  if (!info?.exists) return true;
  const names = await FileSystem.readDirectoryAsync(BASE_DIR);
  const owned = names.filter((name) => isProfileAvatarUriForUser(userId, `${BASE_DIR}${name}`));
  for (const name of owned) {
    // eslint-disable-next-line no-await-in-loop
    await FileSystem.deleteAsync(`${BASE_DIR}${name}`, { idempotent: true });
  }
  const residue = await FileSystem.readDirectoryAsync(BASE_DIR);
  if (residue.some((name) => isProfileAvatarUriForUser(userId, `${BASE_DIR}${name}`))) {
    throw new Error('Profile avatar residue remains after wipe');
  }
  return true;
}
