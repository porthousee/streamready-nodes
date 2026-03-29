import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function SourceNode({ id, data }) {
  const updateNodeData = useGraphStore(s => s.updateNodeData);

  const handlePick = async (e) => {
    e.stopPropagation();
    console.log('handlePick fired, electronAPI:', window.electronAPI);
    const path = await window.electronAPI.pickInputFile();
    console.log('picked path:', path);
    if (path) updateNodeData(id, { filePath: path });
  };

  const filename = data.filePath ? data.filePath.split(/[\\/]/).pop() : null;

  return (
    <NodeShell title="Source" variant="source" hasInput={false}>
      <button
        onClick={handlePick}
        className="nodrag w-full text-left truncate text-purple hover:text-white transition-colors cursor-pointer"
      >
        {filename ?? 'Click to open clip...'}
      </button>
    </NodeShell>
  );
}
