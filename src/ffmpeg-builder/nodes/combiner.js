/**
 * Chains overlay filters to composite N input layers into one output.
 * @param {object} node
 * @param {string} inputLabels  e.g. '[v0][v1][v2]' — all inputs concatenated
 * @param {string} outputLabel  e.g. '[out]'
 */
export function combinerFilter(node, inputLabels, outputLabel) {
  const labels = [...inputLabels.matchAll(/\[([^\]]+)\]/g)].map(m => `[${m[1]}]`);

  if (labels.length === 0) return '';
  if (labels.length === 1) return `${labels[0]}copy${outputLabel}`;

  const filters = [];
  let current = labels[0];

  for (let i = 1; i < labels.length; i++) {
    const isLast = i === labels.length - 1;
    const next = isLast ? outputLabel : `[_comb${i - 1}]`;
    filters.push(`${current}${labels[i]}overlay=format=auto${next}`);
    current = next;
  }

  return filters.join(';');
}
