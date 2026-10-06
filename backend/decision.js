// ModelResponse -> DetectionResponse. Uses textual labels only.
function decide(m) {
  const x = m.xgboost, i = m.isolationForest, lc = s => String(s).toLowerCase();
  let detection;
  if (lc(x.label) === 'attack')
    detection = { status: 'attack', severity: 'high', confidence: x.probability ?? null, attackType: x.attackType ?? null, reason: `Classifier flagged known attack${x.attackType ? ': ' + x.attackType : ''}` };
  else if (lc(i.label) === 'anomaly')
    detection = { status: 'possible_zero_day', severity: 'critical', confidence: null, attackType: null, reason: 'Classifier saw normal traffic but anomaly detector flagged it (Possible Zero-Day / Unknown Anomaly, unconfirmed)' };
  else
    detection = { status: 'normal', severity: 'low', confidence: x.probability ?? null, attackType: null, reason: 'Both models report normal traffic' };
  return { success: true, detection, modelResults: { xgboost: x, isolationForest: i }, timestamp: new Date().toISOString() };
}
module.exports = { decide };
