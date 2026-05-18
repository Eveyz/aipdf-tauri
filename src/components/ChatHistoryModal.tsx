import { useEffect, useRef } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowUpDown, CornerDownLeft } from "lucide-react"
import { useChatHistory } from "../hooks/useChatHistory"
import { SessionItem } from "./chat/SessionItem"

export function ChatHistoryModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const {
    search,
    setSearch,
    selectedIndex,
    currentSession,
    recentSessions,
    olderSessions,
    flatItems,
    handleSelect,
    handleDelete,
    handleMouseEnter,
    handleKeyDown
  } = useChatHistory(open, onOpenChange)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll selected item into view
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]') as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

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
