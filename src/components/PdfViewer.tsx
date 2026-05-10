import { useEffect } from "react"
import { usePdf } from "../hooks/usePdf"
import { useStore } from "../store"

export function PdfViewer() {
  const { renderPage } = usePdf()
  const { pdfInfo, currentPage, renderedPages, zoom } = useStore()

  useEffect(() => {
    if (pdfInfo && renderedPages[currentPage] === undefined) {
      console.log(`[PdfViewer] triggering render for page ${currentPage}`)
      renderPage(currentPage).catch((e) => {
        console.error("[PdfViewer] renderPage failed:", e)
        alert("Failed to render page: " + e)
      })
    }
  }, [pdfInfo, currentPage, zoom, renderPage, renderedPages])

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
