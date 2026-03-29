import { useState, useEffect } from 'react';
import { NodeCanvas } from './canvas/NodeCanvas';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { ProgressBar } from './panels/ProgressBar';
import { useGraphStore } from './store/graphStore';
import { useNodePreviews } from './hooks/useNodePreviews';

const NODE_TYPES = [
  { type: 'cropNode', label: 'Crop' },
  { type: 'transformNode', label: 'Transform' },
  { type: 'blurNode', label: 'Blur' },
  { type: 'maskNode', label: 'Mask' },
  { type: 'combinerNode', label: 'Combiner' },
];

function Toolbar({ onAddNode, onRender, onSave, onOpen, renderStatus, clipDuration, previewTimestamp, onScrub }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="h-10 bg-surface border-b border-border flex items-center px-3 gap-2 shrink-0">
      <span className="text-sm font-bold font-sans bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent mr-2">
        StreamReady Nodes
      </span>

      <div className="relative">
        <button
          onClick={() => setShowAdd(v => !v)}
          className="px-3 py-1 text-xs bg-purple text-white rounded hover:bg-opacity-80 font-sans"
        >
          + Add Node
        </button>
        {showAdd && (
          <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded shadow-lg z-50 min-w-[120px]">
            {NODE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => { onAddNode(type); setShowAdd(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-bg font-sans"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onOpen} className="px-3 py-1 text-xs border border-border text-muted hover:text-white rounded font-sans">
        Open
      </button>
      <button onClick={onSave} className="px-3 py-1 text-xs border border-border text-muted hover:text-white rounded font-sans">
        Save
      </button>

      {clipDuration > 0 && (
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-xs text-muted font-mono shrink-0">{previewTimestamp.toFixed(1)}s</span>
          <input
            type="range"
            min={0}
            max={clipDuration}
            step={0.1}
            value={previewTimestamp}
            onChange={e => onScrub(parseFloat(e.target.value))}
            className="nodrag flex-1 accent-purple"
          />
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={onRender}
        disabled={renderStatus === 'rendering'}
        className="px-4 py-1 text-xs font-semibold bg-gradient-to-r from-purple to-pink text-white rounded hover:opacity-90 disabled:opacity-50 font-sans"
      >
        {renderStatus === 'rendering' ? 'Rendering…' : '▶ Render'}
      </button>
    </div>
  );
}

export default function App() {
  const addNode = useGraphStore(s => s.addNode);
  const getGraph = useGraphStore(s => s.getGraph);
  const loadGraph = useGraphStore(s => s.loadGraph);
  const setRenderState = useGraphStore(s => s.setRenderState);
  const renderState = useGraphStore(s => s.renderState);
  const nodes = useGraphStore(s => s.nodes);
  const clipDuration = useGraphStore(s => s.clipDuration);
  const previewTimestamp = useGraphStore(s => s.previewTimestamp);
  const setPreviewTimestamp = useGraphStore(s => s.setPreviewTimestamp);
  const setClipDuration = useGraphStore(s => s.setClipDuration);

  useNodePreviews();

  // Update clipDuration when source file changes
  const sourceNode = nodes.find(n => n.type === 'sourceNode');
  const inputPath = sourceNode?.data?.filePath ?? null;
  useEffect(() => {
    if (!inputPath) { setClipDuration(0); return; }
    window.electronAPI.getVideoDuration(inputPath).then(setClipDuration).catch(() => {});
  }, [inputPath]);

  useEffect(() => {
    const remove = window.electronAPI.onRenderProgress((progress) => {
      setRenderState({ status: 'rendering', progress, outputPath: null, error: null });
    });
    return remove;
  }, []);

  const handleAddNode = (type) => {
    addNode(type, { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 });
  };

  const handleRender = async () => {
    const sourceNode = nodes.find(n => n.type === 'sourceNode');
    const outputNode = nodes.find(n => n.type === 'outputNode');

    if (!sourceNode?.data?.filePath) {
      alert('Load a source clip first (click the Source node).');
      return;
    }
    if (!outputNode?.data?.filePath) {
      alert('Set an output path first (click the Output node).');
      return;
    }

    setRenderState({ status: 'rendering', progress: 0, outputPath: null, error: null });

    try {
      const outputPath = await window.electronAPI.renderGraph(
        getGraph(),
        sourceNode.data.filePath,
        outputNode.data.filePath,
      );
      setRenderState({ status: 'done', progress: 100, outputPath, error: null });
    } catch (e) {
      setRenderState({ status: 'error', progress: 0, outputPath: null, error: e.message });
    }
  };

  const handleSave = () => {
    const json = JSON.stringify(getGraph(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          loadGraph(JSON.parse(ev.target.result));
        } catch {
          alert('Invalid project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <Toolbar
        onAddNode={handleAddNode}
        onRender={handleRender}
        onSave={handleSave}
        onOpen={handleOpen}
        renderStatus={renderState.status}
        clipDuration={clipDuration}
        previewTimestamp={previewTimestamp}
        onScrub={setPreviewTimestamp}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <NodeCanvas />
          <PreviewPanel />
        </div>
        <PropertiesPanel />
      </div>
      <ProgressBar progress={renderState.progress} status={renderState.status} />
    </div>
  );
}
