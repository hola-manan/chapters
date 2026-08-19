import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { parsePdf } from '../../pdf';
import { addBook } from '../../storage';
import { useToast } from '../../ui';

export type ImportState =
  | { status: 'idle' }
  | { status: 'importing'; fileName: string; stage: string; pct: number }
  | { status: 'error'; fileName: string; message: string };

export type ImportContextValue = {
  state: ImportState;
  startImport: () => Promise<void>;
  dismissError: () => void;
  lastCompletedAt?: number;
};

const ImportContext = createContext<ImportContextValue | null>(null);

export function ImportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [lastCompletedAt, setLastCompletedAt] = useState<number | undefined>(undefined);
  const isImportingRef = useRef(false);
  const router = useRouter();
  const toast = useToast();

  const dismissError = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const startImport = useCallback(async () => {
    // The ref, not state, is the guard: startImport must not be re-created on every progress
    // tick, and reading state here would put it back in the dependency list.
    if (isImportingRef.current) {
      return;
    }
    // Claimed before the picker opens, not after it resolves, so the whole flow is covered.
    // The finally block releases it on every path, cancellation included.
    isImportingRef.current = true;

    let rawFileName = 'Document';

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const asset = res.assets[0];
      rawFileName = asset.name || asset.uri.split('/').pop() || 'Document.pdf';
      try {
        rawFileName = decodeURIComponent(rawFileName);
      } catch {
        // Keep rawFileName
      }

      setState({
        status: 'importing',
        fileName: rawFileName,
        stage: 'reading',
        pct: 0,
      });

      const parsedBook = await parsePdf(asset.uri, (stage, pct) => {
        setState({
          status: 'importing',
          fileName: rawFileName,
          stage,
          pct,
        });
      });

      // Only readable books enter the library. A PDF with no text layer cannot be
      // reflowed at all, so it is rejected at import rather than added as a book
      // that can never be opened.
      if (parsedBook.status === 'no-text-layer') {
        setState({
          status: 'error',
          fileName: rawFileName,
          message: `“${parsedBook.title}” is scanned page images, not text. There is nothing to display.`,
        });
        return;
      }
      if (parsedBook.status === 'failed') {
        setState({
          status: 'error',
          fileName: rawFileName,
          message: `“${parsedBook.title}” could not be read.${parsedBook.error ? ` ${parsedBook.error}` : ''}`,
        });
        return;
      }

      await addBook(parsedBook);
      setLastCompletedAt(Date.now());
      setState({ status: 'idle' });

      toast.show({
        message: `“${parsedBook.title}” is ready`,
        onPress: () => {
          router.push(`/book/${parsedBook.id}`);
        },
      });
    } catch (err) {
      setState({
        status: 'error',
        fileName: rawFileName,
        message: err instanceof Error ? err.message : 'Failed to import PDF',
      });
    } finally {
      isImportingRef.current = false;
    }
  }, [toast, router]);

  return (
    <ImportContext.Provider value={{ state, startImport, dismissError, lastCompletedAt }}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport(): ImportContextValue {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
}
