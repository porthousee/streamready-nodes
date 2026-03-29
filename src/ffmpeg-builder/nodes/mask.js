/**
 * @param {object} node - { data: { maskType, shapes: [{ type, points: [{x,y},{x,y}] }] } }
 * Supports rectangle and circle shapes. Uses first shape only for MVP.
 */
export function maskFilter(node, inputLabel, outputLabel) {
  const { shapes = [] } = node.data;

  if (shapes.length === 0) {
    return `${inputLabel}copy${outputLabel}`;
  }

  const shape = shapes[0];
  const [p1, p2] = shape.points;

  if (shape.type === 'circle') {
    const cx = Math.round((p1.x + p2.x) / 2);
    const cy = Math.round((p1.y + p2.y) / 2);
    const r = Math.min(Math.abs(p2.x - p1.x) / 2, Math.abs(p2.y - p1.y) / 2);
    return `${inputLabel}format=rgba,geq=lum='p(X,Y)':a='255*lte(hypot(${cx}-X,${cy}-Y),${r})'${outputLabel}`;
  }

  // rectangle
  const x1 = Math.min(p1.x, p2.x);
  const y1 = Math.min(p1.y, p2.y);
  const x2 = Math.max(p1.x, p2.x);
  const y2 = Math.max(p1.y, p2.y);
  return `${inputLabel}format=rgba,geq=lum='p(X,Y)':a='255*between(X,${x1},${x2})*between(Y,${y1},${y2})'${outputLabel}`;
}
