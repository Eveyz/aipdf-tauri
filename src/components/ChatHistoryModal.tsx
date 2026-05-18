import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Search, History, Trash2, ArrowUpDown, CornerDownLeft } from "lucide-react"
import { useStore, type ChatSession } from "../store"

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} mins ago`
  if (hours < 24) return `${hours} hrs ago`
  if (days === 1) return `1 day ago`
  if (days < 30) return `${days} days ago`
  if (months === 1) return `1 mo ago`
  return `${months} mos ago`
}

interface SessionItemProps {
  session: ChatSession
  index: number
  isSelected: boolean
  isCurrent: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onMouseEnter: (index: number) => void
}

const SessionItem = React.memo(({ 
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

export function ChatHistoryModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  // Use granular selectors to avoid re-rendering modal on every message update in active session
  const sessions = useStore(state => state.sessions)
  const activeSessionId = useStore(state => state.activeSessionId)
  const switchSession = useStore(state => state.switchSession)
  const deleteSession = useStore(state => state.deleteSession)

  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Memoize session categorization and filtering
  const { currentSession, recentSessions, olderSessions, flatItems } = useMemo(() => {
    const current = sessions.find(s => s.id === activeSessionId)
    const other = sessions.filter(s => s.id !== activeSessionId)
    const filtered = other.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    
    const now = Date.now()
    const recentThreshold = now - 7 * 24 * 60 * 60 * 1000 // 7 days
    
    const recent = filtered.filter(s => s.updatedAt >= recentThreshold)
    const older = filtered.filter(s => s.updatedAt < recentThreshold)

    const flat: Array<{ type: 'current' | 'recent' | 'older', session: ChatSession }> = []
    if (!search && current) flat.push({ type: 'current', session: current })
    recent.forEach(s => flat.push({ type: 'recent', session: s }))
    older.forEach(s => flat.push({ type: 'older', session: s }))

    return { 
      currentSession: current, 
      recentSessions: recent, 
      olderSessions: older, 
      flatItems: flat 
    }
  }, [sessions, activeSessionId, search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search, open])

  useEffect(() => {
    // Scroll selected item into view
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]') as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const handleSelect = useCallback((id: string) => {
    switchSession(id)
    onOpenChange(false)
  }, [switchSession, onOpenChange])

  const handleDelete = useCallback((id: string) => {
    deleteSession(id)
  }, [deleteSession])

  const handleMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = flatItems[selectedIndex]
      if (item) {
        handleSelect(item.session.id)
      }
    }
  }

  let itemIndex = 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-[50%] top-[20%] z-50 w-full max-w-[600px] translate-x-[-50%] rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          <div className="flex items-center px-4 py-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Select a conversation"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {(!search && currentSession) && (
              <div className="mb-2">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Current</div>
                <SessionItem 
                  session={currentSession}
                  index={itemIndex++}
                  isSelected={selectedIndex === 0}
                  isCurrent={true}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onMouseEnter={handleMouseEnter}
                />
              </div>
            )}

            {recentSessions.length > 0 && (
              <div className="mb-2">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recent in App</div>
                {recentSessions.map(session => (
                  <SessionItem 
                    key={session.id}
                    session={session}
                    index={itemIndex++}
                    isSelected={selectedIndex === itemIndex - 1}
                    isCurrent={false}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onMouseEnter={handleMouseEnter}
                  />
                ))}
              </div>
            )}

            {olderSessions.length > 0 && (
              <div className="mb-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Other Conversations</div>
                {olderSessions.map(session => (
                  <SessionItem 
                    key={session.id}
                    session={session}
                    index={itemIndex++}
                    isSelected={selectedIndex === itemIndex - 1}
                    isCurrent={false}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onMouseEnter={handleMouseEnter}
                  />
                ))}
              </div>
            )}
            
            {flatItems.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-gray-500">
                No sessions found
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
              <span className="flex items-center gap-1.5"><ArrowUpDown className="w-3 h-3" /> to navigate</span>
              <span className="flex items-center gap-1.5"><CornerDownLeft className="w-3 h-3" /> to select</span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
