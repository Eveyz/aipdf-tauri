import { useState } from "react"
import { Loader2, FilePlus } from "lucide-react"
import { usePdf } from "../../hooks/usePdf"
import { useStore } from "../../store"

export function AddPageContextButton() {
  const currentPage = useStore((state) => state.currentPage)
  const pdfInfo = useStore((state) => state.pdfInfo)
  const addChatContext = useStore((state) => state.addChatContext)
  const setChatOpen = useStore((state) => state.setChatOpen)
  const { getPageText } = usePdf()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddPage = async () => {
    if (!pdfInfo || isAdding) return
    setIsAdding(true)
    try {
      const result = await getPageText(currentPage)
      addChatContext({
        type: "page",
        content: result.full_text,
        label: `Page ${currentPage + 1} (${pdfInfo.fileName})`,
        id: crypto.randomUUID(),
      })
      setChatOpen(true)
    } catch (e) {
      console.error("Failed to add page context:", e)
    } finally {
      setIsAdding(false)
    }
  }

  if (!pdfInfo) return null

  return (
    <button
      onClick={handleAddPage}
      disabled={isAdding}
      className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-white transition-all text-xs font-medium text-gray-700 group"
    >
      {isAdding ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
      ) : (
        <FilePlus className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
      )}
      <span>Add Page to Chat</span>
    </button>
  )
}
