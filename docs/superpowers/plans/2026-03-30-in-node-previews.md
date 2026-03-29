# In-Node Video Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a live thumbnail preview inside every node showing the video frame at that stage of the pipeline, controlled by a shared scrubber in the toolbar.

**Architecture:** Each node calls a new `graph:preview-all` IPC handler that runs one FFmpeg frame-extraction per node in topological order, returning a map of `{ nodeId: base64DataUrl }` stored in Zustand. A `useNodePreviews` hook in the renderer watches for graph/setting/timestamp changes and refreshes previews. `NodeShell` renders the thumbnail above the title bar with a pulsing placeholder while loading.

**Tech Stack:** Electron IPC, FFmpeg (ffmpeg-static), Zustand, React, ReactFlow, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/ffmpeg-builder/graphWalker.js` | Modify | Add `buildPartialFFmpegArgs` + export `topologicalSort` |
| `src/main/ffmpeg.js` | Modify | Add `spawnFFmpegFrame` helper |
| `src/main/ipc.js` | Modify | Add `graph:preview-all` handler |
| `src/preload/index.js` | Modify | Expose `previewAll` via contextBridge |
| `src/renderer/src/store/graphStore.js` | Modify | Add `nodePreviews`, `previewTimestamp`, `clipDuration`, setters |
| `src/renderer/src/hooks/useNodePreviews.js` | Create | Hook that triggers preview refresh |
| `src/renderer/src/App.jsx` | Modify | Mount hook, add scrubber to Toolbar, wire `clipDuration` |
| `src/renderer/src/nodes/shared/NodeShell.jsx` | Modify | Add `previewSrc` prop + image/placeholder slot |
| `src/renderer/src/nodes/CropNode.jsx` | Modify | Accept `id`, read + pass `previewSrc` |
| `src/renderer/src/nodes/BlurNode.jsx` | Modify | Accept `id`, read + pass `previewSrc` |
| `src/renderer/src/nodes/TransformNode.jsx` | Modify | Accept `id`, read + pass `previewSrc` |
| `src/renderer/src/nodes/MaskNode.jsx` | Modify | Accept `id`, read + pass `previewSrc` |
| `src/renderer/src/nodes/CombinerNode.jsx` | Modify | Accept `id`, read + pass `previewSrc` |
| `src/renderer/src/nodes/SourceNode.jsx` | Modify | Read + pass `previewSrc` (already has `id`) |
| `src/renderer/src/nodes/OutputNode.jsx` | Modify | Read + pass `previewSrc` (already has `id`) |
| `tests/ffmpeg-builder/graphWalker.test.js` | Modify | Update existing tests broken by movflags change + add partial tests |

---

## Task 1: Fix existing graphWalker tests broken by movflags change

The earlier fix added `-map 0:a?`, `-c:a copy`, `-movflags +faststart` to `buildFFmpegArgs`. The existing tests need updating to match.

**Files:**
- Modify: `tests/ffmpeg-builder/graphWalker.test.js`

- [ ] **Step 1: Run existing tests to confirm they fail**

```bash
cd "D:/Documents/Stream ready/streamready-nodes"
npm test
```
Expected: 2 failures — "builds filter_complex for a single crop node" and "chains two nodes: crop then blur" — because expected arrays don't include the new `-map 0:a?`, `-c:a copy`, `-movflags +faststart` args.

- [ ] **Step 2: Update the two failing test expectations**

In `tests/ffmpeg-builder/graphWalker.test.js`, update the `toEqual` for the single-crop test (currently line 37) to:

```js
expect(args).toEqual([
  '-i', INPUT,
  '-filter_complex',
  '[0:v]crop=iw*(1-0/100-0/100):ih*(1-10/100-0/100):iw*(0/100):ih*(10/100)[v0]',
  '-map', '[v0]',
  '-map', '0:a?',
  '-c:a', 'copy',
  '-movflags', '+faststart',
  OUTPUT,
]);
```

And update the two-node chain test (currently line 61) to:

```js
expect(args).toEqual([
  '-i', INPUT,
  '-filter_complex',
  '[0:v]crop=iw*(1-0/100-0/100):ih*(1-5/100-5/100):iw*(0/100):ih*(5/100)[v0];[v0]gblur=sigma=1[v1]',
  '-map', '[v1]',
  '-map', '0:a?',
  '-c:a', 'copy',
  '-movflags', '+faststart',
  OUTPUT,
]);
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/ffmpeg-builder/graphWalker.test.js
git commit -m "test: update graphWalker tests to include audio copy and movflags args"
```

---

## Task 2: Export `topologicalSort` and add `buildPartialFFmpegArgs`

**Files:**
- Modify: `src/ffmpeg-builder/graphWalker.js`
- Modify: `tests/ffmpeg-builder/graphWalker.test.js`

- [ ] **Step 1: Write failing tests for `buildPartialFFmpegArgs`**

Add to `tests/ffmpeg-builder/graphWalker.test.js`:

```js
import { buildFFmpegArgs, buildPartialFFmpegArgs } from '../../src/ffmpeg-builder/index.js';

