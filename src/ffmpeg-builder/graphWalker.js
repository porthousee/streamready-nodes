import { cropFilter } from './nodes/crop.js';
import { transformFilter } from './nodes/transform.js';
import { blurFilter } from './nodes/blur.js';
import { maskFilter } from './nodes/mask.js';
import { combinerFilter } from './nodes/combiner.js';

const NODE_FILTERS = {
  cropNode: cropFilter,
  transformNode: transformFilter,
  blurNode: blurFilter,
  maskNode: maskFilter,
  combinerNode: combinerFilter,
};

export function topologicalSort(nodes, edges) {
  const inDegree = Object.fromEntries(nodes.map(n => [n.id, 0]));
  const adj = Object.fromEntries(nodes.map(n => [n.id, []]));

  for (const e of edges) {
    inDegree[e.target]++;
    adj[e.source].push(e.target);
  }

  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  const result = [];
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  while (queue.length) {
    const id = queue.shift();
    result.push(nodeMap[id]);
    for (const next of adj[id]) {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }

  if (result.length !== nodes.length) {
    throw new Error('Graph contains a cycle — cannot build FFmpeg filter chain');
  }

  return result;
}

export function buildFFmpegArgs(graph, inputPath, outputPath) {
  const { nodes, edges } = graph;

  const source = nodes.find(n => n.type === 'sourceNode');
  const output = nodes.find(n => n.type === 'outputNode');

  if (!source) throw new Error('Graph must contain a sourceNode');
  if (!output) throw new Error('Graph must contain an outputNode');

  const processing = nodes.filter(n => n.type !== 'sourceNode' && n.type !== 'outputNode');

  if (processing.length === 0) {
    return ['-i', inputPath, '-c', 'copy', outputPath];
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

    const inputLabels = inEdges.map(e => {
      const label = labelMap[e.source];
      if (label === undefined) {
        throw new Error(`Node "${e.source}" feeds into "${node.id}" but has no output label — check graph connectivity`);
      }
      return `[${label}]`;
    }).join('');
    const outLabel = `v${counter++}`;
    labelMap[node.id] = outLabel;

    const filterFn = NODE_FILTERS[node.type];
    if (filterFn) {
      filters.push(filterFn(node, inputLabels, `[${outLabel}]`));
    }
  }

  const toOutput = edges.find(e => e.target === output.id);
  const finalLabel = labelMap[toOutput.source];

  return [
    '-i', inputPath,
    '-filter_complex', filters.join(';'),
    '-map', `[${finalLabel}]`,
    '-map', '0:a?',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    outputPath,
  ];
}

export function buildPartialFFmpegArgs(graph, upToNodeId, inputPath, outputPath) {
  const { nodes, edges } = graph;
  const source = nodes.find(n => n.type === 'sourceNode');
  if (!source) throw new Error('Graph must contain a sourceNode');

  const upToNode = nodes.find(n => n.id === upToNodeId);
  if (!upToNode) {
    throw new Error(`Node "${upToNodeId}" does not exist in the graph`);
  }
  if (upToNode.type === 'outputNode') {
    throw new Error('buildPartialFFmpegArgs does not accept outputNode as upToNodeId');
  }

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
