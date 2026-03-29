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

function topologicalSort(nodes, edges) {
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

  return result;
}

export function buildFFmpegArgs(graph, inputPath, outputPath) {
  const { nodes, edges } = graph;

  const source = nodes.find(n => n.type === 'sourceNode');
  const output = nodes.find(n => n.type === 'outputNode');
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

    const inputLabels = inEdges.map(e => `[${labelMap[e.source]}]`).join('');
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
    outputPath,
  ];
}
