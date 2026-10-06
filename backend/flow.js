// Prepares ModelRequest from the request body. Feature names/count are NOT validated against any list.
class ApiError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
function prepareFlow(body = {}) {
  const f = body.features;
  if (!f || typeof f !== 'object' || Array.isArray(f) || !Object.keys(f).length)
    throw new ApiError(400, 'INVALID_FEATURES', '"features" must be a non-empty object of name -> value');
  const features = {};
  for (const [k, v] of Object.entries(f)) {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new ApiError(400, 'INVALID_FEATURE_VALUE', `Feature "${k}" must be a finite number`);
    features[k] = n;
  }
  const s = x => (x == null || x === '' ? null : String(x));
  return { modelRequest: { features }, sourceIp: s(body.sourceIp), destinationIp: s(body.destinationIp), mockScenario: body.mockScenario };
}
module.exports = { prepareFlow, ApiError };
