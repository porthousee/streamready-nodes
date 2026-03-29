import { describe, it, expect } from 'vitest';
import { transformFilter } from '../../src/ffmpeg-builder/nodes/transform.js';

describe('transformFilter', () => {
  it('scales and pads to 1920x1080 at given position', () => {
    const node = { id: 'n1', type: 'transformNode', data: { x: 100, y: 50, scale: 1.2 } };
    const result = transformFilter(node, '[0:v]', '[v0]');
    expect(result).toBe('[0:v]format=rgba,scale=trunc(iw*1.2/2)*2:trunc(ih*1.2/2)*2,pad=1920:1080:100:50:color=black@0[v0]');
  });

  it('skips scale filter when scale is 1', () => {
    const node = { id: 'n1', type: 'transformNode', data: { x: 0, y: 0, scale: 1 } };
    const result = transformFilter(node, '[0:v]', '[v0]');
    expect(result).toBe('[0:v]format=rgba,pad=1920:1080:0:0:color=black@0[v0]');
  });

  it('defaults x, y, scale when data is empty', () => {
    const node = { id: 'n1', type: 'transformNode', data: {} };
    const result = transformFilter(node, '[0:v]', '[v0]');
    expect(result).toBe('[0:v]format=rgba,pad=1920:1080:0:0:color=black@0[v0]');
  });
});
