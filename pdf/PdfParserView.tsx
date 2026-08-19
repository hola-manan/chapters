import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { PDF_JS_SOURCE } from './pdfJsSource.ts';
import { PDF_WORKER_JS_SOURCE } from './pdfWorkerSource.ts';
import { handleFileRequest, handleParserMessage, registerPdfParserRef } from './parse.ts';

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<script>
  window.PDF_JS_SOURCE = ${JSON.stringify(PDF_JS_SOURCE)};
  window.PDF_WORKER_JS_SOURCE = ${JSON.stringify(PDF_WORKER_JS_SOURCE)};
</script>
<script>
  // WebKit does not implement async iteration on ReadableStream, and pdf.js v6's
  // PDFPageProxy.getTextContent() does 'for await (const value of readableStream)'.
  // Without this shim every getTextContent() call throws
  // "undefined is not a function" and the document looks like it has no text layer.
  // Must be installed before pdf.js is imported.
  if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
    ReadableStream.prototype[Symbol.asyncIterator] = function (options) {
      const preventCancel = !!(options && options.preventCancel);
      const reader = this.getReader();
      return {
        next() {
          return reader.read().then(function (result) {
            if (result.done) {
              reader.releaseLock();
              return { done: true, value: undefined };
            }
            return { done: false, value: result.value };
          });
        },
        return(value) {
          if (!preventCancel) { reader.cancel(value); }
          reader.releaseLock();
          return Promise.resolve({ done: true, value: value });
        },
        throw(err) {
          reader.cancel(err);
          reader.releaseLock();
          return Promise.reject(err);
        },
        [Symbol.asyncIterator]() { return this; },
      };
    };
    ReadableStream.prototype.values = ReadableStream.prototype[Symbol.asyncIterator];
  }
