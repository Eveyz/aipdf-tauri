import React, { useMemo } from "react"
import File from "lucide-react/dist/esm/icons/file"
import FileText from "lucide-react/dist/esm/icons/file-text"
import { cn } from "../../lib/utils"
import { useStore } from "../../store"

interface ChatContextMenuProps {
  selectedIndex: number
  onSelect: (index: number) => void
}

export const ChatContextMenu = React.memo(React.forwardRef<HTMLDivElement, ChatContextMenuProps>(({
  selectedIndex,
  onSelect
}, ref) => {
  const currentPage = useStore(state => state.currentPage)
  const fileName = useStore(state => state.pdfInfo?.fileName || "Document")

  const menuItems = useMemo(() => [
    { 
      id: 'page', 
      label: 'Current Page', 
      shortcut: `p.${currentPage + 1}`, 
      icon: <File className="w-3.5 h-3.5" />,
    },
    { 
      id: 'doc', 
      label: 'Full Document', 
      shortcut: 'PDF', 
      icon: <FileText className="w-3.5 h-3.5" />,
    },
  ], [currentPage])

  return (
    <div 
      ref={ref}
      className="absolute bottom-full left-0 mb-1.5 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight">Attach Context</div>
      {menuItems.map((item, idx) => (
        <button 
          key={item.id}
          onClick={() => onSelect(idx)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
            selectedIndex === idx ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          {item.icon}
          <span className="flex-1 text-left font-medium">{item.label}</span>
          <span className={cn(
            "text-[10px] font-mono",
            selectedIndex === idx ? "text-blue-400" : "text-gray-400"
          )}>{item.shortcut}</span>
        </button>
      ))}
      <div className="h-px bg-gray-100 my-1" />
      <div className="px-3 py-1 text-[10px] font-medium text-gray-300 italic truncate" title={fileName}>
        File: {fileName}
      </div>
    </div>
  )
}))

ChatContextMenu.displayName = "ChatContextMenu"
