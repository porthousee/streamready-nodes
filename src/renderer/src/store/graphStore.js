import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

const INITIAL_NODES = [
  {
    id: 'source',
    type: 'sourceNode',
    position: { x: 80, y: 300 },
    data: { filePath: null },
    deletable: false,
  },
  {
    id: 'output',
    type: 'outputNode',
    position: { x: 900, y: 300 },
    data: { filePath: null },
    deletable: false,
  },
];

export const useGraphStore = create((set, get) => ({
  nodes: INITIAL_NODES,
  edges: [],
  selectedNodeId: null,
  renderState: { status: 'idle', progress: 0, outputPath: null, error: null },
  previewImage: null,

  onNodesChange: (changes) =>
    set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  onEdgesChange: (changes) =>
    set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) =>
    set(s => ({ edges: addEdge(connection, s.edges) })),

  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`;
    const defaultData = {
      cropNode: { top: 0, bottom: 0, left: 0, right: 0 },
      transformNode: { x: 0, y: 0, scale: 1 },
      blurNode: { amount: 10, blurType: 'gaussian' },
      maskNode: { maskType: 'draw', shapes: [] },
      combinerNode: { inputsCount: 2, layerOrder: ['input-0', 'input-1'] },
    };
    set(s => ({
      nodes: [...s.nodes, { id, type, position, data: defaultData[type] ?? {} }],
    }));
  },

  updateNodeData: (id, data) =>
    set(s => ({
      nodes: s.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  setRenderState: (renderState) => set({ renderState }),

  setPreviewImage: (previewImage) => set({ previewImage }),

  getGraph: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map(({ id, type, position, data }) => ({ id, type, ...position, data })),
      edges: edges.map(({ id, source, sourceHandle, target, targetHandle }) =>
        ({ id, source, sourceHandle, target, targetHandle })),
    };
  },

  loadGraph: (json) => {
    const nodes = json.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: { x: n.x, y: n.y },
      data: n.data,
      deletable: n.type !== 'sourceNode' && n.type !== 'outputNode',
    }));
    set({ nodes, edges: json.edges, selectedNodeId: null });
  },
}));
