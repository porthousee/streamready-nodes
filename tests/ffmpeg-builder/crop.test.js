import { describe, it, expect } from 'vitest';
import { cropFilter } from '../../src/ffmpeg-builder/nodes/crop.js';

describe('cropFilter', () => {
  it('generates correct crop filter string', () => {
    const node = { id: 'n1', type: 'cropNode', data: { top: 10, bottom: 20, left: 5, right: 5 } };
    const result = cropFilter(node, '[0:v]', '[v0]');
    expect(result).toBe('[0:v]crop=iw*(1-5/100-5/100):ih*(1-10/100-20/100):iw*(5/100):ih*(10/100)[v0]');
  });

  it('defaults to zero offsets when data is empty', () => {
    const node = { id: 'n1', type: 'cropNode', data: {} };
    const result = cropFilter(node, '[0:v]', '[v0]');
    expect(result).toBe('[0:v]crop=iw*(1-0/100-0/100):ih*(1-0/100-0/100):iw*(0/100):ih*(0/100)[v0]');
  });
});
