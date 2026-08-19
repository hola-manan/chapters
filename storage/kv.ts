// Deliberate use of expo-file-system/legacy API for file operations
import * as FileSystem from 'expo-file-system/legacy';

function getFullPath(key: string): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}${key}`;
}

export async function readText(key: string): Promise<string | null> {
  const fullPath = getFullPath(key);
  try {
    const info = await FileSystem.getInfoAsync(fullPath);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(fullPath);
  } catch {
    return null;
  }
}

export async function writeText(key: string, value: string): Promise<void> {
  const fullPath = getFullPath(key);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
  if (dir) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(fullPath, value);
}

export async function exists(key: string): Promise<boolean> {
  const fullPath = getFullPath(key);
  try {
    const info = await FileSystem.getInfoAsync(fullPath);
    return info.exists;
  } catch {
    return false;
  }
}

export async function remove(key: string): Promise<void> {
  const fullPath = getFullPath(key);
  try {
    const info = await FileSystem.getInfoAsync(fullPath);
    if (info.exists) {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    }
  } catch {
    // Ignore if missing
  }
}

export async function removePrefix(prefix: string): Promise<void> {
  const fullPath = getFullPath(prefix);
  try {
    const info = await FileSystem.getInfoAsync(fullPath);
    if (info.exists) {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
      return;
    }
    const altPath = prefix.endsWith('/') ? fullPath.slice(0, -1) : `${fullPath}/`;
    const altInfo = await FileSystem.getInfoAsync(altPath);
    if (altInfo.exists) {
      await FileSystem.deleteAsync(altPath, { idempotent: true });
    }
  } catch {
    // Ignore if missing
  }
}

export async function copyInto(key: string, sourceUri: string): Promise<string | null> {
  const fullPath = getFullPath(key);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
  if (dir) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  await FileSystem.copyAsync({ from: sourceUri, to: fullPath });
  return fullPath;
}
