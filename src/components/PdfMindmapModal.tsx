import { useEffect, useState } from "react"
import { ReactFlow, Controls, Background, Node, Edge, Position, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import { useStore, OutlineItem } from "../store"
import { usePdf } from "../hooks/usePdf"
import { X, Network, FileText } from "lucide-react"

const nodeWidth = 200;
const nodeHeight = 60;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set rankdir to LR (Left to Right) and greatly increase spacing
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
    node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes, edges };
};

function CustomNode({ data }: any) {
  return (
    <div className="px-3 py-2 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] rounded-lg bg-white/95 backdrop-blur-md border border-gray-200/80 text-gray-800 w-[200px] transition-all hover:border-blue-400/60 hover:bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:scale-[1.02] cursor-pointer">
      <div className="flex justify-between items-start gap-2">
        <div className="font-medium text-[13px] leading-tight whitespace-normal break-words">{data.label}</div>
        <div className="text-[9px] text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded-full border border-blue-100 font-semibold shrink-0 mt-0.5">
          p. {data.pageIndex + 1}
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

function PdfMindmapCanvas() {
  const { setMindmapOpen, pdfOutline } = useStore()
  const { goToPage } = usePdf()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { fitView } = useReactFlow()
  const [hasLayouted, setHasLayouted] = useState(false)

  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    newNodes.push({
      id: "root",
      type: "custom",
      data: { label: "PDF Document Root", pageIndex: 0 },
      position: { x: 0, y: 0 },
    });

    let nodeIdCounter = 0;

    function traverse(items: OutlineItem[], parentId: string) {
      items.forEach((item) => {
        const id = `node-${nodeIdCounter++}`;
        newNodes.push({
          id,
          type: "custom",
          data: { label: item.title, pageIndex: item.pageIndex },
          position: { x: 0, y: 0 },
        });

        newEdges.push({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#cbd5e1', strokeWidth: 2 },
        });

        if (item.items && item.items.length > 0) {
          traverse(item.items, id);
        }
      });
    }

    if (pdfOutline && pdfOutline.length > 0) {
      traverse(pdfOutline, "root");
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setHasLayouted(true)
  }, [pdfOutline, setNodes, setEdges]);

  useEffect(() => {
    if (hasLayouted) {
      // Small timeout to allow React Flow to process node dimensions before fitting view
      setTimeout(() => {
        fitView({ padding: 0.2, includeHiddenNodes: true })
      }, 50)
    }
  }, [hasLayouted, fitView])

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    if (node.data && typeof node.data.pageIndex === "number") {
      goToPage(node.data.pageIndex);
      setMindmapOpen(false);
    }
  };

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        panOnScroll={false}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
        minZoom={0.05}
      >
        <Background color="#cbd5e1" gap={24} size={2} />
        <Controls className="bg-white border-gray-200 fill-gray-600 shadow-sm" />
      </ReactFlow>
    </div>
  )
}

export function PdfMindmapModal() {
  const { mindmapOpen, setMindmapOpen } = useStore()

  if (!mindmapOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl animate-in fade-in duration-200 flex flex-col">
      <div className="w-full h-screen">
        <ReactFlowProvider>
          <PdfMindmapCanvas />
        </ReactFlowProvider>
      </div>

      {/* Top Left Floating Switch */}
      <div className="absolute top-4 left-4 z-[110] flex bg-white/60 backdrop-blur-md p-0.5 rounded-lg border border-gray-200/50 shadow-md">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-gray-900 text-[13px] font-medium shadow-[0_1px_4px_rgb(0,0,0,0.04)] border border-gray-200/80 transition-colors">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Current Document
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-500 text-[13px] font-medium transition-colors cursor-not-allowed opacity-70">
          <Network className="w-3.5 h-3.5" />
          Project Knowledge Graph <span className="text-[9px] bg-gray-100 px-1 py-0.5 rounded text-gray-500 ml-1">Coming Soon</span>
        </button>
      </div>

      {/* Top Right Close Button */}
      <button
        onClick={() => setMindmapOpen(false)}
        className="absolute top-4 right-4 z-[110] p-1.5 rounded-full bg-white/60 backdrop-blur-md text-gray-500 hover:text-gray-900 hover:bg-white transition-all border border-gray-200/50 shadow-md hover:scale-105"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
