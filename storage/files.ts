// Deliberate use of expo-file-system/legacy API for chunked file reading and file ops
import * as FileSystem from 'expo-file-system/legacy';
import type { Book } from '../pdf/types.ts';

function getBookDir(id: string): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}books/${id}/`;
}

export async function saveBookSource(id: string, sourceUri: string): Promise<string> {
  const dir = getBookDir(id);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const targetPath = `${dir}source.pdf`;
  await FileSystem.copyAsync({ from: sourceUri, to: targetPath });
  return targetPath;
}

export async function saveBookData(book: Book): Promise<void> {
  const dir = getBookDir(book.id);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const targetPath = `${dir}book.json`;
  await FileSystem.writeAsStringAsync(targetPath, JSON.stringify(book));
}

export async function readBookData(id: string): Promise<Book | null> {
  const targetPath = `${getBookDir(id)}book.json`;
  try {
    const info = await FileSystem.getInfoAsync(targetPath);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(targetPath);
    return JSON.parse(content) as Book;
  } catch {
    return null;
  }
}

export async function deleteBookFiles(id: string): Promise<void> {
  const dir = getBookDir(id);
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
  } catch {
    // Ignore if missing
  }
}
