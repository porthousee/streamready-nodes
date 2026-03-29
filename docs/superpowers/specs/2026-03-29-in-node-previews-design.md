# In-Node Video Previews

**Date:** 2026-03-29
**Status:** Approved

## Overview

Each node in the canvas displays a thumbnail preview of the video frame at that stage of the pipeline. Source shows the raw clip, processing nodes show the post-filter result, Output shows the final result. A shared scrubber in the toolbar controls which frame is previewed across all nodes.

## Behaviour

- Previews generate automatically when a source file is loaded
- Previews refresh when any node's settings change (debounced 500ms)
- Previews refresh when the scrubber moves (debounced 300ms)
- Thumbnails are 160px wide × ~90px tall (16:9), rendered above the node title bar
- While generating, a pulsing placeholder fills the image slot so nodes don't shift size

## State (graphStore.js)

New fields:
- `nodePreviews: {}` — `{ [nodeId]: "data:image/png;base64,..." }`
- `previewTimestamp: 0` — current scrubber position in seconds
- `clipDuration: 0` — total source clip duration in seconds

New setters: `setNodePreviews(map)`, `setPreviewTimestamp(t)`, `setClipDuration(n)`

`clipDuration` is populated by calling the existing `getVideoDuration` when the source file changes.

## Backend (IPC)

### `buildPartialFFmpegArgs(graph, upToNodeId, inputPath, outputPath)`

New function in `src/ffmpeg-builder/graphWalker.js`. Identical to `buildFFmpegArgs` but halts the filter chain at `upToNodeId` rather than walking to the output node. The Source node is a special case — no filter, just raw input.

### `graph:preview-all` IPC handler

New handler in `src/main/ipc.js`.

**Input:** `{ graph, inputPath, timestamp }`

**Steps:**
1. Topologically sort nodes
2. For each node in order:
   - Source: `ffmpeg -ss <timestamp> -i <inputPath> -frames:v 1 <tempPng>`
   - Processing/Output: `buildPartialFFmpegArgs` up to this node + `-ss <timestamp> -frames:v 1`
   - Read temp PNG → base64 data URL
3. Return `{ [nodeId]: dataUrl }`

Temp files go to `os.tmpdir()` with unique names (`sr-node-<nodeId>-<ts>.png`).

## Frontend

### Toolbar scrubber

- Visible only when `clipDuration > 0`
- `<input type="range" min={0} max={clipDuration} step={0.1} value={previewTimestamp}`
- On change: update `previewTimestamp`, debounce preview refresh 300ms

### `useNodePreviews` hook

Location: `src/renderer/src/hooks/useNodePreviews.js`

- Watches `nodes`, `edges`, source `filePath`, and `previewTimestamp`
- Calls `window.electronAPI.previewAll(...)` on trigger
- Calls `setNodePreviews(result)` on response
- Fires immediately (no debounce) when source file first loads
- Mounted once in `App.jsx`

### `NodeShell` changes

- New optional prop `previewSrc?: string`
- When provided: renders `<img src={previewSrc} className="w-full h-[90px] object-cover rounded-t-lg" />` above the title bar
- When absent or loading: renders `<div className="w-full h-[90px] bg-bg animate-pulse rounded-t-lg" />` (placeholder)

### Node components

All node components (CropNode, BlurNode, TransformNode, MaskNode, CombinerNode, SourceNode, OutputNode) add:

```js
const preview = useGraphStore(s => s.nodePreviews[id]);
```

And pass `previewSrc={preview}` to `NodeShell`.

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/src/store/graphStore.js` | Add `nodePreviews`, `previewTimestamp`, `clipDuration`, setters |
| `src/ffmpeg-builder/graphWalker.js` | Add `buildPartialFFmpegArgs` |
| `src/main/ipc.js` | Add `graph:preview-all` handler |
| `src/main/ffmpeg.js` | Add `spawnFFmpegFrame` helper (single-frame extraction) |
| `src/preload/index.js` | Expose `previewAll` via `contextBridge` |
| `src/renderer/src/hooks/useNodePreviews.js` | New hook |
| `src/renderer/src/App.jsx` | Mount hook, add scrubber to Toolbar |
| `src/renderer/src/nodes/shared/NodeShell.jsx` | Add `previewSrc` prop + image/placeholder slot |
| `src/renderer/src/nodes/*.jsx` | All 7 node components read + pass preview |

## Out of Scope

- Per-node timestamp control
- Preview quality settings
- Cancelling in-flight preview requests when settings change rapidly