// ... existing tests unchanged above ...

describe('buildPartialFFmpegArgs', () => {
  it('returns raw input args for the sourceNode', () => {
    const graph = makeGraph(
      [
        { id: 's', type: 'sourceNode', data: {} },
        { id: 'c', type: 'cropNode', data: { top: 10, bottom: 0, left: 0, right: 0 } },
        { id: 'o', type: 'outputNode', data: {} },
      ],
      [
        { id: 'e1', source: 's', target: 'c', sourceHandle: 'out-video', targetHandle: 'in-video' },
        { id: 'e2', source: 'c', target: 'o', sourceHandle: 'out-video', targetHandle: 'in-video' },
      ]
    );
    const args = buildPartialFFmpegArgs(graph, 's', INPUT, OUTPUT);
    expect(args).toEqual(['-i', INPUT, OUTPUT]);
  });

  it('builds filter chain up to and including the specified node', () => {
    const graph = makeGraph(
      [
        { id: 's', type: 'sourceNode', data: {} },
        { id: 'c', type: 'cropNode', data: { top: 10, bottom: 0, left: 0, right: 0 } },
        { id: 'b', type: 'blurNode', data: { amount: 10, blurType: 'gaussian' } },
        { id: 'o', type: 'outputNode', data: {} },
      ],
      [
        { id: 'e1', source: 's', target: 'c', sourceHandle: 'out-video', targetHandle: 'in-video' },
        { id: 'e2', source: 'c', target: 'b', sourceHandle: 'out-video', targetHandle: 'in-video' },
        { id: 'e3', source: 'b', target: 'o', sourceHandle: 'out-video', targetHandle: 'in-video' },
      ]
    );
    // Up to crop only (not blur)
    const args = buildPartialFFmpegArgs(graph, 'c', INPUT, OUTPUT);
    expect(args).toEqual([
      '-i', INPUT,
      '-filter_complex',
      '[0:v]crop=iw*(1-0/100-0/100):ih*(1-10/100-0/100):iw*(0/100):ih*(10/100)[v0]',
      '-map', '[v0]',
      OUTPUT,
    ]);
  });

  it('falls back to raw input when node is not reachable from source', () => {
    const graph = makeGraph(
      [
        { id: 's', type: 'sourceNode', data: {} },
        { id: 'c', type: 'cropNode', data: { top: 0, bottom: 0, left: 0, right: 0 } },
        { id: 'o', type: 'outputNode', data: {} },
      ],
      [] // no edges
    );
    const args = buildPartialFFmpegArgs(graph, 'c', INPUT, OUTPUT);
    expect(args).toEqual(['-i', INPUT, OUTPUT]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: 3 new failures — `buildPartialFFmpegArgs` is not exported.

- [ ] **Step 3: Implement `buildPartialFFmpegArgs` and export `topologicalSort`**

In `src/ffmpeg-builder/graphWalker.js`, change `function topologicalSort` to `export function topologicalSort`, then add at the bottom of the file:

```js
export function buildPartialFFmpegArgs(graph, upToNodeId, inputPath, outputPath) {
  const { nodes, edges } = graph;
  const source = nodes.find(n => n.type === 'sourceNode');
  if (!source) throw new Error('Graph must contain a sourceNode');

  if (upToNodeId === source.id) {
    return ['-i', inputPath, outputPath];
  }

  const labelMap = { [source.id]: '0:v' };
  let counter = 0;
  const filters = [];

  for (const node of topologicalSort(nodes, edges)) {
    if (node.type === 'sourceNode' || node.type === 'outputNode') continue;

    const inEdges = edges
      .filter(e => e.target === node.id)
      .sort((a, b) => {
        const ai = parseInt(a.targetHandle?.replace('input-', '') ?? '0');
        const bi = parseInt(b.targetHandle?.replace('input-', '') ?? '0');
        return ai - bi;
      });

    const hasAllInputs = inEdges.length > 0 && inEdges.every(e => labelMap[e.source] !== undefined);
    if (!hasAllInputs) continue;

    const inputLabels = inEdges.map(e => `[${labelMap[e.source]}]`).join('');
    const outLabel = `v${counter++}`;
    labelMap[node.id] = outLabel;

    const filterFn = NODE_FILTERS[node.type];
    if (filterFn) {
      filters.push(filterFn(node, inputLabels, `[${outLabel}]`));
    }

    if (node.id === upToNodeId) break;
  }

  const finalLabel = labelMap[upToNodeId];

  if (!finalLabel || filters.length === 0) {
    return ['-i', inputPath, outputPath];
  }

  return [
    '-i', inputPath,
    '-filter_complex', filters.join(';'),
    '-map', `[${finalLabel}]`,
    outputPath,
  ];
}
```

- [ ] **Step 4: Export `buildPartialFFmpegArgs` from index.js**

In `src/ffmpeg-builder/index.js`, replace the file content with:

```js
export { buildFFmpegArgs, buildPartialFFmpegArgs, topologicalSort } from './graphWalker.js';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ffmpeg-builder/graphWalker.js src/ffmpeg-builder/index.js tests/ffmpeg-builder/graphWalker.test.js
git commit -m "feat: add buildPartialFFmpegArgs for per-node frame extraction"
```

---

## Task 3: Add `spawnFFmpegFrame` helper

**Files:**
- Modify: `src/main/ffmpeg.js`

- [ ] **Step 1: Add `spawnFFmpegFrame` to `src/main/ffmpeg.js`**

Add this function after `getVideoDuration`:

```js
/**
 * Spawn FFmpeg to extract a single frame. Args must include output path as last arg.
 * @param {string[]} args - Full FFmpeg argument array (without leading -y)
 * @returns {Promise<void>}
 */
export function spawnFFmpegFrame(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-y', ...args]);
    proc.stderr.on('data', () => {});
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg frame extraction failed with code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/ffmpeg.js
git commit -m "feat: add spawnFFmpegFrame helper for single-frame extraction"
```

---

## Task 4: Add `graph:preview-all` IPC handler and expose in preload

**Files:**
- Modify: `src/main/ipc.js`
- Modify: `src/preload/index.js`

- [ ] **Step 1: Update `src/main/ipc.js`**

Add imports at the top (add to existing imports):

```js
import { buildFFmpegArgs, buildPartialFFmpegArgs, topologicalSort } from '../ffmpeg-builder/index.js';
import { spawnFFmpeg, getVideoDuration, spawnFFmpegFrame } from './ffmpeg.js';
import { readFileSync, unlinkSync } from 'fs';
```

Then add the handler inside `registerIpcHandlers()`, after the existing handlers:

```js
ipcMain.handle('graph:preview-all', async (_event, { graph, inputPath, timestamp }) => {
  const { nodes, edges } = graph;
  const sorted = topologicalSort(nodes, edges);
  const ts = String(timestamp);
  const batchTs = Date.now();
  const results = {};

  for (const node of sorted) {
    const tempPath = join(tmpdir(), `sr-node-${node.id}-${batchTs}.png`);
    let args;

    if (node.type === 'sourceNode') {
      args = ['-ss', ts, '-i', inputPath, '-frames:v', '1', '-vf', 'scale=160:-1', tempPath];
    } else if (node.type === 'outputNode') {
      const toOutput = edges.find(e => e.target === node.id);
      if (!toOutput) { results[node.id] = null; continue; }
      const baseArgs = buildPartialFFmpegArgs(graph, toOutput.source, inputPath, tempPath);
      const iIdx = baseArgs.indexOf('-i');
      args = [
        ...baseArgs.slice(0, iIdx),
        '-ss', ts,
        ...baseArgs.slice(iIdx, -1),
        '-frames:v', '1',
        '-vf', 'scale=160:-1',
        tempPath,
      ];
    } else {
      const baseArgs = buildPartialFFmpegArgs(graph, node.id, inputPath, tempPath);
      const iIdx = baseArgs.indexOf('-i');
      args = [
        ...baseArgs.slice(0, iIdx),
        '-ss', ts,
        ...baseArgs.slice(iIdx, -1),
        '-frames:v', '1',
        '-vf', 'scale=160:-1',
        tempPath,
      ];
    }

    try {
      await spawnFFmpegFrame(args);
      const buf = readFileSync(tempPath);
      results[node.id] = `data:image/png;base64,${buf.toString('base64')}`;
      try { unlinkSync(tempPath); } catch {}
    } catch {
      results[node.id] = null;
    }
  }

  return results;
});
```

- [ ] **Step 2: Expose `previewAll` in `src/preload/index.js`**

Add to the `contextBridge.exposeInMainWorld` object:

```js
previewAll: (graph, inputPath, timestamp) =>
  ipcRenderer.invoke('graph:preview-all', { graph, inputPath, timestamp }),
```

Full updated file:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  renderGraph: (graph, inputPath, outputPath) =>
    ipcRenderer.invoke('graph:render', { graph, inputPath, outputPath }),

  previewGraph: (graph, inputPath, timestamp) =>
    ipcRenderer.invoke('graph:preview', { graph, inputPath, timestamp }),

  previewAll: (graph, inputPath, timestamp) =>
    ipcRenderer.invoke('graph:preview-all', { graph, inputPath, timestamp }),

  pickInputFile: () =>
    ipcRenderer.invoke('file:pick-input'),

  pickOutputFile: () =>
    ipcRenderer.invoke('file:pick-output'),

  onRenderProgress: (callback) => {
    const handler = (_, value) => callback(value);
    ipcRenderer.on('render:progress', handler);
    return () => ipcRenderer.removeListener('render:progress', handler);
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc.js src/preload/index.js
git commit -m "feat: add graph:preview-all IPC handler for per-node frame extraction"
```

---

## Task 5: Add preview state to graphStore

**Files:**
- Modify: `src/renderer/src/store/graphStore.js`

- [ ] **Step 1: Add three new fields and their setters**

In `src/renderer/src/store/graphStore.js`, add to the store object (after `previewImage: null`):

```js
nodePreviews: {},
previewTimestamp: 0,
clipDuration: 0,
```

And add setters (after `setPreviewImage`):

```js
setNodePreviews: (nodePreviews) => set({ nodePreviews }),
setPreviewTimestamp: (previewTimestamp) => set({ previewTimestamp }),
setClipDuration: (clipDuration) => set({ clipDuration }),
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/store/graphStore.js
git commit -m "feat: add nodePreviews, previewTimestamp, clipDuration to graph store"
```

---

## Task 6: Update `NodeShell` with thumbnail slot

**Files:**
- Modify: `src/renderer/src/nodes/shared/NodeShell.jsx`

- [ ] **Step 1: Add `previewSrc` prop**

Replace the full contents of `src/renderer/src/nodes/shared/NodeShell.jsx` with:

```jsx
import { Handle, Position } from '@xyflow/react';

export function NodeShell({ title, variant, hasInput = true, hasOutput = true, inputId = 'in-video', outputId = 'out-video', previewSrc, children }) {
  const borderColor = variant === 'source' ? 'border-purple' : variant === 'output' ? 'border-pink' : 'border-border';
  const titleColor = variant === 'source' ? 'text-purple' : variant === 'output' ? 'text-pink' : 'text-white';

  return (
    <div className={`bg-surface border ${borderColor} rounded-lg min-w-[160px] shadow-lg`}>
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id={inputId}
          className="!w-3 !h-3 !bg-purple !border-2 !border-bg"
        />
      )}
      {previewSrc
        ? <img src={previewSrc} className="w-full h-[90px] object-cover rounded-t-lg" alt="" />
        : <div className="w-full h-[90px] bg-bg animate-pulse rounded-t-lg" />
      }
      <div className={`px-3 py-1.5 border-b border-border text-xs font-semibold font-sans uppercase tracking-wide ${titleColor}`}>
        {title}
      </div>
      <div className="px-3 py-2 text-xs font-mono text-muted">
        {children}
      </div>
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id={outputId}
          className="!w-3 !h-3 !bg-pink !border-2 !border-bg"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/nodes/shared/NodeShell.jsx
git commit -m "feat: add previewSrc thumbnail slot to NodeShell"
```

---

## Task 7: Wire previews into all node components

ReactFlow passes `id` automatically as a prop to all custom node components. Each component just needs to destructure it and read its preview from the store.

**Files:**
- Modify: `src/renderer/src/nodes/CropNode.jsx`
- Modify: `src/renderer/src/nodes/BlurNode.jsx`
- Modify: `src/renderer/src/nodes/TransformNode.jsx`
- Modify: `src/renderer/src/nodes/MaskNode.jsx`
- Modify: `src/renderer/src/nodes/CombinerNode.jsx`
- Modify: `src/renderer/src/nodes/SourceNode.jsx`
- Modify: `src/renderer/src/nodes/OutputNode.jsx`

- [ ] **Step 1: Update `CropNode.jsx`**

```jsx
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
```

- [ ] **Step 2: Update `BlurNode.jsx`**

```jsx
import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function BlurNode({ id, data }) {
  const preview = useGraphStore(s => s.nodePreviews[id]);
  return (
    <NodeShell title="Blur" variant="processing" previewSrc={preview}>
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Amount</span><span className="text-white">{data.amount ?? 10}</span></div>
        <div className="flex justify-between"><span>Type</span><span className="text-white">{data.blurType ?? 'gaussian'}</span></div>
      </div>
    </NodeShell>
  );
}
```

- [ ] **Step 3: Update `TransformNode.jsx`**

```jsx
import { NodeShell } from './shared/NodeShell';
import { useGraphStore } from '../store/graphStore';

export function TransformNode({ id, data }) {
  const preview = useGraphStore(s => s.nodePreviews[id]);
  return (
    <NodeShell title="Transform" variant="processing" previewSrc={preview}>
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>X</span><span className="text-white">{data.x ?? 0}px</span></div>
        <div className="flex justify-between"><span>Y</span><span className="text-white">{data.y ?? 0}px</span></div>
        <div className="flex justify-between"><span>Scale</span><span className="text-white">{data.scale ?? 1}×</span></div>
      </div>
    </NodeShell>
  );
}
```

- [ ] **Step 4: Update `MaskNode.jsx`**

```jsx
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
```

- [ ] **Step 5: Update `CombinerNode.jsx`**

```jsx
import { NodeShell } from './shared/NodeShell';
import { Handle, Position } from '@xyflow/react';
import { useGraphStore } from '../store/graphStore';

export function CombinerNode({ id, data }) {
  const preview = useGraphStore(s => s.nodePreviews[id]);
  const count = data.inputsCount ?? 2;

  return (
    <NodeShell title="Combiner" variant="processing" hasInput={false} previewSrc={preview}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="relative flex items-center h-6 mb-1">
          <Handle
            type="target"
            position={Position.Left}
            id={`input-${i}`}
            style={{ top: 'auto', position: 'relative', transform: 'none', left: -12 }}
            className="!w-3 !h-3 !bg-purple !border-2 !border-bg"
          />
          <span className="text-muted ml-1">Layer {i}</span>
        </div>
      ))}
    </NodeShell>
  );
}
```

- [ ] **Step 6: Update `SourceNode.jsx`**

```jsx
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
```

- [ ] **Step 7: Update `OutputNode.jsx`**

```jsx
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
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/nodes/
git commit -m "feat: wire preview thumbnails into all node components"
```

---

## Task 8: Create `useNodePreviews` hook

**Files:**
- Create: `src/renderer/src/hooks/useNodePreviews.js`

- [ ] **Step 1: Create the hooks directory and file**

Create `src/renderer/src/hooks/useNodePreviews.js`:

```js
import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';

export function useNodePreviews() {
  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const setNodePreviews = useGraphStore(s => s.setNodePreviews);
  const setClipDuration = useGraphStore(s => s.setClipDuration);
  const previewTimestamp = useGraphStore(s => s.previewTimestamp);

  const sourceNode = nodes.find(n => n.type === 'sourceNode');
  const inputPath = sourceNode?.data?.filePath ?? null;

  // Track previous inputPath to detect source file changes
  const prevInputPath = useRef(null);
  // Debounce timer refs
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

  const getGraph = useGraphStore(s => s.getGraph);

  // When source file changes: fetch duration immediately + trigger previews immediately
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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/hooks/useNodePreviews.js
git commit -m "feat: add useNodePreviews hook for debounced preview refresh"
```

---

## Task 9: Mount hook and add scrubber to App.jsx

**Files:**
- Modify: `src/renderer/src/App.jsx`

- [ ] **Step 1: Update App.jsx**

Replace the full contents of `src/renderer/src/App.jsx` with:

```jsx
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
```

- [ ] **Step 2: Expose `getVideoDuration` in preload**

`App.jsx` now calls `window.electronAPI.getVideoDuration`. Add it to `src/preload/index.js`:

```js
getVideoDuration: (filePath) =>
  ipcRenderer.invoke('file:duration', filePath),
```

- [ ] **Step 3: Add `file:duration` IPC handler in `src/main/ipc.js`**

Add inside `registerIpcHandlers()`:

```js
ipcMain.handle('file:duration', async (_event, filePath) => {
  return getVideoDuration(filePath);
});
```

- [ ] **Step 4: Run the app and verify**

```bash
npm run dev
```

Expected:
- Load a clip in the Source node → all nodes show pulsing placeholder briefly, then display thumbnails
- Move the scrubber → thumbnails update to the new frame (after ~300ms)
- Change a Crop value in Properties Panel → that node's thumbnail refreshes (after ~500ms)

- [ ] **Step 5: Run tests**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit and push**

```bash
git add src/renderer/src/App.jsx src/main/ipc.js src/preload/index.js
git commit -m "feat: mount useNodePreviews hook and add shared preview scrubber to toolbar"
git push origin master
```
