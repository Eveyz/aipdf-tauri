import { useEffect } from "react"
import { usePdf } from "../hooks/usePdf"
import { useStore } from "../store"

const CSS_PIXELS_PER_PDF_POINT = 96 / 72
const MAX_RENDER_SCALE = 5

export function PdfViewer() {
  const { renderPage } = usePdf()
  const { pdfInfo, currentPage, renderedPages, zoom } = useStore()
  const displayWidth = pdfInfo
    ? Math.round(pdfInfo.pageWidth * CSS_PIXELS_PER_PDF_POINT * zoom)
    : 0
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

  if (!pdfInfo) return null

  const imageData = renderedPages[currentPage]

  return (
    <div className="h-full min-w-0 overflow-auto bg-muted/50 p-4">
      {imageData ? (
        <div className="flex min-h-full min-w-max items-start justify-center">
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={`Page ${currentPage + 1}`}
            className="max-w-none shrink-0 shadow-lg"
            style={{ width: displayWidth }}
            draggable={false}
          />
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
