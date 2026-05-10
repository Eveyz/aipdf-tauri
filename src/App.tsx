import { Panel, Group, Separator } from "react-resizable-panels"
import { useStore } from "./store"
import { Toolbar } from "./components/Toolbar"
import { PdfViewer } from "./components/PdfViewer"
import { PageSidebar } from "./components/PageSidebar"
import { ChatPanel } from "./components/ChatPanel"
import { ModelManager } from "./components/ModelManager"
import { WelcomeScreen } from "./components/WelcomeScreen"

function App() {
  const { pdfInfo, sidebarOpen, chatOpen } = useStore()

  return (
    <div className="flex h-screen flex-col">
      <Toolbar />

      <div className="flex-1 overflow-hidden">
        {!pdfInfo ? (
          <WelcomeScreen />
        ) : (
          <Group orientation="horizontal" className="h-full">
            {/* Sidebar */}
            {sidebarOpen && (
              <>
                <Panel defaultSize={15} minSize={10} maxSize={25}>
                  <PageSidebar />
                </Panel>
                <Separator className="w-px bg-border hover:bg-primary/50 transition-colors" />
              </>
            )}

            {/* PDF Viewer */}
            <Panel defaultSize={chatOpen ? 55 : 85} minSize={30}>
              <PdfViewer />
            </Panel>

            {/* Chat */}
            {chatOpen && (
              <>
                <Separator className="w-px bg-border hover:bg-primary/50 transition-colors" />
                <Panel defaultSize={30} minSize={20} maxSize={45}>
                  <ChatPanel />
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>

      <ModelManager />
    </div>
  )
}

export default App
