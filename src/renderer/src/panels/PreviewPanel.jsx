import { useState } from 'react';
import { useGraphStore } from '../store/graphStore';

export function PreviewPanel() {
  const previewImage = useGraphStore(s => s.previewImage);
  const setPreviewImage = useGraphStore(s => s.setPreviewImage);
  const nodes = useGraphStore(s => s.nodes);
  const getGraph = useGraphStore(s => s.getGraph);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState(0);

  const sourceNode = nodes.find(n => n.type === 'sourceNode');
  const inputPath = sourceNode?.data?.filePath ?? null;

  const handlePreview = async () => {
    if (!inputPath) { setError('No source clip loaded'); return; }
    setLoading(true);
    setError(null);
    try {
      const path = await window.electronAPI.previewGraph(getGraph(), inputPath, timestamp);
      setPreviewImage(`file://${path}?t=${Date.now()}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-48 border-t border-border bg-surface flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
        <span className="text-xs text-muted font-sans uppercase tracking-wide flex-1">Preview</span>
        <input
          type="number"
          value={timestamp}
          min={0}
          step={0.5}
          onChange={e => setTimestamp(parseFloat(e.target.value))}
          className="w-16 bg-bg border border-border rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-purple"
        />
        <span className="text-xs text-muted font-mono">s</span>
        <button
          onClick={handlePreview}
          disabled={loading}
          className="px-2 py-0.5 text-xs bg-purple text-white rounded hover:bg-opacity-80 disabled:opacity-50 font-sans"
        >
          {loading ? '...' : 'Preview'}
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
        {!error && previewImage && <img src={previewImage} className="max-h-full max-w-full object-contain" alt="preview" />}
        {!error && !previewImage && <p className="text-xs text-muted">No preview yet</p>}
      </div>
    </div>
  );
}
