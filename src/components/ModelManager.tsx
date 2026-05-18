import { useEffect, useState } from "react"
import { Cloud, Download, Play, PlugZap, Trash2, Power, RefreshCw, MessageSquare, Brain, Target } from "lucide-react"
import { useStore, type CloudModelEntry, type ModelEntry } from "../store"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { cn } from "../lib/utils"

type ModelCategory = "chat" | "embedding" | "reranker"
type ModelSource = "local" | "cloud"

const DEFAULT_EMBEDDINGS = [
  { id: "BAAI_bge-small-en-v1.5", rawId: "BAAI/bge-small-en-v1.5", name: "BAAI/bge-small-en-v1.5", model_type: "Embedding", model_size_mb: 133 },
  { id: "nomic-ai_nomic-embed-text-v1.5", rawId: "nomic-ai/nomic-embed-text-v1.5", name: "nomic-ai/nomic-embed-text-v1.5", model_type: "Embedding", model_size_mb: 540 },
]

const DEFAULT_RERANKERS = [
  { id: "cross-encoder_ms-marco-MiniLM-L-6-v2", rawId: "cross-encoder/ms-marco-MiniLM-L-6-v2", name: "cross-encoder/ms-marco-MiniLM-L-6-v2", model_type: "Reranker", model_size_mb: 91 },
  { id: "BAAI_bge-reranker-base", rawId: "BAAI/bge-reranker-base", name: "BAAI/bge-reranker-base", model_type: "Reranker", model_size_mb: 1100 },
]

