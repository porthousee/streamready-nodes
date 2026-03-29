import { ipcMain, dialog } from 'electron';
import { buildFFmpegArgs } from '../ffmpeg-builder/index.js';
import { spawnFFmpeg, getVideoDuration } from './ffmpeg.js';
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
}
