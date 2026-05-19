import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { usePdf } from "../hooks/usePdf"
import { useStore, type Highlight } from "../store"
import { convertFileSrc } from "@tauri-apps/api/core"
import { GlobalWorkerOptions } from "pdfjs-dist"

import {
  PdfLoader,
  PdfHighlighter,
  Highlight as PdfHighlight,
  AreaHighlight,
} from "react-pdf-highlighter"

import type { IHighlight, NewHighlight } from "react-pdf-highlighter"

// Internal sub-components
import { TooltipForm } from "./pdf/TooltipForm"
import { AddPageContextButton } from "./pdf/AddPageContextButton"
import { OutlineFetcher } from "./pdf/OutlineFetcher"
import { PageIndexer } from "./pdf/PageIndexer"
import { DocumentTabs } from "./pdf/DocumentTabs"
import { NoDocumentsState, SelectDocumentState } from "./pdf/EmptyState"

// Set PDF.js worker
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

const getNextId = () => crypto.randomUUID()

const resetHash = () => {
  window.location.hash = ""
}

const BEFORE_LOAD = (
  <div className="h-full w-full flex items-center justify-center text-muted-foreground gap-2">
    <Loader2 className="h-5 w-5 animate-spin" />
    Loading PDF content...
  </div>
)

const ERROR_MESSAGE = (
  <div className="h-full w-full flex items-center justify-center text-red-500 gap-2">
    <AlertCircle className="h-5 w-5" />
    Failed to load PDF. Check file permissions.
  </div>
)

interface ViewerContentProps {
  pdfDocument: any
  zoom: number
  handleHighlighterRef: (ref: any) => void
  handleScroll: () => void
  renderTooltip: any
  highlightTransform: any
  filteredHighlights: any[]
}

const ViewerContent = React.memo(({
  pdfDocument,
  zoom,
  handleHighlighterRef,
  handleScroll,
  renderTooltip,
  highlightTransform,
  filteredHighlights
}: ViewerContentProps) => {
  const zoomString = useMemo(() => zoom.toString(), [zoom])
  const enableAreaSelection = useCallback((event: any) => event.altKey, [])
  const scrollRef = useCallback(() => {}, [])

  return (
    <div className="h-full w-full relative">
      <AddPageContextButton />
      <PdfHighlighter
        ref={handleHighlighterRef}
        pdfDocument={pdfDocument}
        pdfScaleValue={zoomString}
        enableAreaSelection={enableAreaSelection}
        onScrollChange={handleScroll}
        scrollRef={scrollRef}
        onSelectionFinished={renderTooltip}
        highlightTransform={highlightTransform}
        highlights={filteredHighlights}
      />
      <OutlineFetcher pdfDocument={pdfDocument} />
      <PageIndexer pdfDocument={pdfDocument} />
    </div>
  )
})

ViewerContent.displayName = "ViewerContent"