export function ModelManager() {
  const {
    modelManagerOpen,
    setModelManagerOpen,
    downloadProgress,
    loadedModel,
    activeEmbeddingModel,
    cloudModels,
    addCloudModel,
    deleteCloudModel,
    setLoadedModel,
    setActiveEmbeddingModel,
    setDownloadProgress,
    loadModel,
    unloadModel,
    loadEmbeddingModel,
    unloadEmbeddingModel,
    listModels,
    downloadModel,
    deleteModel,
    testCloudModel,
  } = useStore()
  
  const [activeCategory, setActiveCategory] = useState<ModelCategory>("chat")
  const [activeSource, setActiveSource] = useState<ModelSource>("local")

  const [models, setModels] = useState<ModelEntry[]>([])
  
  // Single input for HuggingFace ID instead of separate url/id
  const [localDownloadId, setLocalDownloadId] = useState("")
  
  const [cloudName, setCloudName] = useState("")
  const [cloudVendor, setCloudVendor] = useState("OpenAI compatible")
  const [cloudBaseUrl, setCloudBaseUrl] = useState("")
  const [cloudApiKey, setCloudApiKey] = useState("")
  const [cloudModelName, setCloudModelName] = useState("")
  const [testResult, setTestResult] = useState<string>("")
  const [categoryLoading, setCategoryLoading] = useState<Record<ModelCategory, boolean>>({
    chat: false,
    embedding: false,
    reranker: false
  })
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null)

  // --- MOCK STATES FOR ACTIVE CATEGORIES ---
  const [mockActiveReranker, setMockActiveReranker] = useState<any>(null)

  const [mockCloudEmbeddings, setMockCloudEmbeddings] = useState<any[]>([])
  const [mockCloudRerankers, setMockCloudRerankers] = useState<any[]>([])
  // --------------------------------------

  useEffect(() => {
    if (modelManagerOpen) {
      refreshModels()
    }
  }, [modelManagerOpen])

  useEffect(() => {
    if (downloadProgress && downloadProgress.percentage >= 100) {
      const t = setTimeout(() => {
        refreshModels()
        setDownloadProgress(null)
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [downloadProgress?.percentage])

  const getEmbeddingsList = () => {
    return DEFAULT_EMBEDDINGS.map(def => {
      const downloaded = models.find(m => m.id === def.id)
      return downloaded ? { ...downloaded, name: def.name, model_type: def.model_type, rawId: def.rawId, isDefault: true } : { ...def, has_model: false, has_tokenizer: false, isDefault: true }
    })
  }

  const getRerankersList = () => {
    return DEFAULT_RERANKERS.map(def => {
      const downloaded = models.find(m => m.id === def.id)
      return downloaded ? { ...downloaded, name: def.name, model_type: def.model_type, rawId: def.rawId, isDefault: true } : { ...def, has_model: false, has_tokenizer: false, isDefault: true }
    })
  }

  const getChatModelsList = () => {
    const defaultIds = [...DEFAULT_EMBEDDINGS, ...DEFAULT_RERANKERS].map(d => d.id)
    return models.filter(m => !defaultIds.includes(m.id))
  }

  async function refreshModels() {
    try {
      const m = await listModels()
      setModels(m)
    } catch (e) {
      console.error("Failed to list models:", e)
    }
  }

  async function handleLoad(modelId: string) {
    const category = activeCategory
    setCategoryLoading(prev => ({ ...prev, [category]: true }))
    setLoadingModelId(modelId)
    if (category === "chat") {
      try {
        await loadModel(modelId)
      } catch (e) {
        console.error("Failed to load model:", e)
      } finally {
        setCategoryLoading(prev => ({ ...prev, chat: false }))
        setLoadingModelId(null)
      }
    } else if (category === "embedding") {
      try {
        await loadEmbeddingModel(modelId)
        const m = getEmbeddingsList().find(x => x.id === modelId)
        if (m) setActiveEmbeddingModel({ id: m.id, name: m.name })
      } catch (e) {
        console.error("Failed to load embedding model:", e)
      } finally {
        setCategoryLoading(prev => ({ ...prev, embedding: false }))
        setLoadingModelId(null)
      }
    } else if (category === "reranker") {
      setCategoryLoading(prev => ({ ...prev, reranker: false }))
      setLoadingModelId(null)
      const m = getRerankersList().find(x => x.id === modelId)
      if (m) setMockActiveReranker({ id: m.id, name: m.name, modelType: m.model_type })
    }
  }

  async function handleUnload() {
    const category = activeCategory
    setCategoryLoading(prev => ({ ...prev, [category]: true }))
    if (category === "chat") {
      try {
        await unloadModel()
      } catch (e) {
        console.error("Failed to unload model:", e)
      } finally {
        setCategoryLoading(prev => ({ ...prev, chat: false }))
      }
    } else if (category === "embedding") {
      try {
        await unloadEmbeddingModel()
        setActiveEmbeddingModel(null)
      } catch (e) {
        console.error("Failed to unload embedding model:", e)
      } finally {
        setCategoryLoading(prev => ({ ...prev, embedding: false }))
      }
    } else if (category === "reranker") {
      setMockActiveReranker(null)
      setCategoryLoading(prev => ({ ...prev, reranker: false }))
    }
  }

  async function handleDownload(customRawId?: string) {
    const rawIdToDownload = typeof customRawId === "string" ? customRawId : localDownloadId.trim();
    if (!rawIdToDownload) return
    
    // Replace slash with underscore so scan_models can see it in a single flat directory
    const modelId = rawIdToDownload.replace(/\//g, "_")
    const url = `https://huggingface.co/${rawIdToDownload}`
    
    try {
      await downloadModel(modelId, url)
      setLocalDownloadId("")
    } catch (e) {
      console.error("Failed to download model:", e)
    }
  }

  async function handleDelete(modelId: string) {
    if (activeCategory === "chat") {
      try {
        await deleteModel(modelId)
        await refreshModels()
      } catch (e) {
        console.error("Failed to delete model:", e)
      }
    } else if (activeCategory === "embedding") {
      try {
        await deleteModel(modelId)
        if (activeEmbeddingModel?.id === modelId) setActiveEmbeddingModel(null)
        await refreshModels()
      } catch (e) {
        console.error("Failed to delete model:", e)
      }
    } else if (activeCategory === "reranker") {
      try {
        await deleteModel(modelId)
        if (mockActiveReranker?.id === modelId) setMockActiveReranker(null)
        await refreshModels()
      } catch (e) {
        console.error("Failed to delete model:", e)
      }
    }
  }

  function useCloudModel(model: CloudModelEntry | any) {
    if (activeCategory === "chat") {
      setLoadedModel({
        id: `cloud:${model.id}`,
        name: model.name,
        modelType: `${model.vendor} · ${model.modelName}`,
        hasTokenizer: false,
        path: model.baseUrl,
        source: "cloud",
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        modelName: model.modelName,
      })
    } else if (activeCategory === "embedding") {
      setActiveEmbeddingModel({
        id: `cloud:${model.id}`,
        name: model.name,
      })
    } else if (activeCategory === "reranker") {
      setMockActiveReranker({
        id: `cloud:${model.id}`,
        name: model.name,
        modelType: `${model.vendor} · ${model.modelName}`,
      })
    }
  }

  async function handleAddCloudModel() {
    if (!cloudName.trim() || !cloudBaseUrl.trim() || !cloudApiKey.trim() || !cloudModelName.trim()) return

    const model: CloudModelEntry = {
      id: crypto.randomUUID(),
      name: cloudName.trim(),
      vendor: cloudVendor.trim() || "OpenAI compatible",
      baseUrl: cloudBaseUrl.trim(),
      apiKey: cloudApiKey.trim(),
      modelName: cloudModelName.trim(),
    }

    if (activeCategory === "chat") {
      addCloudModel(model)
    } else if (activeCategory === "embedding") {
      setMockCloudEmbeddings(prev => [...prev, model])
    } else if (activeCategory === "reranker") {
      setMockCloudRerankers(prev => [...prev, model])
    }
    
    useCloudModel(model)
    setCloudName("")
    setCloudVendor("OpenAI compatible")
    setCloudBaseUrl("")
    setCloudApiKey("")
    setCloudModelName("")
    setTestResult("")
  }

  async function handleTestCloudModel(model?: CloudModelEntry | any) {
    const baseUrl = model?.baseUrl ?? cloudBaseUrl.trim()
    const apiKey = model?.apiKey ?? cloudApiKey.trim()
    const modelName = model?.modelName ?? cloudModelName.trim()
    if (!baseUrl || !apiKey || !modelName) return

    const category = activeCategory
    setCategoryLoading(prev => ({ ...prev, [category]: true }))
    setTestResult("Testing connection...")
    try {
      const result = await testCloudModel(baseUrl, apiKey, modelName)
      setTestResult(result.ok ? "Connection successful" : result.message)
    } catch (e) {
      setTestResult(String(e))
    } finally {
      setCategoryLoading(prev => ({ ...prev, [category]: false }))
    }
  }

  const handleDeleteCloudModel = async (id: string) => {
    if (activeCategory === "chat") {
      await deleteCloudModel(id)
    } else if (activeCategory === "embedding") {
      setMockCloudEmbeddings(prev => prev.filter(m => m.id !== id))
      if (activeEmbeddingModel?.id === `cloud:${id}`) setActiveEmbeddingModel(null)
    } else if (activeCategory === "reranker") {
      setMockCloudRerankers(prev => prev.filter(m => m.id !== id))
      if (mockActiveReranker?.id === `cloud:${id}`) setMockActiveReranker(null)
    }
  }

  // Derived state for the UI
  const currentActiveModel = 
    activeCategory === "chat" ? loadedModel :
    activeCategory === "embedding" ? activeEmbeddingModel : 
    mockActiveReranker

  const categoryLabel = 
    activeCategory === "chat" ? "Chat Model" :
    activeCategory === "embedding" ? "Embedding Model" : 
    "Reranker Model"
    
  const displayLocalModels = 
    activeCategory === "chat" ? getChatModelsList() :
    activeCategory === "embedding" ? getEmbeddingsList() :
    getRerankersList()
    
  const displayCloudModels = 
    activeCategory === "chat" ? cloudModels :
    activeCategory === "embedding" ? mockCloudEmbeddings :
    mockCloudRerankers

  return (
    <Dialog open={modelManagerOpen} onOpenChange={setModelManagerOpen}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden flex flex-col h-[750px] bg-white border-gray-200">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">Settings Hub</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <div className="w-64 border-r border-gray-200 bg-gray-50/50 p-4 space-y-1.5 shrink-0">
            <button
              onClick={() => { setActiveCategory("chat"); setActiveSource("local"); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                activeCategory === "chat" ? "bg-gray-200 font-semibold text-gray-900" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              💬 Chat Models (LLM)
            </button>
            <button
              onClick={() => { setActiveCategory("embedding"); setActiveSource("local"); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                activeCategory === "embedding" ? "bg-gray-200 font-semibold text-gray-900" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Brain className="h-4 w-4" />
              🧠 Embeddings (RAG)
            </button>
            <button
              onClick={() => { setActiveCategory("reranker"); setActiveSource("local"); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                activeCategory === "reranker" ? "bg-gray-200 font-semibold text-gray-900" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Target className="h-4 w-4" />
              🎯 Rerankers (RAG)
            </button>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden bg-white">
            {/* Active Model Card */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between shrink-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">Active {categoryLabel}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {currentActiveModel ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      {currentActiveModel.name} <span className="text-xs text-gray-400">({currentActiveModel.modelType})</span>
                    </span>
                  ) : (
                    "None selected"
                  )}
                </p>
              </div>
              {currentActiveModel && (
                <Button variant="outline" size="sm" onClick={handleUnload} disabled={categoryLoading[activeCategory]} className="rounded-xl min-w-[120px]">
                  {categoryLoading[activeCategory] ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Unloading...
                    </>
                  ) : (
                    <>
                      <Power className="mr-1.5 h-3.5 w-3.5" />
                      Unload / Deactivate
                    </>
                  )}
                </Button>
              )}
            </div>

            <Tabs value={activeSource} onValueChange={(v) => setActiveSource(v as ModelSource)} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0 rounded-xl bg-gray-100/80 p-1">
                <TabsTrigger value="local" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">💻 Local Models</TabsTrigger>
                <TabsTrigger value="cloud" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">☁️ Cloud / API</TabsTrigger>
              </TabsList>

              {/* LOCAL MODELS CONTENT */}
              <TabsContent value="local" className="flex-1 flex flex-col min-h-0 space-y-4 data-[state=active]:flex mt-0 outline-none">
                <div className="flex items-center justify-between shrink-0">
                  <h4 className="text-sm font-semibold text-gray-900">Configured Local Models</h4>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={refreshModels}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 rounded-xl border border-gray-200 bg-gray-50/30">
                  {displayLocalModels.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-400">
                      No local models configured. Download one below.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {displayLocalModels.map((m) => {
                        const mId = m.rawId ? m.rawId.replace(/\//g, "_") : m.id;
                        const isDownloading = downloadProgress && downloadProgress.model_id === mId;

                        return (
                          <div key={m.id} className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50/80 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{m.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {isDownloading ? (
                                  <span className="text-blue-600 font-medium">
                                    Downloading: {Math.round(downloadProgress.bytes_downloaded / 1024 / 1024)}MB / {Math.round(downloadProgress.total_bytes / 1024 / 1024)}MB ({Math.round(downloadProgress.percentage)}%)
                                  </span>
                                ) : (
                                  <>
                                    {m.model_type} &middot; {m.model_size_mb} MB
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {!m.has_model ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleDownload(m.rawId || m.id)}
                                  disabled={categoryLoading[activeCategory] || isDownloading}
                                  className="rounded-xl shadow-sm"
                                >
                                  {isDownloading ? (
                                    <>
                                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="mr-1.5 h-3.5 w-3.5" />
                                      Download
                                    </>
                                  )}
                                </Button>
                              ) : currentActiveModel?.id !== m.id ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLoad(m.id)}
                                  disabled={categoryLoading[activeCategory]}
                                  className="rounded-xl shadow-sm min-w-[100px]"
                                >
                                  {categoryLoading[activeCategory] && loadingModelId === m.id ? (
                                    <>
                                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    "Load"
                                  )}
                                </Button>
                              ) : null}
                              {(m.has_model || !m.isDefault) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg"
                                  onClick={() => handleDelete(m.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="pt-2 shrink-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Download & Initialize</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Enter a HuggingFace Model ID (e.g., BAAI/bge-small-en-v1.5)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="HuggingFace Model ID"
                      value={localDownloadId}
                      onChange={(e) => setLocalDownloadId(e.target.value)}
                      className="flex-1 rounded-xl border-gray-200 bg-white"
                    />
                    <Button
                      onClick={() => handleDownload(localDownloadId)}
                      disabled={!localDownloadId.trim()}
                      className="rounded-xl shadow-sm"
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* CLOUD MODELS CONTENT */}
              <TabsContent value="cloud" className="flex-1 flex flex-col min-h-0 space-y-4 data-[state=active]:flex mt-0 outline-none">
                <h4 className="text-sm font-semibold text-gray-900 shrink-0">Configured Cloud Models</h4>
                
                <ScrollArea className="flex-1 rounded-xl border border-gray-200 bg-gray-50/30">
                  {displayCloudModels.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-400">
                      No cloud models configured.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {displayCloudModels.map((m) => (
                        <div key={m.id} className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50/80 transition-colors">
                          <div className="min-w-0 pr-4">
                            <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="truncate text-xs text-gray-500 mt-0.5">
                              {m.vendor} &middot; {m.modelName}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleTestCloudModel(m)} disabled={categoryLoading[activeCategory]} className="rounded-xl shadow-sm">
                              {categoryLoading[activeCategory] ? (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <PlugZap className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Test
                            </Button>
                            <Button size="sm" onClick={() => useCloudModel(m)} className="rounded-xl shadow-sm">
                              <Play className="mr-1.5 h-3.5 w-3.5" />
                              Use
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg"
                              onClick={() => handleDeleteCloudModel(m.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="pt-2 shrink-0 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Add OpenAI-Compatible Model</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Display name" value={cloudName} onChange={(e) => setCloudName(e.target.value)} className="rounded-xl border-gray-200" />
                    <Input placeholder="Vendor" value={cloudVendor} onChange={(e) => setCloudVendor(e.target.value)} className="rounded-xl border-gray-200" />
                    <Input placeholder="Base URL, e.g. https://api.openai.com" value={cloudBaseUrl} onChange={(e) => setCloudBaseUrl(e.target.value)} className="rounded-xl border-gray-200" />
                    <Input placeholder="Model, e.g. gpt-4o-mini" value={cloudModelName} onChange={(e) => setCloudModelName(e.target.value)} className="rounded-xl border-gray-200" />
                    <Input className="col-span-2 rounded-xl border-gray-200" placeholder="API key" type="password" value={cloudApiKey} onChange={(e) => setCloudApiKey(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => handleTestCloudModel()} disabled={categoryLoading[activeCategory] || !cloudBaseUrl.trim() || !cloudApiKey.trim() || !cloudModelName.trim()} className="rounded-xl shadow-sm">
                      {categoryLoading[activeCategory] ? (
                        <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <PlugZap className="mr-1.5 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                    <Button onClick={handleAddCloudModel} disabled={!cloudName.trim() || !cloudBaseUrl.trim() || !cloudApiKey.trim() || !cloudModelName.trim()} className="rounded-xl shadow-sm">
                      <Cloud className="mr-1.5 h-4 w-4" />
                      Save and Use
                    </Button>
                    {testResult && <p className="text-xs font-medium text-gray-600">{testResult}</p>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
