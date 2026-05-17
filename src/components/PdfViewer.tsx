import { useEffect, useState, useRef } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { Plus, FilePlus, Loader2, AlertCircle, Edit2, Languages } from "lucide-react"
import { usePdf } from "../hooks/usePdf"
import { useStore, type Highlight } from "../store"
import { cn } from "../lib/utils"
import { convertFileSrc } from "@tauri-apps/api/core"
import { GlobalWorkerOptions } from "pdfjs-dist"

import {
  PdfLoader,
  PdfHighlighter,
  Highlight as PdfHighlight,
  AreaHighlight,
} from "react-pdf-highlighter"

import type {
  IHighlight,
  NewHighlight,
} from "react-pdf-highlighter"

// Set PDF.js worker
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

const getNextId = () => crypto.randomUUID()

const resetHash = () => {
  window.location.hash = ""
}

import { useAi } from "../hooks/useAi"
import { usePageIndexer } from "../hooks/usePageIndexer"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function PageIndexer({ pdfDocument }: { pdfDocument: any }) {
  const { currentPage, lastPdfPath } = useStore()
  usePageIndexer(pdfDocument, currentPage, lastPdfPath)
  return null
}

function AddPageContextButton() {
  const { currentPage, pdfInfo, addChatContext, setChatOpen } = useStore()
  const { getPageText } = usePdf()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddPage = async () => {
    if (!pdfInfo || isAdding) return
    setIsAdding(true)
    try {
      const result = await getPageText(currentPage)
      addChatContext({
        type: "page",
        content: result.full_text,
        label: `Page ${currentPage + 1} (${pdfInfo.fileName})`,
        id: crypto.randomUUID(),
      })
      setChatOpen(true)
    } catch (e) {
      console.error("Failed to add page context:", e)
    } finally {
      setIsAdding(false)
    }
  }

  if (!pdfInfo) return null

  return (
    <button
      onClick={handleAddPage}
      disabled={isAdding}
      className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-white transition-all text-xs font-medium text-gray-700 group"
    >
      {isAdding ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
      ) : (
        <FilePlus className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
      )}
      <span>Add Page to Chat</span>
    </button>
  )
}

interface TooltipFormProps {
  content: { text?: string; image?: string }
  position: any
  hideTipAndSelection: () => void
  transformSelection: () => void
  addHighlightToStore: (h: NewHighlight) => void
  addChatContext: (c: any) => void
}

