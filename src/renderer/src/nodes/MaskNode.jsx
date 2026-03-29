import { NodeShell } from './shared/NodeShell';

export function MaskNode({ data }) {
  const count = data.shapes?.length ?? 0;
  return (
    <NodeShell title="Mask" variant="processing">
      <div className="text-white">{count === 0 ? 'No shapes' : `${count} shape${count > 1 ? 's' : ''}`}</div>
    </NodeShell>
  );
}
