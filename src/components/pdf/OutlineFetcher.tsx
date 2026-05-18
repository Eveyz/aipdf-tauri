import { useEffect } from "react"
import { useStore, type OutlineItem } from "../../store"

interface OutlineFetcherProps {
  pdfDocument: any
}

export function OutlineFetcher({ pdfDocument }: OutlineFetcherProps) {
  const setPdfOutline = useStore((state) => state.setPdfOutline)

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
  }, [pdfDocument, setPdfOutline])

  return null
}
