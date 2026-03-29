import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';

export function useNodePreviews() {
  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const setNodePreviews = useGraphStore(s => s.setNodePreviews);
  const previewTimestamp = useGraphStore(s => s.previewTimestamp);
  const getGraph = useGraphStore(s => s.getGraph);

  const sourceNode = nodes.find(n => n.type === 'sourceNode');
  const inputPath = sourceNode?.data?.filePath ?? null;

  const prevInputPath = useRef(null);
  const settingsTimer = useRef(null);
  const timestampTimer = useRef(null);

  const runPreviews = async (path, ts, graph) => {
    if (!path) return;
    try {
      const result = await window.electronAPI.previewAll(graph, path, ts);
      setNodePreviews(result);
    } catch (e) {
      console.error('preview-all failed:', e);
    }
  };

  // When source file changes: trigger previews immediately (no debounce)
  useEffect(() => {
    if (!inputPath || inputPath === prevInputPath.current) return;
    prevInputPath.current = inputPath;
    window.electronAPI.previewAll(getGraph(), inputPath, previewTimestamp)
      .then(setNodePreviews)
      .catch(e => console.error('preview-all failed:', e));
  }, [inputPath]);

  // When nodes/edges change (settings update): debounce 500ms
  useEffect(() => {
    if (!inputPath) return;
    clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      runPreviews(inputPath, previewTimestamp, getGraph());
    }, 500);
    return () => clearTimeout(settingsTimer.current);
  }, [nodes, edges]);

  // When timestamp changes: debounce 300ms
  useEffect(() => {
    if (!inputPath) return;
    clearTimeout(timestampTimer.current);
    timestampTimer.current = setTimeout(() => {
      runPreviews(inputPath, previewTimestamp, getGraph());
    }, 300);
    return () => clearTimeout(timestampTimer.current);
  }, [previewTimestamp]);
}
