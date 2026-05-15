import { useEffect, useState } from "react"
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
  Popup,
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

  if (mode === "translate") {
    return (
      <div 
        onMouseOver={() => transformSelection()}
        className="flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-2xl w-80 animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Translate to</span>
            <select 
              className="text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-900"
              defaultValue="en"
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
          <p className="text-sm text-gray-600 italic">
            "{content.text}"
          </p>
        </div>

        <div className="min-h-[80px] p-3 border border-gray-100 rounded-lg bg-blue-50/50">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 
            Translating...
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-1">
          <button 
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => hideTipAndSelection()}
          >
            Close
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
        onClick={() => setMode("translate")}
      >
        <Languages className="w-3.5 h-3.5"/>
        Translate
      </button>
    </div>
  )
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
    lastPdfPath
  } = useStore()

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
                  <PdfHighlighter
                    pdfDocument={pdfDocument}
                    enableAreaSelection={(event) => event.altKey}
                    onScrollChange={resetHash}
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
