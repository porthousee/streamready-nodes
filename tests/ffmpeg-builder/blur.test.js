import { describe, it, expect } from 'vitest';
import { blurFilter } from '../../src/ffmpeg-builder/nodes/blur.js';

describe('blurFilter', () => {
  it('generates gaussian blur filter', () => {
    const node = { id: 'n1', type: 'blurNode', data: { amount: 19, blurType: 'gaussian' } };
    const result = blurFilter(node, '[v0]', '[v1]');
    expect(result).toBe('[v0]gblur=sigma=1.9[v1]');
  });

  it('generates box blur filter', () => {
    const node = { id: 'n1', type: 'blurNode', data: { amount: 30, blurType: 'box' } };
    const result = blurFilter(node, '[v0]', '[v1]');
    expect(result).toBe('[v0]boxblur=3:1[v1]');
  });

  it('defaults to gaussian with amount 10', () => {
    const node = { id: 'n1', type: 'blurNode', data: {} };
    const result = blurFilter(node, '[v0]', '[v1]');
    expect(result).toBe('[v0]gblur=sigma=1[v1]');
  });
});
