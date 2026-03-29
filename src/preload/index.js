const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  renderGraph: (graph, inputPath, outputPath) =>
    ipcRenderer.invoke('graph:render', { graph, inputPath, outputPath }),

  previewGraph: (graph, inputPath, timestamp) =>
    ipcRenderer.invoke('graph:preview', { graph, inputPath, timestamp }),

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
