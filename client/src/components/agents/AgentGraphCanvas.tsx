import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAgentBoardStore } from "@/stores/agent-board-store";
import { getNodeDisplayInfo, getNodeStatusClasses } from "@/lib/node-display-config";

// Custom Node Component
function AgentNode({ data, selected }: { data: any; selected?: boolean }) {
  const displayInfo = getNodeDisplayInfo(data.type);
  const status = data.status || "idle";
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border-2 bg-background shadow-sm min-w-[180px] transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      } ${isRunning ? "animate-pulse" : ""}`}
      style={{ borderColor: displayInfo.color }}
      title={displayInfo.description}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" style={{ background: displayInfo.color }} />
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg"
          style={{ backgroundColor: displayInfo.color }}
        >
          {displayInfo.icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{data.label || displayInfo.label}</p>
          <p className="text-xs text-muted-foreground">{displayInfo.description}</p>
        </div>
      </div>
      {/* Status indicators */}
      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
          <span className="text-white text-[8px]">✓</span>
        </div>
      )}
      {isFailed && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
          <span className="text-white text-[8px]">✕</span>
        </div>
      )}
      {isRunning && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-background animate-ping" />
      )}
      {/* Output summary tooltip */}
      {data.outputSummary && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-muted-foreground truncate" title={data.outputSummary}>
            {data.outputSummary}
          </p>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" style={{ background: displayInfo.color }} />
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
};

interface AgentGraphCanvasProps {
  readOnly?: boolean;
  onNodesChange?: (nodes: any[]) => void;
  onEdgesChange?: (edges: any[]) => void;
}

export function AgentGraphCanvas({ readOnly = false, onNodesChange, onEdgesChange }: AgentGraphCanvasProps) {
  const storeNodes = useAgentBoardStore((s) => s.nodes);
  const storeEdges = useAgentBoardStore((s) => s.edges);
  const setSelectedNode = useAgentBoardStore((s) => s.setSelectedNode);
  const setSelectedEdge = useAgentBoardStore((s) => s.setSelectedEdge);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState<Edge>([]);

  // Sync store -> ReactFlow
  useEffect(() => {
    const startDisplayInfo = getNodeDisplayInfo("start");
    const startNode: Node = {
      id: "__start__",
      type: "agent",
      position: { x: 250, y: 20 },
      data: {
        label: startDisplayInfo.label,
        type: "start",
        agentId: "",
        status: "idle",
        outputSummary: undefined,
      },
      selected: false,
      draggable: false,
      deletable: false,
    };

    const rfNodes: Node[] = storeNodes.map((n) => {
      const displayInfo = getNodeDisplayInfo(n.type);
      return {
        id: n.id,
        type: "agent",
        position: n.position,
        data: {
          label: n.label || displayInfo.label,
          type: n.type,
          agentId: n.agentId,
          status: n.status,
          outputSummary: n.outputSummary,
        },
        selected: false,
      };
    });
    setNodes([startNode, ...rfNodes]);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    const rfEdges: Edge[] = storeEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      style: { stroke: "#64748b", strokeWidth: 2 },
    }));
    setEdges(rfEdges);
  }, [storeEdges, setEdges]);

  // Sync ReactFlow -> store (for persistence)
  useEffect(() => {
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange]);

  useEffect(() => {
    onEdgesChange?.(edges);
  }, [edges, onEdgesChange]);

  const addEdgeToStore = useAgentBoardStore((s) => s.addEdge);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      const newEdge: Edge = {
        ...connection,
        id: `edge-${Date.now()}`,
        style: { stroke: "#64748b", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      // Sync to Zustand store so save works
      addEdgeToStore({
        id: newEdge.id,
        source: connection.source!,
        target: connection.target!,
        label: undefined,
        animated: false,
      });
    },
    [readOnly, setEdges, addEdgeToStore]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === "__start__") return; // START node is not selectable
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChangeInternal}
        onEdgesChange={readOnly ? undefined : onEdgesChangeInternal}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => getNodeDisplayInfo(node.data?.type as string).color}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>
    </div>
  );
}
