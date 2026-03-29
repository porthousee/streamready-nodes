import { NodeShell } from './shared/NodeShell';

export function CropNode({ data }) {
  return (
    <NodeShell title="Crop" variant="processing">
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Top</span><span className="text-white">{data.top ?? 0}%</span></div>
        <div className="flex justify-between"><span>Bottom</span><span className="text-white">{data.bottom ?? 0}%</span></div>
        <div className="flex justify-between"><span>Left</span><span className="text-white">{data.left ?? 0}%</span></div>
        <div className="flex justify-between"><span>Right</span><span className="text-white">{data.right ?? 0}%</span></div>
      </div>
    </NodeShell>
  );
}
