import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
  // Keep track of pages processed in this viewing session to avoid redundant Tauri calls
  const processedPages = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Only proceed if we have a valid document and page number
    if (!pdfDocument || !documentId || typeof currentPageNumber !== 'number') return;

    // Check if we already processed this page in the current session
    if (processedPages.current.has(currentPageNumber)) return;

    // Capture the current page to ensure the timeout closure processes the correct one
    const pageToProcess = currentPageNumber;

    const timerId = setTimeout(async () => {
      try {
        console.log(`[usePageIndexer] Triggered text extraction for page ${pageToProcess}`);
        
        // 1. Asynchronously request the page from pdf.js
        const page = await pdfDocument.getPage(pageToProcess);
        
        // 2. Extract the raw text content items
        const textContent = await page.getTextContent();
        
        // 3. Reconstruct the page text from the text items
        const extractedText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        if (extractedText.trim().length === 0) {
          console.log(`[usePageIndexer] Page ${pageToProcess} is empty or scanned without OCR. Skipping.`);
          processedPages.current.add(pageToProcess);
          return;
        }

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
      clearTimeout(timerId);
    };
  }, [pdfDocument, currentPageNumber, documentId]);
}
