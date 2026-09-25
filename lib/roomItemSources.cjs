// The initial model suggestion has a distinct source from editable selections.
function reconcileRoomItems(generated, current = [], followup = false) {
  const source = item => ({ recommendation: item.recommendation, reasoning: item.reasoning });
  if (!followup) return generated.map(item => ({ ...item, modelSuggestion: source(item) }));
  const byId = new Map(generated.map(item => [item.id, item]));
  const ids = new Set(current.map(item => item.id));
  let next = current.reduce((n, i) => Math.max(n, Number(/^item-(\d+)$/.exec(i.id)?.[1] || 0)), 0);
  const kept = current.map(item => {
    const updated = byId.get(item.id);
    const value = item.manual || item.excluded || !updated ? item : { ...updated, manual: false, excluded: item.excluded };
    return { ...value, modelSuggestion: item.modelSuggestion || null };
  });
  return [...kept, ...generated.filter(i => !ids.has(i.id)).slice(0, 10 - kept.length)
    .map(i => ({ ...i, id: `item-${++next}`, manual: false, excluded: false, modelSuggestion: source(i) }))];
}
function suggestionLabel(item, labels) {
  return item.modelSuggestion
    ? `Sestia'nın ilk önerisi: ${labels[item.modelSuggestion.recommendation]?.label || item.modelSuggestion.recommendation}`
    : `Kayıtlı son öneri — özgün kaynağı doğrulanamıyor: ${labels[item.recommendation]?.label || item.recommendation}`;
}
module.exports = { reconcileRoomItems, suggestionLabel };
