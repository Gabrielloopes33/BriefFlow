import { create } from "zustand";
import type { GraphNode } from "@/hooks/use-agent-graphs";

export interface BoardNode {
  id: string;
  agentId: string;
  type: GraphNode["type"];
  label: string;
  position: { x: number; y: number };
  config?: Record<string, any>;
  status?: "idle" | "running" | "completed" | "failed";
  outputSummary?: string;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface AgentBoardState {
  nodes: BoardNode[];
  edges: BoardEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isExecuting: boolean;
  executionLogs: Array<{
    timestamp: string;
    nodeId: string;
    message: string;
    type: "info" | "success" | "error";
  }>;

  // Actions
  setNodes: (nodes: BoardNode[]) => void;
  setEdges: (edges: BoardEdge[]) => void;
  addNode: (node: BoardNode) => void;
  updateNode: (id: string, updates: Partial<BoardNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: BoardEdge) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setIsExecuting: (value: boolean) => void;
  addLog: (log: { nodeId: string; message: string; type: "info" | "success" | "error" }) => void;
  clearLogs: () => void;
  setNodeStatus: (nodeId: string, status: BoardNode["status"], outputSummary?: string) => void;
  reset: () => void;
}

export const useAgentBoardStore = create<AgentBoardState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isExecuting: false,
  executionLogs: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setIsExecuting: (value) => set({ isExecuting: value }),

  addLog: (log) =>
    set((state) => ({
      executionLogs: [
        ...state.executionLogs,
        { ...log, timestamp: new Date().toLocaleTimeString() },
      ],
    })),

  clearLogs: () => set({ executionLogs: [] }),

  setNodeStatus: (nodeId, status, outputSummary) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, status, outputSummary: outputSummary || n.outputSummary } : n
      ),
    })),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isExecuting: false,
      executionLogs: [],
    }),
}));
