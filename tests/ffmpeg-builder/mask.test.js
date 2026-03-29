import { describe, it, expect } from 'vitest';
import { maskFilter } from '../../src/ffmpeg-builder/nodes/mask.js';

describe('maskFilter', () => {
  it('generates a rectangle alpha mask', () => {
    const node = {
      id: 'n1', type: 'maskNode',
      data: {
        maskType: 'draw',
        shapes: [{
          type: 'rectangle',
          points: [{ x: 100, y: 50 }, { x: 400, y: 300 }],
        }],
      },
    };
    const result = maskFilter(node, '[v0]', '[v1]');
    expect(result).toBe("[v0]format=rgba,geq=lum='p(X,Y)':a='255*between(X,100,400)*between(Y,50,300)'[v1]");
  });

  it('generates a circle alpha mask', () => {
    const node = {
      id: 'n1', type: 'maskNode',
      data: {
        maskType: 'draw',
        shapes: [{
          type: 'circle',
          points: [{ x: 200, y: 100 }, { x: 600, y: 500 }],
        }],
      },
    };
    const result = maskFilter(node, '[v0]', '[v1]');
    // cx=400, cy=300, r=min(200,200)=200
    expect(result).toBe("[v0]format=rgba,geq=lum='p(X,Y)':a='255*lte(hypot(400-X,300-Y),200)'[v1]");
  });

  it('returns copy filter when no shapes defined', () => {
    const node = { id: 'n1', type: 'maskNode', data: { shapes: [] } };
    const result = maskFilter(node, '[v0]', '[v1]');
    expect(result).toBe('[v0]copy[v1]');
  });

  it('uses only the first shape when multiple shapes are provided', () => {
    const node = {
      id: 'n1', type: 'maskNode',
      data: {
        shapes: [
          { type: 'rectangle', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] },
          { type: 'circle', points: [{ x: 200, y: 200 }, { x: 400, y: 400 }] },
        ],
      },
    };
    const result = maskFilter(node, '[v0]', '[v1]');
    // Only the first shape (rectangle) is used
    expect(result).toBe("[v0]format=rgba,geq=lum='p(X,Y)':a='255*between(X,0,100)*between(Y,0,100)'[v1]");
  });
});
