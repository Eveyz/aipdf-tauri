import { useEffect, useState } from "react"
import { usePdf } from "../hooks/usePdf"
import { useStore } from "../store"
import { ScrollArea } from "./ui/scroll-area"
import { cn } from "../lib/utils"

export function PageSidebar() {
  const { pdfInfo, currentPage } = useStore()
  const { goToPage, getPageText } = usePdf()
  const [pageText, setPageText] = useState<string>("")

  useEffect(() => {
    if (pdfInfo) {
      getPageText(currentPage).then((t) => setPageText(t.full_text)).catch(() => setPageText(""))
    }
  }, [currentPage, pdfInfo])

  if (!pdfInfo) return null

  const pages = Array.from({ length: pdfInfo.pageCount }, (_, i) => i)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="shrink-0 border-b px-3 py-2">
        <h3 className="text-sm font-medium">Pages</h3>
      </div>

      {/* Page list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {pages.map((i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                currentPage === i && "bg-accent font-medium"
              )}
            >
              <span className="w-8 shrink-0 text-right text-muted-foreground">{i + 1}</span>
              <span className="truncate">Page {i + 1}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Page text */}
      {pageText && (
        <div className="shrink-0 border-t">
          <div className="px-3 py-2">
            <h4 className="text-xs font-medium text-muted-foreground">Page text</h4>
          </div>
          <ScrollArea className="h-48">
            <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
              {pageText.slice(0, 2000)}
              {pageText.length > 2000 && "..."}
            </p>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
