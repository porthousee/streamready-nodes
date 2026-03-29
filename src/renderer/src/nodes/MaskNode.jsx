import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function MaskNode({ id, data }) {
  const preview = useGraphStore(s => s.nodePreviews[id]);
  const count = data.shapes?.length ?? 0;
  return (
    <NodeShell title="Mask" variant="processing" previewSrc={preview}>
      <div className="text-white">{count === 0 ? 'No shapes' : `${count} shape${count > 1 ? 's' : ''}`}</div>
    </NodeShell>
  );
}
