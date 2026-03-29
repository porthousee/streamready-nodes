import { NodeShell } from './shared/NodeShell';

export function BlurNode({ data }) {
  return (
    <NodeShell title="Blur" variant="processing">
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Amount</span><span className="text-white">{data.amount ?? 10}</span></div>
        <div className="flex justify-between"><span>Type</span><span className="text-white">{data.blurType ?? 'gaussian'}</span></div>
      </div>
    </NodeShell>
  );
}
