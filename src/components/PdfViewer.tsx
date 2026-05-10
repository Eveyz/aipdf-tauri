import { useEffect, useMemo, useState } from "react"
import { usePdf, type PageTextResult } from "../hooks/usePdf"
import { useStore } from "../store"

const CSS_PIXELS_PER_PDF_POINT = 96 / 72
const MAX_RENDER_SCALE = 5

type TextLine = {
  text: string
  left: number
  top: number
  width: number
  height: number
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
    height: number
  }> = []

  for (const char of pageText.chars) {
    if (!char.unicode.trim() && char.width === 0) continue

    const centerY = char.y + char.height / 2
    const tolerance = Math.max(char.height * 0.6, 3)
    const line = lines.find((candidate) => Math.abs(candidate.centerY - centerY) <= tolerance)

    if (line) {
      line.chars.push(char)
      line.centerY = (line.centerY * (line.chars.length - 1) + centerY) / line.chars.length
      line.height = Math.max(line.height, char.height)
    } else {
      lines.push({ chars: [char], centerY, height: char.height })
    }
  }

  return lines
    .map((line) => {
      const chars = [...line.chars].sort((a, b) => a.x - b.x)
      const left = Math.min(...chars.map((char) => char.x))
      const right = Math.max(...chars.map((char) => char.x + char.width))
      const bottom = Math.min(...chars.map((char) => char.y))
      const top = Math.max(...chars.map((char) => char.y + char.height))

      return {
        text: textFromLineChars(chars, line.height),
        left,
        top: pageText.page_height - top,
        width: right - left,
        height: top - bottom,
      }
    })
    .sort((a, b) => a.top - b.top || a.left - b.left)
}

export function PdfViewer() {
  const { renderPage, getPageText } = usePdf()
  const { pdfInfo, currentPage, renderedPages, zoom, setSelectedPdfText } = useStore()
  const [pageTexts, setPageTexts] = useState<Record<number, PageTextResult>>({})
  const displayWidth = pdfInfo
    ? Math.round(pdfInfo.pageWidth * CSS_PIXELS_PER_PDF_POINT * zoom)
    : 0
  const displayHeight = pdfInfo
    ? Math.round(pdfInfo.pageHeight * CSS_PIXELS_PER_PDF_POINT * zoom)
    : 0
  const textScale = pdfInfo ? displayWidth / pdfInfo.pageWidth : 1
  const renderScale =
    typeof window === "undefined"
      ? zoom * CSS_PIXELS_PER_PDF_POINT
      : Math.min(
          zoom * CSS_PIXELS_PER_PDF_POINT * window.devicePixelRatio,
          MAX_RENDER_SCALE
        )

  useEffect(() => {
    if (pdfInfo && renderedPages[currentPage] === undefined) {
      console.log(`[PdfViewer] triggering render for page ${currentPage}`)
      renderPage(currentPage, renderScale).catch((e) => {
        console.error("[PdfViewer] renderPage failed:", e)
        alert("Failed to render page: " + e)
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

  if (!pdfInfo) return null

  const imageData = renderedPages[currentPage]

  function captureSelectionContext() {
    const selectedText = window.getSelection()?.toString().trim() ?? ""
    if (selectedText) {
      setSelectedPdfText(selectedText)
    }
  }

  return (
    <div className="h-full min-w-0 overflow-auto bg-muted/50 p-4">
      {imageData ? (
        <div className="flex min-h-full min-w-max items-start justify-center">
          <div
            className="relative shrink-0 bg-white shadow-lg"
            style={{ width: displayWidth, height: displayHeight }}
          >
            <img
              src={`data:image/png;base64,${imageData}`}
              alt={`Page ${currentPage + 1}`}
              className="absolute inset-0 h-full w-full select-none"
              draggable={false}
            />

            {textLines.length > 0 && (
              <div
                className="pdf-text-layer absolute inset-0 select-text overflow-hidden"
                onMouseUp={captureSelectionContext}
                onKeyUp={captureSelectionContext}
              >
                {textLines.map((line, index) => {
                  const width = Math.max(line.width * textScale, 1)
                  const height = Math.max(line.height * textScale, 1)

                  return (
                    <span
                      key={index}
                      className="pdf-text-line absolute cursor-text whitespace-pre"
                      style={{
                        left: line.left * textScale,
                        top: line.top * textScale,
                        width,
                        height,
                        fontSize: height,
                        lineHeight: `${height}px`,
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
  )
}
