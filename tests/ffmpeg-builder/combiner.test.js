import { describe, it, expect } from 'vitest';
import { combinerFilter } from '../../src/ffmpeg-builder/nodes/combiner.js';

describe('combinerFilter', () => {
  it('overlays two layers', () => {
    const node = { id: 'n1', type: 'combinerNode', data: { inputsCount: 2 } };
    const result = combinerFilter(node, '[v0][v1]', '[out]');
    expect(result).toBe('[v0][v1]overlay=format=auto[out]');
  });

  it('chains overlays for three layers', () => {
    const node = { id: 'n1', type: 'combinerNode', data: { inputsCount: 3 } };
    const result = combinerFilter(node, '[v0][v1][v2]', '[out]');
    expect(result).toBe('[v0][v1]overlay=format=auto[_comb0];[_comb0][v2]overlay=format=auto[out]');
  });

  it('passes through a single input', () => {
    const node = { id: 'n1', type: 'combinerNode', data: { inputsCount: 1 } };
    const result = combinerFilter(node, '[v0]', '[out]');
    expect(result).toBe('[v0]copy[out]');
  });

  it('throws when given no input labels', () => {
    const node = { id: 'n1', type: 'combinerNode', data: { inputsCount: 0 } };
    expect(() => combinerFilter(node, '', '[out]')).toThrow('at least one input');
  });
});
