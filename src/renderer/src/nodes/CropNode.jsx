import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function CropNode({ id, data }) {
  const preview = useGraphStore(s => s.nodePreviews[id]);
  return (
    <NodeShell title="Crop" variant="processing" previewSrc={preview}>
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Top</span><span className="text-white">{data.top ?? 0}%</span></div>
        <div className="flex justify-between"><span>Bottom</span><span className="text-white">{data.bottom ?? 0}%</span></div>
        <div className="flex justify-between"><span>Left</span><span className="text-white">{data.left ?? 0}%</span></div>
        <div className="flex justify-between"><span>Right</span><span className="text-white">{data.right ?? 0}%</span></div>
      </div>
    </NodeShell>
  );
}
