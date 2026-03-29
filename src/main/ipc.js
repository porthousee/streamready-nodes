import { ipcMain, dialog } from 'electron';
import { buildFFmpegArgs, buildPartialFFmpegArgs, topologicalSort } from '../ffmpeg-builder/index.js';
import { spawnFFmpeg, getVideoDuration, spawnFFmpegFrame } from './ffmpeg.js';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export function registerIpcHandlers() {
  ipcMain.handle('graph:render', async (_event, { graph, inputPath, outputPath }) => {
    const args = buildFFmpegArgs(graph, inputPath, outputPath);
    const duration = await getVideoDuration(inputPath);
    return spawnFFmpeg(args, duration);
  });

  ipcMain.handle('graph:preview', async (_event, { graph, inputPath, timestamp }) => {
    const previewPath = join(tmpdir(), `sr-preview-${Date.now()}.png`);
    const baseArgs = buildFFmpegArgs(graph, inputPath, previewPath);
    // Insert -ss before input and -frames:v 1 before output path
    const args = ['-ss', String(timestamp), ...baseArgs.slice(0, -1), '-frames:v', '1', previewPath];
    await spawnFFmpeg(args, 0);
    return previewPath;
  });

  ipcMain.handle('file:pick-input', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Open clip',
      filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm'] }],
      properties: ['openFile'],
    });
    return filePaths[0] ?? null;
  });

  ipcMain.handle('file:pick-output', async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save rendered clip',
      defaultPath: 'output.mp4',
      filters: [{ name: 'Video', extensions: ['mp4'] }],
    });
    return filePath ?? null;
  });

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

  ipcMain.handle('file:duration', async (_event, filePath) => {
    return getVideoDuration(filePath);
  });
}
