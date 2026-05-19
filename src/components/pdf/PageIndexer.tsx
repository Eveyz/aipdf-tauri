import React from "react"
import { useStore } from "../../store"
import { usePageIndexer } from "../../hooks/usePageIndexer"

interface PageIndexerProps {
  pdfDocument: any
}

export const PageIndexer = React.memo(({ pdfDocument }: PageIndexerProps) => {
  const currentPage = useStore((state) => state.currentPage)
  const lastPdfHash = useStore((state) => state.lastPdfHash)
  usePageIndexer(pdfDocument, currentPage, lastPdfHash)
  return null
})

PageIndexer.displayName = "PageIndexer"
