import { cn } from "../../lib/utils"
import { usePdf } from "../../hooks/usePdf"
import { useStore, type Document } from "../../store"

interface DocumentTabsProps {
  documents: Document[]
  activePdfName?: string
}

export function DocumentTabs({ documents, activePdfName }: DocumentTabsProps) {
  const { openPdf } = usePdf()

  return (
    <div className="flex shrink-0 items-end px-2 pt-2 bg-[#F9F9FB] border-b border-gray-200 overflow-x-auto">
      {documents.map((doc) => {
        const isActive = activePdfName === doc.name
        return (
          <div
            key={doc.id}
            onClick={() => !isActive && openPdf(doc.path)}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5 text-sm transition-colors rounded-t-lg relative whitespace-nowrap",
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
  )
}
