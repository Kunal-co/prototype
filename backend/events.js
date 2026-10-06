const crypto = require('crypto');
const db = require('./db');
const record = (userId, r, flow) => db.saveEvent({ id: crypto.randomUUID(), timestamp: r.timestamp, userId, sourceIp: flow.sourceIp, destinationIp: flow.destinationIp,
  status: r.detection.status, severity: r.detection.severity, attackType: r.detection.attackType, confidence: r.detection.confidence,
  reason: r.detection.reason, anomalyScore: r.modelResults.isolationForest.anomalyScore ?? null });
async function dashboard() {
  const stats = await db.getDashboardStats(), recent = await db.getEvents(20);
  const w = recent.some(e => e.status === 'possible_zero_day') ? ['possible_zero_day', 'critical'] : recent.some(e => e.status === 'attack') ? ['attack', 'high'] : recent.length ? ['normal', 'low'] : ['no_data', 'none'];
  return { success: true, stats, currentStatus: { status: w[0], severity: w[1] } };
}
const activity = async () => ({ success: true, events: (await db.getEvents(50)).map(({ userId, anomalyScore, ...e }) => e) });
module.exports = { record, dashboard, activity, list: limit => db.getEvents(limit) };
