const router = require('express').Router();
const db = require('./db'), auth = require('./auth'), events = require('./events');
const { prepareFlow, ApiError } = require('./flow'), { detect } = require('./detector'), { decide } = require('./decision');
const wrap = fn => (req, res, next) => fn(req, res).catch(next);
router.use((req, res, next) => db.init().then(auth.seedAdmin).then(() => next(), next));

router.post('/login', wrap(async (req, res) => {
  const r = await auth.login(req.body?.username, req.body?.password);
  if (!r) return res.status(401).json({ success: false, user: null, message: 'Invalid username or password' });
  res.json({ success: true, user: r.user, token: r.token, message: null });
}));
router.use(auth.requireAuth);
router.get('/dashboard', wrap(async (req, res) => res.json(await events.dashboard())));
router.get('/activity', wrap(async (req, res) => res.json(await events.activity())));
router.get('/events', wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  res.json({ success: true, events: req.query.mine === 'true' ? await db.getUserEvents(req.user.id, limit) : await events.list(limit) });
}));
router.post('/analyze', wrap(async (req, res) => {
  const flow = prepareFlow(req.body);
  const mock = (process.env.MODEL_MODE || 'mock') === 'mock' ? flow.mockScenario : undefined;
  const result = decide(await detect(flow.modelRequest, mock));
  await events.record(req.user.id, result, flow);
  res.json(result);
}));
router.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } }));
router.use((err, req, res, next) => {
  if (!(err instanceof ApiError)) console.error(err);
  res.status(err.status || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.status ? err.message : 'Internal server error' } });
});
module.exports = router;
