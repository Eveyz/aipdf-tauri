import { useState, useRef, useEffect, useCallback } from "react"

interface UseChatContextMenuProps {
  input: string
  setInput: (value: string | ((prev: string) => string)) => void
  onAddCurrentPage: () => void
  onAddFullDocument: () => void
}

export function useChatContextMenu({ 
  input, 
  setInput, 
  onAddCurrentPage, 
  onAddFullDocument 
}: UseChatContextMenuProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [menuSelectedIndex, setMenuSelectedIndex] = useState(0)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const menuItemsCount = 2 // Fixed for now: Current Page and Full Document

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto-hide menu if @ is deleted
  useEffect(() => {
    if (showContextMenu && !input.includes("@")) {
      setShowContextMenu(false)
    }
  }, [input, showContextMenu])

  const handleSelectMenuItem = useCallback((index: number) => {
    if (index === 0) onAddCurrentPage()
    if (index === 1) onAddFullDocument()
    
    setShowContextMenu(false)
    setInput(prev => prev.replace(/@$/, ""))
  }, [onAddCurrentPage, onAddFullDocument, setInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showContextMenu) return false

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setMenuSelectedIndex(prev => (prev + 1) % menuItemsCount)
      return true
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setMenuSelectedIndex(prev => (prev - 1 + menuItemsCount) % menuItemsCount)
      return true
    }
    if (e.key === "Enter") {
      e.preventDefault()
      handleSelectMenuItem(menuSelectedIndex)
      return true
    }
    if (e.key === "Escape") {
      e.preventDefault()
      setShowContextMenu(false)
      return true
    }
    return false
  }, [showContextMenu, menuItemsCount, handleSelectMenuItem, menuSelectedIndex])

  const onInputChange = useCallback((newValue: string) => {
    if (newValue.endsWith("@")) {
      setShowContextMenu(true)
      setMenuSelectedIndex(0)
    } else if (showContextMenu && !newValue.includes("@")) {
      setShowContextMenu(false)
    }
  }, [showContextMenu])

  return {
    showContextMenu,
    setShowContextMenu,
    menuSelectedIndex,
    setMenuSelectedIndex,
    contextMenuRef,
    handleSelectMenuItem,
    handleKeyDown,
    onInputChange,
  }
}