</script>
<script>
  (async function() {
    try {
      const mainBlob = new Blob([window.PDF_JS_SOURCE], { type: 'application/javascript' });
      const mainUrl = URL.createObjectURL(mainBlob);
      const pdfjsLib = await import(mainUrl);

      const workerBlob = new Blob([window.PDF_WORKER_JS_SOURCE], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      window.pdfjsLib = pdfjsLib;

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    } catch(err) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: err ? err.message : String(err) }));
      }
    }
  })();

  const pendingFileRequests = new Map();

  function postRN(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  window.addEventListener('message', function(event) {
    handleIncomingCommand(event.data);
  });

  document.addEventListener('message', function(event) {
    handleIncomingCommand(event.data);
  });

  function handleIncomingCommand(raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data.command === 'parse') {
        parsePdfDocument(data.id, data.uri);
      } else if (data.command === 'file_chunk') {
        const record = pendingFileRequests.get(data.id);
        if (record) {
          record.chunksMap[data.index] = data.chunkBase64;
          record.received++;
          if (record.received >= data.totalChunks && record.resolve) {
            pendingFileRequests.delete(data.id);
            let totalLen = 0;
            const decodedStrings = [];
            for (let i = 0; i < data.totalChunks; i++) {
              const bin = atob(record.chunksMap[i] || '');
              decodedStrings.push(bin);
              totalLen += bin.length;
            }
            const bytes = new Uint8Array(totalLen);
            let offset = 0;
            for (let i = 0; i < decodedStrings.length; i++) {
              const bin = decodedStrings[i];
              for (let j = 0; j < bin.length; j++) {
                bytes[offset + j] = bin.charCodeAt(j);
              }
              offset += bin.length;
            }
            record.resolve(bytes);
          }
        }
      } else if (data.command === 'file_error') {
        const record = pendingFileRequests.get(data.id);
        if (record && record.reject) {
          pendingFileRequests.delete(data.id);
          record.reject(new Error(data.error));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function parsePdfDocument(id, uri) {
    try {
      postRN({ id, type: 'progress', stage: 'reading', pct: 0 });

      let pdfData = null;
      let pdfUrl = uri;

      try {
        const res = await fetch(uri);
        const buf = await res.arrayBuffer();
        pdfData = new Uint8Array(buf);
      } catch (fetchErr) {
        postRN({ id, type: 'need_file_data', uri });
        const bytes = await new Promise((resolve, reject) => {
          pendingFileRequests.set(id, { chunksMap: {}, received: 0, resolve, reject });
        });
        pdfData = bytes;
      }

      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfData || undefined,
        url: pdfData ? undefined : pdfUrl,
        isEvalSupported: false,
      });

      const doc = await loadingTask.promise;
      const numPages = doc.numPages;

      postRN({ id, type: 'progress', stage: 'parsing', pct: 10 });

      // 1. Detect no-text-layer early: sample ~10 pages across document
      const sampleIndices = [];
      const sampleCount = Math.min(10, numPages);
      for (let i = 0; i < sampleCount; i++) {
        const pageNum = Math.floor(1 + (i * (numPages - 1)) / Math.max(1, sampleCount - 1));
        sampleIndices.push(pageNum);
      }

      let totalSampleChars = 0;
      let sampleErrorCount = 0;
      let firstSampleError = null;

      for (const pNum of sampleIndices) {
        try {
          const page = await doc.getPage(pNum);
          const content = await page.getTextContent();
          for (const item of content.items) {
            totalSampleChars += (item.str || '').trim().length;
          }
          page.cleanup();
        } catch (e) {
          sampleErrorCount++;
          if (!firstSampleError) {
            firstSampleError = e ? (e.message || String(e)) : 'Page reading error';
          }
        }
      }

      let rawOutline = [];
      try {
        const outlineData = await doc.getOutline();
        if (outlineData) {
          rawOutline = await processOutline(doc, outlineData);
        }
      } catch (e) {}

      let metadataTitle = '';
      try {
        const meta = await doc.getMetadata();
        if (meta && meta.info && typeof meta.info.Title === 'string') {
          metadataTitle = meta.info.Title;
        }
      } catch (e) {}

      if (sampleErrorCount === sampleIndices.length) {
        loadingTask.destroy();
        postRN({
          id,
          type: 'result',
          status: 'failed',
          error: firstSampleError || 'Failed to read text from sampled pages',
          numPages,
          outline: rawOutline,
          metadataTitle,
        });
        return;
      }

      if (totalSampleChars < 200) {
        loadingTask.destroy();
        postRN({
          id,
          type: 'result',
          status: 'no-text-layer',
          numPages,
          outline: rawOutline,
          metadataTitle,
        });
        return;
      }

      // 2. Full text extraction across all pages - streamed in chunks of ~25 pages
      let currentChunkRuns = [];
      for (let pNum = 1; pNum <= numPages; pNum++) {
        const page = await doc.getPage(pNum);
        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
          if (!item.str || !item.transform) continue;
          const tr = item.transform;
          const x = tr[4];
          const y = tr[5];
          const size = Math.hypot(tr[1], tr[3]) || Math.abs(tr[0]) || 10;

          currentChunkRuns.push({
            str: item.str,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            size: Math.round(size * 10) / 10,
            fontName: item.fontName || '',
            page: pNum,
          });
        }

        page.cleanup();

        if (pNum % 25 === 0 || pNum === numPages) {
          postRN({ id, type: 'runs_chunk', runs: currentChunkRuns });
          currentChunkRuns = [];
          const pct = Math.round(10 + (pNum / numPages) * 80);
          postRN({ id, type: 'progress', stage: 'parsing', pct });
        }
      }

      postRN({ id, type: 'progress', stage: 'detecting', pct: 95 });
      loadingTask.destroy();

      // Final result carries numPages, status, outline, metadataTitle - NOT runs
      postRN({
        id,
        type: 'result',
        status: 'ready',
        numPages,
        outline: rawOutline,
        metadataTitle,
      });
    } catch (err) {
      postRN({ id, type: 'error', error: err ? err.message || String(err) : 'Parse error' });
    }
  }

  async function processOutline(doc, outlineItems) {
    const result = [];
    for (const item of outlineItems) {
      let pageNum = 1;
      try {
        if (typeof item.dest === 'string') {
          const dest = await doc.getDestination(item.dest);
          if (dest && dest[0]) {
            const pageIdx = await doc.getPageIndex(dest[0]);
            pageNum = pageIdx + 1;
          }
        } else if (Array.isArray(item.dest) && item.dest[0]) {
          const pageIdx = await doc.getPageIndex(item.dest[0]);
          pageNum = pageIdx + 1;
        }
      } catch (e) {}

      const children = item.items && item.items.length > 0 ? await processOutline(doc, item.items) : undefined;
      result.push({
        title: item.title || 'Untitled',
        page: pageNum,
        children,
      });
    }
    return result;
  }
</script>
</body>
</html>
`;

export function PdfParserView() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    registerPdfParserRef({
      postCommand: (cmd: unknown) => {
        const jsonStr = JSON.stringify(cmd);
        webViewRef.current?.postMessage(jsonStr);
      },
    });

    return () => {
      registerPdfParserRef(null);
    };
  }, []);

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'need_file_data' && data.id && data.uri) {
        handleFileRequest(data.id, data.uri);
      } else {
        handleParserMessage(data);
      }
    } catch {
      // Ignore invalid messages
    }
  };

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'file://' }}
        allowingReadAccessToURL="file://"
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
  },
});
