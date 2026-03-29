import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function SourceNode({ id, data }) {
  const updateNodeData = useGraphStore(s => s.updateNodeData);
  const preview = useGraphStore(s => s.nodePreviews[id]);

  const handlePick = async (e) => {
    e.stopPropagation();
    const path = await window.electronAPI.pickInputFile();
    if (path) updateNodeData(id, { filePath: path });
  };

  const filename = data.filePath ? data.filePath.split(/[\\/]/).pop() : null;

  return (
    <NodeShell title="Source" variant="source" hasInput={false} previewSrc={preview}>
      <button
        onClick={handlePick}
        className="nodrag w-full text-left truncate text-purple hover:text-white transition-colors cursor-pointer"
      >
        {filename ?? 'Click to open clip...'}
      </button>
    </NodeShell>
  );
}
