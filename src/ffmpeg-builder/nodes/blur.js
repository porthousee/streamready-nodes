/**
 * @param {object} node - { data: { amount: 0-100, blurType: 'gaussian'|'box' } }
 */
export function blurFilter(node, inputLabel, outputLabel) {
  const { amount = 10, blurType = 'gaussian' } = node.data;
  const sigma = parseFloat((amount / 10).toFixed(1));
  const filter = blurType === 'gaussian'
    ? `gblur=sigma=${sigma}`
    : `boxblur=${Math.max(1, Math.round(amount / 10))}:1`;
  return `${inputLabel}${filter}${outputLabel}`;
}