function TooltipForm({
  content,
  position,
  hideTipAndSelection,
  transformSelection,
  addHighlightToStore,
  addChatContext
}: TooltipFormProps) {
  const [mode, setMode] = useState<"menu" | "note" | "translate">("menu")
  const [noteText, setNoteText] = useState("")
  const [translation, setTranslation] = useState<string>("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [targetLang, setTargetLang] = useState("English")
  const { translateText, loadedModel } = useAi()

  const handleTranslate = async (lang: string) => {
    if (!content.text) return
    setTargetLang(lang)
    setMode("translate")
    setIsTranslating(true)
    setTranslation("")
    
    try {
      const result = await translateText(content.text, lang)
      setTranslation(result)
    } catch (e) {
      console.error("Translation failed:", e)
      const errorMsg = e instanceof Error ? e.message : "Translation failed. Check if a model is loaded."
      setTranslation(errorMsg)
    } finally {
      setIsTranslating(false)
    }
  }

  if (mode === "translate") {
    const isSingleWord = content.text?.trim().split(/\s+/).length === 1

    return (
      <div 
        onMouseOver={() => transformSelection()}
        className="flex flex-col bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl w-80 overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        {/* MacOS Style Header */}
        <div className="px-4 py-3 border-b border-gray-100/50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isSingleWord ? "Dictionary Lookup" : "Translation"}
            </span>
          </div>
          <select 
            className="text-[11px] font-medium bg-transparent border-none outline-none text-blue-600 cursor-pointer"
            value={targetLang}
            onChange={(e) => handleTranslate(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Chinese">Chinese</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Original Text */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Source</span>
            <p className={cn(
              "text-gray-900 font-medium leading-snug",
              isSingleWord ? "text-xl font-serif" : "text-sm"
            )}>
              {content.text}
            </p>
          </div>

          {/* Translation Result */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Result</span>
            <div className="max-h-52 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
              {isTranslating ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-full text-gray-800 text-[13px] leading-relaxed overflow-x-auto">
                  {translation ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-950 mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-[14px] font-semibold text-gray-900 mt-3 mb-1.5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[13px] font-medium text-gray-800 mt-2 mb-1" {...props} />,
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-3 border border-gray-200 rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 text-[12px]" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gray-50 text-gray-900 font-semibold" {...props} />,
                        th: ({node, ...props}) => <th className="px-3 py-2 text-left" {...props} />,
                        td: ({node, ...props}) => <td className="px-3 py-2 text-gray-600 border-t border-gray-100" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-950" {...props} />,
                      }}
                    >
                      {translation}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-gray-400 italic">No translation available. Check if a model is loaded.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100/50 flex items-center justify-between">
          {!loadedModel && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              Model required
            </div>
          )}
          <div className="flex-1" />
          <button 
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            onClick={() => hideTipAndSelection()}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  if (mode === "note") {
    return (
      <div 
        onMouseOver={() => transformSelection()}
        className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl w-64 animate-in fade-in zoom-in duration-200"
      >
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter your note..."
          className="w-full text-sm p-2 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none h-20 text-gray-900"
        />
        <div className="flex items-center justify-end gap-2 mt-1">
          <button 
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => hideTipAndSelection()}
          >
            Cancel
          </button>
          <button 
            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
            onClick={() => {
              addHighlightToStore({ content, position, comment: { text: noteText, emoji: "" } })
              hideTipAndSelection()
            }}
          >
            Save Note
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      onMouseOver={() => transformSelection()}
      className="flex items-center gap-1 p-1 bg-gray-900 rounded-md shadow-lg animate-in fade-in zoom-in duration-200"
    >
      <button 
        className="px-3 py-1.5 text-[13px] text-white font-medium hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5"
        onClick={() => {
          if (content.text) {
            addChatContext({
              type: "text",
              content: content.text,
              label: content.text.slice(0, 30) + (content.text.length > 30 ? "..." : ""),
              id: crypto.randomUUID(),
            })
          }
          hideTipAndSelection()
        }}
      >
        <Plus className="w-3.5 h-3.5"/>
        Add to Chat
      </button>
      <div className="w-[1px] h-4 bg-gray-700 mx-1" />
      <button 
        className="px-3 py-1.5 text-[13px] text-white font-medium hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5"
        onClick={() => setMode("note")}
      >
        <Edit2 className="w-3.5 h-3.5"/>
        Add Note
      </button>
      <div className="w-[1px] h-4 bg-gray-700 mx-1" />
      <button 
        className="px-3 py-1.5 text-[13px] text-white font-medium hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5"
        onClick={() => handleTranslate("English")}
      >
        <Languages className="w-3.5 h-3.5"/>
        Translate
      </button>
    </div>
  )
}

import { OutlineItem } from "../store"

function OutlineFetcher({ pdfDocument }: { pdfDocument: any }) {
  const { setPdfOutline } = useStore()

  useEffect(() => {
    if (pdfDocument) {
      let isMounted = true
      async function fetchOutline() {
        try {
          const outline = await pdfDocument.getOutline()
          if (!isMounted) return

          if (!outline || outline.length === 0) {
            setPdfOutline([])
            return
          }
          
          const parsedOutline: OutlineItem[] = []
          
          async function processItems(items: any[], level: number) {
            for (const item of items) {
              if (!isMounted) return

              let pageIndex = -1
              if (item.dest) {
                let dest = item.dest
                if (typeof dest === "string") {
                  dest = await pdfDocument.getDestination(dest)
                }
                if (Array.isArray(dest) && dest[0]) {
                  try {
                    pageIndex = await pdfDocument.getPageIndex(dest[0])
                  } catch (e) {
                    console.warn("Failed to get page index for dest", dest, e)
                  }
                }
              }
              
              if (pageIndex !== -1) {
                parsedOutline.push({
                  title: item.title,
                  pageIndex,
                  level
                })
              }
              
              if (item.items && item.items.length > 0) {
                await processItems(item.items, level + 1)
              }
            }
          }
          
          await processItems(outline, 1)
          if (isMounted) {
            setPdfOutline(parsedOutline)
          }
        } catch (e) {
          console.error("Failed to fetch PDF outline:", e)
        }
      }
      fetchOutline()

      return () => {
        isMounted = false
      }
    }
  }, [pdfDocument])

  return null
}

export function PdfViewer() {
  const { openPdf } = usePdf()
  const {
    pdfInfo,
    addChatContext,
    documents,
    addDocument,
    workspaces,
    activeWorkspaceId,
    highlights,
    addHighlight,
    lastPdfPath,
    currentPage,
    setCurrentPage,
    zoom
  } = useStore()

  const highlighterRef = useRef<any>(null)

  const handleScroll = () => {
    resetHash()
    if (highlighterRef.current?.viewer) {
      const pageNum = highlighterRef.current.viewer.currentPageNumber
      if (pageNum && pageNum - 1 !== currentPage) {
        setCurrentPage(pageNum - 1)
      }
    }
  }

  useEffect(() => {
    if (highlighterRef.current?.viewer) {
      const viewerPage = highlighterRef.current.viewer.currentPageNumber
      if (viewerPage && viewerPage - 1 !== currentPage) {
        highlighterRef.current.viewer.currentPageNumber = currentPage + 1
      }
    }
  }, [currentPage])

  useEffect(() => {
    if (highlighterRef.current?.viewer) {
      highlighterRef.current.viewer.currentScaleValue = zoom.toString()
    }
  }, [zoom])

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const isQuickRead = activeWorkspace?.type === "quick_read"

  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  async function handleAddFile() {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      })
      if (path && typeof path === 'string') {
        await addDocument(path)
        await openPdf(path)
      }
    } catch (e) {
      console.error("Failed to add file:", e)
    }
  }

  const addHighlightToStore = (highlight: NewHighlight) => {
    if (!lastPdfPath) return
    const id = getNextId()
    const newHighlight = { ...highlight, id, documentPath: lastPdfPath } as Highlight
    addHighlight(newHighlight)
  }

  if (documents.length === 0 && !pdfInfo) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F9F9FB] text-gray-500">
        <div className="text-center">
          <p className="mb-4">No documents in this workspace</p>
          <button 
            onClick={handleAddFile} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black transition-colors shadow-sm"
          >
            <FilePlus className="h-4 w-4" />
            Add PDF to Workspace
          </button>
        </div>
      </div>
    )
  }

  if (!pdfInfo && documents.length > 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F9F9FB] text-gray-500">
        <div className="text-center">
          <p className="mb-4">Select a document to read</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => openPdf(doc.path)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 shadow-sm transition-all text-gray-800 font-medium"
              >
                {doc.name}
              </button>
            ))}
            <button 
              onClick={handleAddFile}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#F9F9FB]">
      {/* Document Tabs */}
      {!isQuickRead && (
        <div className="flex shrink-0 items-end px-2 pt-2 bg-[#F9F9FB] border-b border-gray-200 overflow-x-auto">
          {documents.map((doc) => {
            const isActive = pdfInfo?.fileName === doc.name
            return (
              <div
                key={doc.id}
                onClick={() => !isActive && openPdf(doc.path)}
                className={cn(
                  "group flex items-center gap-2 px-3 py-1.5 text-sm transition-colors rounded-t-lg relative",
                  isActive
                    ? "bg-white border-t border-x border-gray-200 text-gray-800 font-medium z-10 -mb-[1px]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 border-t border-x border-transparent cursor-pointer"
                )}
              >
                <span className="truncate max-w-[160px]">{doc.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Content Area */}
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
              beforeLoad={
                <div className="h-full w-full flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading PDF content...
                </div>
              }
              errorMessage={
                <div className="h-full w-full flex items-center justify-center text-red-500 gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Failed to load PDF. Check file permissions.
                </div>
              }
            >
              {(pdfDocument) => (
                <div className="h-full w-full relative">
                  <AddPageContextButton />
                  <PdfHighlighter
                    ref={(ref) => {
                      highlighterRef.current = ref
                      if (ref?.viewer?.eventBus) {
                        const eventBus = ref.viewer.eventBus as any
                        if (!eventBus._boundPageChanging) {
                          eventBus._boundPageChanging = true
                          eventBus.on("pagechanging", (evt: { pageNumber: number }) => {
                            const newPage = evt.pageNumber - 1
                            if (newPage !== useStore.getState().currentPage) {
                              useStore.getState().setCurrentPage(newPage)
                            }
                          })
                          eventBus.on("pagesinit", () => {
                            const targetPage = useStore.getState().currentPage
                            if (targetPage > 0 && ref.viewer) {
                              // Wrap in setTimeout to ensure viewer is fully ready
                              setTimeout(() => {
                                if (ref.viewer) {
                                  ref.viewer.currentPageNumber = targetPage + 1
                                }
                              }, 50)
                            }
                          })
                        }
                      }
                    }}
                    pdfDocument={pdfDocument}
                    pdfScaleValue={zoom.toString()}
                    enableAreaSelection={(event) => event.altKey}
                    onScrollChange={handleScroll}
                    scrollRef={() => {}}
                    onSelectionFinished={(
                      position,
                      content,
                      hideTipAndSelection,
                      transformSelection
                    ) => (
                      <TooltipForm
                        content={content}
                        position={position}
                        hideTipAndSelection={hideTipAndSelection}
                        transformSelection={transformSelection}
                        addHighlightToStore={addHighlightToStore}
                        addChatContext={addChatContext}
                      />
                    )}
                    highlightTransform={(
                      highlight,
                      _index,
                      _setTip,
                      _hideTip,
                      _viewportToScaled,
                      _screenshot,
                      isScrolledTo
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
                    }}
                    highlights={highlights.filter(h => h.documentPath === lastPdfPath) as IHighlight[]}
                  />
                  <OutlineFetcher pdfDocument={pdfDocument} />
                  <PageIndexer pdfDocument={pdfDocument} />
                </div>
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
