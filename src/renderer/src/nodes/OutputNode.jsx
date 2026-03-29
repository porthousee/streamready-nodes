import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function OutputNode({ id, data }) {
  const updateNodeData = useGraphStore(s => s.updateNodeData);
  const preview = useGraphStore(s => s.nodePreviews[id]);

  const handlePick = async () => {
    const path = await window.electronAPI.pickOutputFile();
    if (path) updateNodeData(id, { filePath: path });
  };

  const filename = data.filePath ? data.filePath.split(/[\\/]/).pop() : null;

  return (
    <NodeShell title="Output" variant="output" hasOutput={false} previewSrc={preview}>
      <button
        onClick={handlePick}
        className="nodrag w-full text-left truncate text-pink hover:text-white transition-colors cursor-pointer"
      >
        {filename ?? 'Click to set output...'}
      </button>
    </NodeShell>
  );
}
