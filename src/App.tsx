import { useEffect } from "react"
import { Panel, Group, Separator } from "react-resizable-panels"
import { useStore } from "./store"
import { Toolbar } from "./components/Toolbar"
import { PdfViewer } from "./components/PdfViewer"
import { DocumentSidebar } from "./components/DocumentSidebar"
import { ChatPanel } from "./components/ChatPanel"
import { ModelManager } from "./components/ModelManager"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { PdfMindmapModal } from "./components/PdfMindmapModal"
import { usePdf } from "./hooks/usePdf"

function App() {
  const { pdfInfo, activeWorkspaceId, workspaces, documents, sidebarOpen, chatOpen, init } = useStore()
  const { openPdf } = usePdf()
  const layoutKey = `${sidebarOpen ? "sidebar" : "no-sidebar"}-${chatOpen ? "chat" : "no-chat"}`

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  useEffect(() => {
    const startup = async () => {
      await init()
    }
    startup()
  }, [])

  // Auto-select document (last active or first for quick_read)
  useEffect(() => {
    if (activeWorkspaceId && documents.length > 0 && !pdfInfo) {
      const wsLastDoc = activeWorkspace?.lastDocPath;
      const docToOpen = documents.find(d => d.path === wsLastDoc) || 
                        (activeWorkspace?.type === 'quick_read' ? documents[0] : null);
      
      if (docToOpen) {
        openPdf(docToOpen.path);
      }
    }
  }, [activeWorkspaceId, documents, pdfInfo, openPdf, activeWorkspace?.type, activeWorkspace?.lastDocPath])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        useStore.getState().setMindmapOpen(!useStore.getState().mindmapOpen)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden relative">
      <Toolbar />

      <div className="min-h-0 flex-1 overflow-hidden">
        {!activeWorkspaceId && !pdfInfo ? (
          <WelcomeScreen />
        ) : (
          <Group
            key={layoutKey}
            orientation="horizontal"
            className="h-full min-w-0"
          >
            {sidebarOpen && (
              <Panel
                id="sidebar"
                defaultSize="18%"
                minSize="220px"
                maxSize="360px"
                className="min-w-0 overflow-hidden border-r border-gray-200"
              >
                <DocumentSidebar />
              </Panel>
            )}

            <Panel
              id="pdf"
              defaultSize={sidebarOpen && chatOpen ? "58%" : "76%"}
              minSize="320px"
              className="min-w-0 overflow-hidden"
            >
              <PdfViewer />
            </Panel>

            {chatOpen && (
              <>
                <Separator className="w-px shrink-0 bg-border transition-colors hover:bg-primary cursor-col-resize" />

                <Panel
                  id="chat"
                  defaultSize="24%"
                  minSize="280px"
                  maxSize="480px"
                  className="min-w-0 overflow-hidden"
                >
                  <ChatPanel />
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>

      <ModelManager />
      <PdfMindmapModal />
    </div>
  )
}

export default App
