import * as FileSystem from 'expo-file-system/legacy';
import type { ReadingSizeName } from '../design';

export type AppSettings = {
  readingSize: ReadingSizeName; // default 'default'
  themeMode: 'light' | 'dark' | 'system'; // default 'system'
};

const DEFAULT_SETTINGS: AppSettings = {
  readingSize: 'default',
  themeMode: 'system',
};

function getSettingsPath(): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}settings.json`;
}

export async function getSettings(): Promise<AppSettings> {
  const path = getSettingsPath();
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return DEFAULT_SETTINGS;
    const content = await FileSystem.readAsStringAsync(path);
    const raw = JSON.parse(content) as Record<string, unknown>;
    
    const readingSize: ReadingSizeName =
      raw.readingSize === 'small' || raw.readingSize === 'default' || raw.readingSize === 'large'
        ? raw.readingSize
        : 'default';

    const themeMode: 'light' | 'dark' | 'system' =
      raw.themeMode === 'light' || raw.themeMode === 'dark' || raw.themeMode === 'system'
        ? raw.themeMode
        : 'system';

    return { readingSize, themeMode };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let saveChain: Promise<void> = Promise.resolve();

export function saveSettings(settings: AppSettings): Promise<void> {
  saveChain = saveChain
    .then(async () => {
      const path = getSettingsPath();
      await FileSystem.writeAsStringAsync(path, JSON.stringify(settings));
    })
    .catch((err) => {
      console.warn('Failed to save settings:', err);
    });

  return saveChain;
}
