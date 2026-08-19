import type { ReadingSizeName } from '../design';
import { readText, writeText } from './kv';

export type AppSettings = {
  readingSize: ReadingSizeName; // default 'default'
  themeMode: 'light' | 'dark' | 'system'; // default 'system'
};

const DEFAULT_SETTINGS: AppSettings = {
  readingSize: 'default',
  themeMode: 'system',
};

const SETTINGS_KEY = 'settings.json';

export async function getSettings(): Promise<AppSettings> {
  try {
    const content = await readText(SETTINGS_KEY);
    if (!content) return DEFAULT_SETTINGS;
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
      await writeText(SETTINGS_KEY, JSON.stringify(settings));
    })
    .catch((err) => {
      console.warn('Failed to save settings:', err);
    });

  return saveChain;
}
