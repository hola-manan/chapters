// Deliberate use of expo-file-system/legacy API for chunked file reading and file ops
import * as FileSystem from 'expo-file-system/legacy';
import type { Book } from '../pdf/types.ts';
import { deleteBookFiles, readBookData, saveBookData, saveBookSource } from './files.ts';

const LIBRARY_INDEX_PATH = `${FileSystem.documentDirectory || ''}library.json`;

export async function listBooks(): Promise<Book[]> {
  try {
    const info = await FileSystem.getInfoAsync(LIBRARY_INDEX_PATH);
    if (!info.exists) {
      return [];
    }
    const content = await FileSystem.readAsStringAsync(LIBRARY_INDEX_PATH);
    const summaries = JSON.parse(content) as Array<{ id: string }>;

    const books: Book[] = [];
    for (const item of summaries) {
      const book = await readBookData(item.id);
      if (book) {
        books.push(book);
      }
    }
    return books;
  } catch {
    return [];
  }
}

export async function getBook(id: string): Promise<Book | null> {
  return readBookData(id);
}

export async function addBook(book: Book): Promise<void> {
  // Copy PDF from temporary picker cache to permanent book storage
  let permanentUri = book.sourceUri;
  try {
    permanentUri = await saveBookSource(book.id, book.sourceUri);
  } catch (e) {
    console.warn('Failed to copy source PDF to permanent directory', e);
  }

  const updatedBook: Book = { ...book, sourceUri: permanentUri };
  await saveBookData(updatedBook);

  const books = await listBooks();
  const filtered = books.filter((b) => b.id !== book.id);
  filtered.unshift(updatedBook);

  const indexData = filtered.map((b) => ({
    id: b.id,
    title: b.title,
    addedAt: b.addedAt,
  }));

  await FileSystem.writeAsStringAsync(LIBRARY_INDEX_PATH, JSON.stringify(indexData));
}

export async function removeBook(id: string): Promise<void> {
  await deleteBookFiles(id);

  const books = await listBooks();
  const filtered = books.filter((b) => b.id !== id);

  const indexData = filtered.map((b) => ({
    id: b.id,
    title: b.title,
    addedAt: b.addedAt,
  }));

  await FileSystem.writeAsStringAsync(LIBRARY_INDEX_PATH, JSON.stringify(indexData));
}
