import { useState, useMemo, useCallback, useEffect } from "react"
import { useStore, type ChatSession } from "../store"

export function useChatHistory(open: boolean, onOpenChange: (open: boolean) => void) {
  const sessions = useStore(state => state.sessions)
  const activeSessionId = useStore(state => state.activeSessionId)
  const switchSession = useStore(state => state.switchSession)
  const deleteSession = useStore(state => state.deleteSession)

  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [flatItems, selectedIndex, handleSelect])

  return {
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
  }
}
