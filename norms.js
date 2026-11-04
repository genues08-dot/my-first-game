// Real, published human score data for "you vs people" charts, keyed by game id.
// Only tests with a solid public source are listed; every other game shows your own history.
// Each entry: { title, better: 'lower'|'higher', kind: 'continuous'|'discrete',
//   cdf: [[value, shareAtOrBelow], ...] or pmf: { score: share }, average, format(v),
//   toValue(score) (game score -> the source's units), source, note }
window.NORMS = {};
