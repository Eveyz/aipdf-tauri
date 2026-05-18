import React from "react"
import { Trash2 } from "lucide-react"
import { type ChatSession } from "../../store"
import { formatRelativeTime } from "../../lib/utils"

interface SessionItemProps {
  session: ChatSession
  index: number
  isSelected: boolean
  isCurrent: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onMouseEnter: (index: number) => void
}

export const SessionItem = React.memo(({ 
  session, 
  index, 
  isSelected, 
  isCurrent, 
  onSelect, 
  onDelete, 
  onMouseEnter 
}: SessionItemProps) => {
  return (
    <div
      data-selected={isSelected}
      onClick={() => onSelect(session.id)}
      onMouseEnter={() => onMouseEnter(index)}
      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
        isSelected ? (isCurrent ? 'bg-blue-100' : 'bg-gray-100') : (isCurrent ? 'bg-blue-50/50' : 'transparent')
      }`}
    >
      <span className={`text-[12px] truncate ${isCurrent || isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
        {session.name}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] ${isCurrent || isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
          {formatRelativeTime(session.updatedAt)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Delete this session?")) {
              onDelete(session.id)
            }
          }}
          className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/5 transition-all ${
            isCurrent || isSelected ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-gray-700'
          }`}
          title="Delete session"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
})

SessionItem.displayName = "SessionItem"
