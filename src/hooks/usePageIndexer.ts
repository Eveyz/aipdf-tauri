import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';

/**
 * Custom hook to asynchronously index PDF pages for RAG.
 * Uses a 1500ms debounce so that we only extract text and generate embeddings
 * if the user actually stops to read a specific page.
 */
export function usePageIndexer(
  pdfDocument: any | null,
  currentPageNumber: number,
  documentId: string | null
) {
  const { activeEmbeddingModel } = useStore();
  // Keep track of pages processed in this viewing session to avoid redundant Tauri calls
  const processedPages = useRef<Set<number>>(new Set());

  // Reset processed pages when switching documents
  const lastDocId = useRef<string | null>(null);
  if (documentId !== lastDocId.current) {
    processedPages.current.clear();
    lastDocId.current = documentId;
  }

  useEffect(() => {
    console.log(`[usePageIndexer] useEffect triggered for page ${currentPageNumber}, doc ${documentId}`);
    
    // Only proceed if we have a valid document and page number
    if (!pdfDocument || !documentId || typeof currentPageNumber !== 'number') {
      console.log(`[usePageIndexer] Skipping: pdfDocument=${!!pdfDocument}, documentId=${documentId}, page=${currentPageNumber}`);
      return;
    }

    if (!activeEmbeddingModel) {
      console.log(`[usePageIndexer] Skipping: No embedding model active.`);
      return;
    }

    // Check if we already processed this page in the current session
    if (processedPages.current.has(currentPageNumber)) {
      console.log(`[usePageIndexer] Page ${currentPageNumber} already processed this session. Skipping.`);
      return;
    }

    // Capture the current page to ensure the timeout closure processes the correct one
    const pageToProcess = currentPageNumber;
    console.log(`[usePageIndexer] Starting 1500ms timer for page ${pageToProcess}`);

    const timerId = setTimeout(async () => {
      try {
        console.log(`[usePageIndexer] Timer finished. Checking if page ${pageToProcess} is already indexed.`);
        
        // Check backend DB for actual persistence
        const isAlreadyIndexed = await invoke<boolean>('check_page_indexed', {
          docId: documentId,
          pageNum: pageToProcess,
        });

        if (isAlreadyIndexed) {
          console.log(`[usePageIndexer] Page ${pageToProcess} already in DB. Skipping.`);
          processedPages.current.add(pageToProcess);
          return;
        }

        console.log(`[usePageIndexer] Triggering text extraction for page ${pageToProcess}`);
        
        // 1. Asynchronously request the page from pdf.js (getPage is 1-indexed)
        const page = await pdfDocument.getPage(pageToProcess + 1);
        console.log(`[usePageIndexer] Got page ${pageToProcess + 1} from pdf.js`);
        
        // 2. Extract the raw text content items
        const textContent = await page.getTextContent();
        console.log(`[usePageIndexer] Got text content for page ${pageToProcess}, items count: ${textContent.items.length}`);
        
        // 3. Reconstruct the page text from the text items
        const extractedText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        if (extractedText.trim().length === 0) {
          console.log(`[usePageIndexer] Page ${pageToProcess} is empty or scanned without OCR. Skipping.`);
          processedPages.current.add(pageToProcess);
          return;
        }

        console.log(`[usePageIndexer] Sending ${extractedText.length} chars to backend for page ${pageToProcess}`);

        // 4. Send the text off to the Rust backend to be chunked, embedded, and stored
        await invoke('process_pdf_page', {
          docId: documentId,
          pageNum: pageToProcess,
          textContent: extractedText,
        });

        // 5. Mark as successfully processed
        processedPages.current.add(pageToProcess);
        console.log(`[usePageIndexer] Page ${pageToProcess} indexed into VectorDB successfully.`);
      } catch (error) {
        console.error(`[usePageIndexer] Failed to process page ${pageToProcess} for RAG:`, error);
      }
    }, 1500);

    // Cleanup: If the user navigates away before 1500ms, cancel the indexing operation
    return () => {
      console.log(`[usePageIndexer] Cleanup: clearing timer for page ${pageToProcess}`);
      clearTimeout(timerId);
    };
  }, [pdfDocument, currentPageNumber, documentId]);
}
