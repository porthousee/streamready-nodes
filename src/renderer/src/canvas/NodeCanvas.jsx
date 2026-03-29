import { ReactFlow, Background, Controls, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '../store/graphStore';
import { nodeTypes } from './nodeTypes';

export function NodeCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode } = useGraphStore();

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#1e2a40"
        />
        <Controls className="!bg-surface !border-border" />
      </ReactFlow>
    </div>
  );
}
