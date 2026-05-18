import { History, Plus, MoreHorizontal } from "lucide-react"
import { useStore } from "../../store"

interface ChatHeaderProps {
  onOpenHistory: () => void
}

export function ChatHeader({ onOpenHistory }: ChatHeaderProps) {
  const { sessions, activeSessionId, createSession } = useStore()
  const activeSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5 w-full overflow-hidden h-[40px]">
      <div className="flex items-center min-w-0 pr-2">
        <span className="text-[13px] font-semibold text-gray-800 truncate">
          {activeSession?.name || "New Session"}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onOpenHistory}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          title="Chat History"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={createSession}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          title="Options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
