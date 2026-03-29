/**
 * @param {object} node - { data: { top, bottom, left, right } } percentages 0-100
 * @param {string} inputLabel  e.g. '[0:v]'
 * @param {string} outputLabel e.g. '[v0]'
 * @returns {string} FFmpeg filter string
 */
export function cropFilter(node, inputLabel, outputLabel) {
  const { top = 0, bottom = 0, left = 0, right = 0 } = node.data;
  const w = `iw*(1-${left}/100-${right}/100)`;
  const h = `ih*(1-${top}/100-${bottom}/100)`;
  const x = `iw*(${left}/100)`;
  const y = `ih*(${top}/100)`;
  return `${inputLabel}crop=${w}:${h}:${x}:${y}${outputLabel}`;
}
