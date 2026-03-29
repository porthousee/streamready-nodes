import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { BrowserWindow } from 'electron';

/**
 * Spawn FFmpeg with the given args.
 * Streams render:progress events (0-100) to the focused window.
 * @param {string[]} args - FFmpeg argument array (from buildFFmpegArgs)
 * @param {number} durationSecs - total clip duration for progress calculation
 * @returns {Promise<string>} output file path (last arg)
 */
export function spawnFFmpeg(args, durationSecs) {
  return new Promise((resolve, reject) => {
    const win = BrowserWindow.getFocusedWindow();
    const proc = spawn(ffmpegPath, ['-y', ...args]);

    let stderrLog = '';
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderrLog += text;
      const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (match && win && durationSecs > 0) {
        const elapsed = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
        const progress = Math.min(100, Math.round((elapsed / durationSecs) * 100));
        win.webContents.send('render:progress', progress);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(args[args.length - 1]);
      } else {
        console.error('FFmpeg args:', args);
        console.error('FFmpeg stderr:', stderrLog);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Get the duration of a video file in seconds.
 * @param {string} filePath
 * @returns {Promise<number>}
 */
export function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-i', filePath]);
    let output = '';
    proc.stderr.on('data', d => { output += d.toString(); });
    proc.on('close', () => {
      const match = output.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        resolve(parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]));
      } else {
        resolve(0);
      }
    });
    proc.on('error', reject);
  });
}
