import { NodeShell } from './shared/NodeShell';

export function TransformNode({ data }) {
  return (
    <NodeShell title="Transform" variant="processing">
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>X</span><span className="text-white">{data.x ?? 0}px</span></div>
        <div className="flex justify-between"><span>Y</span><span className="text-white">{data.y ?? 0}px</span></div>
        <div className="flex justify-between"><span>Scale</span><span className="text-white">{data.scale ?? 1}×</span></div>
      </div>
    </NodeShell>
  );
}
