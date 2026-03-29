import { describe, it, expect } from 'vitest';
import { buildFFmpegArgs } from '../../src/ffmpeg-builder/index.js';

const INPUT = '/clips/input.mp4';
const OUTPUT = '/clips/output.mp4';

function makeGraph(nodes, edges) {
  return { nodes, edges };
}

describe('buildFFmpegArgs', () => {
  it('copies directly when source connects straight to output', () => {
    const graph = makeGraph(
      [
        { id: 's', type: 'sourceNode', data: {} },
        { id: 'o', type: 'outputNode', data: {} },
      ],
      [{ id: 'e1', source: 's', sourceHandle: 'out-video', target: 'o', targetHandle: 'in-video' }]
    );
    const args = buildFFmpegArgs(graph, INPUT, OUTPUT);
    expect(args).toEqual(['-i', INPUT, '-c', 'copy', OUTPUT]);
  });

  it('builds filter_complex for a single crop node', () => {
    const graph = makeGraph(
      [
        { id: 's', type: 'sourceNode', data: {} },
        { id: 'c', type: 'cropNode', data: { top: 10, bottom: 0, left: 0, right: 0 } },
        { id: 'o', type: 'outputNode', data: {} },
      ],
      [
        { id: 'e1', source: 's', sourceHandle: 'out-video', target: 'c', targetHandle: 'in-video' },
        { id: 'e2', source: 'c', sourceHandle: 'out-video', target: 'o', targetHandle: 'in-video' },
      ]
    );
    const args = buildFFmpegArgs(graph, INPUT, OUTPUT);
    expect(args).toEqual([
      '-i', INPUT,
      '-filter_complex',
      '[0:v]crop=iw*(1-0/100-0/100):ih*(1-10/100-0/100):iw*(0/100):ih*(10/100)[v0]',
      '-map', '[v0]',
      OUTPUT,
    ]);
  });

  it('chains two nodes: crop then blur', () => {
    const graph = makeGraph(
      [
        { id: 's', type: 'sourceNode', data: {} },
        { id: 'c', type: 'cropNode', data: { top: 5, bottom: 5, left: 0, right: 0 } },
        { id: 'b', type: 'blurNode', data: { amount: 10, blurType: 'gaussian' } },
        { id: 'o', type: 'outputNode', data: {} },
      ],
      [
        { id: 'e1', source: 's', sourceHandle: 'out-video', target: 'c', targetHandle: 'in-video' },
        { id: 'e2', source: 'c', sourceHandle: 'out-video', target: 'b', targetHandle: 'in-video' },
        { id: 'e3', source: 'b', sourceHandle: 'out-video', target: 'o', targetHandle: 'in-video' },
      ]
    );
    const args = buildFFmpegArgs(graph, INPUT, OUTPUT);
    expect(args[3]).toContain('crop=');
    expect(args[3]).toContain('gblur=sigma=1');
    expect(args[4]).toBe('-map');
    expect(args[6]).toBe(OUTPUT);
  });
});
