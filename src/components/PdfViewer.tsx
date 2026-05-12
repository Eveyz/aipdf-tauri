import { useEffect, useMemo, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { Plus, X, FilePlus } from "lucide-react"
import { usePdf, type PageTextResult } from "../hooks/usePdf"
import { useStore } from "../store"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

const CSS_PIXELS_PER_PDF_POINT = 96 / 72
const MAX_RENDER_SCALE = 5

type TextLine = {
  text: string
  left: number
  top: number
  width: number
  height: number
  fontSize: number
}

function textFromLineChars(chars: PageTextResult["chars"], lineHeight: number) {
  const widths = chars
    .map((char) => char.width)
    .filter((width) => width > 0)
    .sort((a, b) => a - b)
  const medianWidth = widths[Math.floor(widths.length / 2)] || lineHeight * 0.45
  const spaceThreshold = Math.max(medianWidth * 0.65, lineHeight * 0.12)

  return chars.reduce((text, char, index) => {
    const previous = chars[index - 1]
    const gap = previous ? char.x - (previous.x + previous.width) : 0
    const needsInferredSpace =
      previous &&
      gap > spaceThreshold &&
      !previous.unicode.match(/\s/) &&
      !char.unicode.match(/\s/)

    return `${text}${needsInferredSpace ? " " : ""}${char.unicode}`
  }, "")
}

function buildTextLines(pageText: PageTextResult | undefined): TextLine[] {
  if (!pageText) return []

  const lines: Array<{
    chars: PageTextResult["chars"]
    centerY: number
    maxHeight: number
    minY: number
    maxY: number
  }> = []

  for (const char of pageText.chars) {
    if (!char.unicode.trim() && char.width === 0) continue

    const centerY = char.y + char.height / 2
    const tolerance = Math.max(char.height * 0.6, 3)
    const line = lines.find((candidate) => Math.abs(candidate.centerY - centerY) <= tolerance)

    if (line) {
      line.chars.push(char)
      line.centerY = (line.centerY * (line.chars.length - 1) + centerY) / line.chars.length
      line.maxHeight = Math.max(line.maxHeight, char.height)
      line.minY = Math.min(line.minY, char.y)
      line.maxY = Math.max(line.maxY, char.y + char.height)
    } else {
      lines.push({
        chars: [char],
        centerY,
        maxHeight: char.height,
        minY: char.y,
        maxY: char.y + char.height,
      })
    }
  }

  return lines
    .map((line) => {
      const chars = [...line.chars].sort((a, b) => a.x - b.x)
      const left = Math.min(...chars.map((char) => char.x))
      const right = Math.max(...chars.map((char) => char.x + char.width))

      return {
        text: textFromLineChars(chars, line.maxHeight),
        left,
        top: pageText.page_height - line.maxY,
        width: right - left,
        height: line.maxY - line.minY,
        fontSize: line.maxHeight,
      }
    })
    .sort((a, b) => a.top - b.top || a.left - b.left)
}

export function PdfViewer() {
  const { renderPage, getPageText, openPdf } = usePdf()
  const {
    pdfInfo,
    currentPage,
    renderedPages,
    zoom,
    addChatContext,
    documents,
    addDocument,
    workspaces,
    activeWorkspaceId,
  } = useStore()
  const [pageTexts, setPageTexts] = useState<Record<number, PageTextResult>>({})

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const isQuickRead = activeWorkspace?.type === "quick_read"

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

  const displayWidth = pdfInfo
    ? Math.round(pdfInfo.pageWidth * CSS_PIXELS_PER_PDF_POINT * zoom)
    : 0
  const displayHeight = pdfInfo
    ? Math.round(pdfInfo.pageHeight * CSS_PIXELS_PER_PDF_POINT * zoom)
    : 0

  const scaleX = pdfInfo ? displayWidth / pdfInfo.pageWidth : 1
  const scaleY = pdfInfo ? displayHeight / pdfInfo.pageHeight : 1

  const renderScale =
    typeof window === "undefined"
      ? zoom * CSS_PIXELS_PER_PDF_POINT
      : Math.min(
          zoom * CSS_PIXELS_PER_PDF_POINT * window.devicePixelRatio,
          MAX_RENDER_SCALE
        )

  useEffect(() => {
    if (pdfInfo && renderedPages[currentPage] === undefined) {
      renderPage(currentPage, renderScale).catch((e) => {
        console.error("[PdfViewer] renderPage failed:", e)
      })
    }
  }, [pdfInfo, currentPage, renderPage, renderedPages, renderScale])

  useEffect(() => {
    if (pdfInfo && pageTexts[currentPage] === undefined) {
      getPageText(currentPage)
        .then((text) => {
          setPageTexts((texts) => ({ ...texts, [currentPage]: text }))
        })
        .catch((e) => {
          console.error("[PdfViewer] getPageText failed:", e)
        })
    }
  }, [currentPage, getPageText, pageTexts, pdfInfo])

  const pageText = pageTexts[currentPage]
  const textLines = useMemo(() => buildTextLines(pageText), [pageText])

  function captureSelectionContext() {
    const selectedText = window.getSelection()?.toString().trim() ?? ""
    if (selectedText) {
      addChatContext({
        type: "text",
        content: selectedText,
        label: selectedText.slice(0, 30) + (selectedText.length > 30 ? "..." : ""),
        id: crypto.randomUUID(),
      })
    }
  }

  function handleAddPage() {
    if (!pdfInfo) return
    addChatContext({
      type: "page",
      content: `Page ${currentPage + 1}`,
      label: `p.${currentPage + 1} (${pdfInfo.fileName.replace(".pdf", "").slice(0, 15)}...)`,
      id: `page-${currentPage}`,
    })
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

  const imageData = renderedPages[currentPage]

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

      {/* Main Canvas */}
      <div className="min-h-0 flex-1 overflow-auto p-4 scrollbar-thin">
        {imageData ? (
          <div className="flex min-h-full min-w-max items-start justify-center">
            <div
              className="group relative shrink-0 bg-white shadow-sm rounded-sm"
              style={{ width: displayWidth, height: displayHeight }}
            >
              <img
                src={`data:image/png;base64,${imageData}`}
                alt={`Page ${currentPage + 1}`}
                className="absolute inset-0 h-full w-full select-none"
                draggable={false}
              />

              {/* Hover "Add Page" button */}
              <button
                onClick={handleAddPage}
                className="absolute top-3 right-3 bg-white/80 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-gray-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-white/90 z-10"
              >
                <Plus className="h-3 w-3" />
                Add Page {currentPage + 1}
              </button>

              {textLines.length > 0 && (
                <div
                  className="pdf-text-layer absolute inset-0 select-text overflow-hidden"
                  onMouseUp={captureSelectionContext}
                  onKeyUp={captureSelectionContext}
                >
                  {textLines.map((line, index) => {
                    const cssLeft = line.left * scaleX
                    const cssTop = line.top * scaleY
                    const cssWidth = Math.max(line.width * scaleX, 1)
                    const cssHeight = Math.max(line.height * scaleY, 1)
                    const cssFontSize = Math.max(line.fontSize * scaleY, 1)

                    return (
                      <span
                        key={index}
                        className="pdf-text-line absolute cursor-text whitespace-pre"
                        style={{
                          left: cssLeft,
                          top: cssTop,
                          width: cssWidth,
                          height: cssHeight,
                          fontSize: cssFontSize,
                          lineHeight: 1,
                        }}
                      >
                        {line.text}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Rendering page...
          </div>
        )}
      </div>
    </div>
  )
}