export function PdfViewer() {
  const pdfInfo = useStore((state) => state.pdfInfo)
  const addChatContext = useStore((state) => state.addChatContext)
  const documents = useStore((state) => state.documents)
  const workspaces = useStore((state) => state.workspaces)
  const activeWorkspaceId = useStore((state) => state.activeWorkspaceId)
  const highlights = useStore((state) => state.highlights)
  const addHighlight = useStore((state) => state.addHighlight)
  const lastPdfPath = useStore((state) => state.lastPdfPath)
  const currentPage = useStore((state) => state.currentPage)
  const setCurrentPage = useStore((state) => state.setCurrentPage)
  const zoom = useStore((state) => state.zoom)

  const highlighterRef = useRef<any>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Memoize filtered highlights for performance
  const filteredHighlights = useMemo(() => 
    highlights.filter(h => h.documentPath === lastPdfPath) as IHighlight[],
    [highlights, lastPdfPath]
  )

  const activeWorkspace = useMemo(() => 
    workspaces.find(w => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  )
  const isQuickRead = activeWorkspace?.type === "quick_read"

  // Handle document URL conversion
  useEffect(() => {
    if (lastPdfPath) {
      try {
        const url = convertFileSrc(lastPdfPath)
        setDocumentUrl(url)
        setLoadError(null)
      } catch (e) {
        console.error("Failed to convert PDF path to URL:", e)
        setLoadError("Failed to access document path.")
      }
    } else {
      setDocumentUrl(null)
    }
  }, [lastPdfPath])

  // Sync zoom changes to the viewer
  useEffect(() => {
    if (highlighterRef.current?.viewer) {
      highlighterRef.current.viewer.currentScaleValue = zoom.toString()
    }
  }, [zoom])

  // Sync page changes from store to viewer (e.g. from sidebar)
  useEffect(() => {
    if (highlighterRef.current?.viewer) {
      const viewerPage = highlighterRef.current.viewer.currentPageNumber
      if (viewerPage && viewerPage - 1 !== currentPage) {
        highlighterRef.current.viewer.currentPageNumber = currentPage + 1
      }
    }
  }, [currentPage])

  const handleScroll = useCallback(() => {
    resetHash()
    if (highlighterRef.current?.viewer) {
      const pageNum = highlighterRef.current.viewer.currentPageNumber
      if (pageNum && pageNum - 1 !== useStore.getState().currentPage) {
        useStore.getState().setCurrentPage(pageNum - 1)
      }
    }
  }, [])

  const addHighlightToStore = useCallback((highlight: NewHighlight) => {
    const currentPath = useStore.getState().lastPdfPath
    if (!currentPath) return
    const id = getNextId()
    const newHighlight = { ...highlight, id, documentPath: currentPath } as Highlight
    useStore.getState().addHighlight(newHighlight)
  }, [])

  // Handle PDF Highlighter ref and events
  const handleHighlighterRef = useCallback((ref: any) => {
    highlighterRef.current = ref
    if (ref?.viewer?.eventBus) {
      const eventBus = ref.viewer.eventBus as any
      if (!eventBus._boundPageChanging) {
        eventBus._boundPageChanging = true
        
        // Update store when page changes in the viewer
        eventBus.on("pagechanging", (evt: { pageNumber: number }) => {
          const newPage = evt.pageNumber - 1
          if (newPage !== useStore.getState().currentPage) {
            useStore.getState().setCurrentPage(newPage)
          }
        })

        // Ensure we jump to the correct page on load
        eventBus.on("pagesinit", () => {
          const targetPage = useStore.getState().currentPage
          if (targetPage > 0 && ref.viewer) {
            setTimeout(() => {
              if (ref.viewer) {
                ref.viewer.currentPageNumber = targetPage + 1
              }
            }, 50)
          }
        })
      }
    }
  }, [])

  const renderTooltip = useCallback((
    position: any,
    content: any,
    hideTipAndSelection: any,
    transformSelection: any
  ) => (
    <TooltipForm
      content={content}
      position={position}
      hideTipAndSelection={hideTipAndSelection}
      transformSelection={transformSelection}
      addHighlightToStore={addHighlightToStore}
      addChatContext={addChatContext}
    />
  ), [addHighlightToStore, addChatContext])

  const highlightTransform = useCallback((
    highlight: any,
    _index: number,
    _setTip: any,
    _hideTip: any,
    _viewportToScaled: any,
    _screenshot: any,
    isScrolledTo: boolean
  ) => {
    const isTextHighlight = !Boolean(
      highlight.content && highlight.content.image
    )

    return isTextHighlight ? (
      <PdfHighlight
        isScrolledTo={isScrolledTo}
        position={highlight.position}
        comment={highlight.comment}
      />
    ) : (
      <AreaHighlight
        isScrolledTo={isScrolledTo}
        highlight={highlight}
        onChange={() => {}}
      />
    )
  }, [])

  // Empty states
  if (documents.length === 0 && !pdfInfo) {
    return <NoDocumentsState />
  }

  if (!pdfInfo && documents.length > 0) {
    return <SelectDocumentState documents={documents} />
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#F9F9FB]">
      {!isQuickRead && (
        <DocumentTabs documents={documents} activePdfName={pdfInfo?.fileName} />
      )}

      <div className="flex-1 relative bg-white">
        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{loadError}</span>
          </div>
        ) : documentUrl ? (
          <div className="absolute inset-0">
            <PdfLoader 
              url={documentUrl} 
              beforeLoad={BEFORE_LOAD}
              errorMessage={ERROR_MESSAGE}
            >
              {(pdfDocument) => (
                <ViewerContent 
                  pdfDocument={pdfDocument}
                  zoom={zoom}
                  handleHighlighterRef={handleHighlighterRef}
                  handleScroll={handleScroll}
                  renderTooltip={renderTooltip}
                  highlightTransform={highlightTransform}
                  filteredHighlights={filteredHighlights}
                />
              )}
            </PdfLoader>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2">
            Preparing document...
          </div>
        )}
      </div>
    </div>
  )
}
