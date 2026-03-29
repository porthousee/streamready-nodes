import { NodeShell } from './shared/NodeShell';
import { Handle, Position } from '@xyflow/react';

export function CombinerNode({ data }) {
  const count = data.inputsCount ?? 2;

  return (
    <NodeShell title="Combiner" variant="processing" hasInput={false}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="relative flex items-center h-6 mb-1">
          <Handle
            type="target"
            position={Position.Left}
            id={`input-${i}`}
            style={{ top: 'auto', position: 'relative', transform: 'none', left: -12 }}
            className="!w-3 !h-3 !bg-purple !border-2 !border-bg"
          />
          <span className="text-muted ml-1">Layer {i}</span>
        </div>
      ))}
    </NodeShell>
  );
}
