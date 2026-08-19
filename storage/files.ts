import { computeWordCount } from '../pdf';
import type { Book } from '../pdf/types.ts';
import { copyInto, readText, removePrefix, writeText } from './kv';

export async function saveBookSource(id: string, sourceUri: string): Promise<string> {
  const res = await copyInto(`books/${id}/source.pdf`, sourceUri);
  return res || '';
}

export async function saveBookData(book: Book): Promise<void> {
  await writeText(`books/${book.id}/book.json`, JSON.stringify(book));
}

export async function ensureWordCounts(book: Book): Promise<Book> {
  if (!book.chapters || book.chapters.length === 0) return book;

  let modified = false;
  const updatedChapters = book.chapters.map((ch) => {
    if ((ch.wordCount === undefined || ch.wordCount === 0) && ch.blocks && ch.blocks.length > 0) {
      const computed = computeWordCount(ch.blocks);
      if (computed !== ch.wordCount) {
        modified = true;
        return { ...ch, wordCount: computed };
      }
    }
    return ch;
  });

  if (modified) {
    const updatedBook = { ...book, chapters: updatedChapters };
    await saveBookData(updatedBook);
    return updatedBook;
  }

  return book;
}

export async function readBookData(id: string): Promise<Book | null> {
  try {
    const content = await readText(`books/${id}/book.json`);
    if (!content) return null;
    const book = JSON.parse(content) as Book;
    return await ensureWordCounts(book);
  } catch {
    return null;
  }
}

export async function deleteBookFiles(id: string): Promise<void> {
  await removePrefix(`books/${id}/`);
}
