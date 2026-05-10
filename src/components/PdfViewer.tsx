import { useEffect } from "react"
import { usePdf } from "../hooks/usePdf"
import { useStore } from "../store"

export function PdfViewer() {
  const { renderPage } = usePdf()
  const { pdfInfo, currentPage, renderedPages, zoom } = useStore()

  useEffect(() => {
    if (pdfInfo && renderedPages[currentPage] === undefined) {
      renderPage(currentPage)
    }
  }, [pdfInfo, currentPage, zoom])

  if (!pdfInfo) return null

  const imageData = renderedPages[currentPage]

  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-muted/50 p-4">
      {imageData ? (
        <img
          src={`data:image/png;base64,${imageData}`}
          alt={`Page ${currentPage + 1}`}
          className="max-h-full max-w-full shadow-lg"
          style={{ transform: `scale(${zoom / 1.5})`, transformOrigin: "top center" }}
          draggable={false}
        />
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Rendering page...
        </div>
      )}
    </div>
  )
}
