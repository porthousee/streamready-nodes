const CANVAS_W = 1920;
const CANVAS_H = 1080;

/**
 * @param {object} node - { data: { x, y, scale } }
 * x/y: pixel offset on 1920x1080 canvas; scale: multiplier (e.g. 1.2)
 */
export function transformFilter(node, inputLabel, outputLabel) {
  const { x = 0, y = 0, scale = 1 } = node.data;
  const parts = ['format=rgba'];
  if (scale !== 1) {
    parts.push(`scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2`);
  }
  parts.push(`pad=${CANVAS_W}:${CANVAS_H}:${x}:${y}:color=black@0`);
  return `${inputLabel}${parts.join(',')}${outputLabel}`;
}
