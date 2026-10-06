// Only file that talks to the ML model. MODEL_MODE=http POSTs ModelRequest to MODEL_URL and expects ModelResponse.
// MODEL_MODE=mock returns contract-shaped canned responses so the app can be tested before the real model exists.
const { ApiError } = require('./flow');
const MOCKS = {
  normal: { success: true, xgboost: { prediction: 0, label: 'normal', attackType: null, probability: 0.98 }, isolationForest: { prediction: 1, label: 'normal', anomalyScore: 0.18 } },
  attack: { success: true, xgboost: { prediction: 1, label: 'attack', attackType: 'MOCK-ATTACK', probability: 0.96 }, isolationForest: { prediction: -1, label: 'anomaly', anomalyScore: -0.4 } },
  anomaly: { success: true, xgboost: { prediction: 0, label: 'normal', attackType: null, probability: 0.9 }, isolationForest: { prediction: -1, label: 'anomaly', anomalyScore: -0.31 } }
};
function validate(r) {
  const ok = r && r.success === true && r.xgboost && typeof r.xgboost.label === 'string' && r.isolationForest && typeof r.isolationForest.label === 'string';
  if (!ok) throw new ApiError(502, 'MODEL_BAD_RESPONSE', 'Model response does not match ModelResponse contract');
  return r;
}
async function detect(modelRequest, mockScenario) {
  if ((process.env.MODEL_MODE || 'mock') === 'mock') return validate(MOCKS[mockScenario] || MOCKS.normal);
  if (!process.env.MODEL_URL) throw new ApiError(503, 'MODEL_NOT_CONFIGURED', 'MODEL_URL is not set');
  try {
    const res = await fetch(process.env.MODEL_URL, { method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', ...(process.env.MODEL_API_KEY && { Authorization: 'Bearer ' + process.env.MODEL_API_KEY }) },
      body: JSON.stringify(modelRequest) });
    if (!res.ok) throw new ApiError(502, 'MODEL_ERROR', `Model returned HTTP ${res.status}`);
    return validate(await res.json());
  } catch (e) { throw e instanceof ApiError ? e : new ApiError(502, 'MODEL_UNAVAILABLE', 'Could not reach model service'); }
}
module.exports = { detect };
