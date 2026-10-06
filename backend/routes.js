const router = require('express').Router();
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const events = require('./events');
const { prepareFlowFromCaptured, ApiError } = require('./flow');
const { detect } = require('./detector');
const { decide } = require('./decision');
const PacketCapture = require('./capture');

let dbInitialized = false;
let packetCapture = null;

router.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await db.init();
      auth.seedAdmin();
      dbInitialized = true;
    } catch (error) {
      console.error('Initialization error:', error);
    }
  }
  next();
});

const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res)).catch(next);
};

// Public routes
router.post('/login', wrap(async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const result = await auth.login(username, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
}));

// Protected routes
router.use(auth.requireAuth);

router.get('/dashboard', wrap(async (req, res) => {
  const result = await events.dashboard();
  res.json(result);
}));

router.get('/activity', wrap(async (req, res) => {
  const result = await events.activity();
  res.json(result);
}));

router.get('/events', wrap(async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const isMine = req.query.mine === 'true';

    let eventList;
    if (isMine) {
      eventList = await db.getUserEvents(req.user.id, limit);
    } else {
      eventList = await events.list(limit);
    }

    res.json({
      success: true,
      events: eventList
    });
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
}));

// Capture management
router.post('/capture/start', wrap(async (req, res) => {
  try {
    if (packetCapture && packetCapture.isCapturing) {
      return res.status(400).json({
        success: false,
        message: 'Capture already running'
      });
    }

    packetCapture = new PacketCapture({
      device: req.body?.device || null,
      filter: req.body?.filter || 'tcp or udp'
    });

    const started = packetCapture.start();

    if (!started) {
      return res.status(503).json({
        success: false,
        message: 'Failed to start packet capture'
      });
    }

    res.json({
      success: true,
      message: 'Packet capture started',
      status: packetCapture.getStatus()
    });
  } catch (error) {
    console.error('Capture start error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

router.post('/capture/stop', wrap(async (req, res) => {
  try {
    if (!packetCapture || !packetCapture.isCapturing) {
      return res.status(400).json({
        success: false,
        message: 'Capture not running'
      });
    }

    packetCapture.stop();

    res.json({
      success: true,
      message: 'Packet capture stopped'
    });
  } catch (error) {
    console.error('Capture stop error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

router.get('/capture/status', wrap(async (req, res) => {
  try {
    if (!packetCapture) {
      return res.json({
        success: true,
        isCapturing: false,
        activeFlows: 0,
        message: 'Capture not initialized'
      });
    }

    const status = packetCapture.getStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Capture status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Get recent flows
router.get('/flows', wrap(async (req, res) => {
  try {
    if (!packetCapture || !packetCapture.isCapturing) {
      return res.json({
        success: true,
        flows: [],
        message: 'Capture not running'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const flows = packetCapture.getRecentFlows(limit);

    const flowsWithFeatures = flows.map((flow) => {
      try {
        const flowData = prepareFlowFromCaptured(flow);
        return {
          id: `${flow.srcIP}:${flow.srcPort}-${flow.dstIP}:${flow.dstPort}`,
          srcIP: flow.srcIP,
          dstIP: flow.dstIP,
          srcPort: flow.srcPort,
          dstPort: flow.dstPort,
          protocol: flow.protocol,
          duration: flow.lastSeen - flow.firstSeen,
          totalPackets: flow.totalFwdPackets + flow.totalBwdPackets,
          totalBytes: flow.totalFwdBytes + flow.totalBwdBytes,
          features: flowData.modelRequest.features
        };
      } catch (error) {
        console.error('Error processing flow:', error);
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      flows: flowsWithFeatures,
      totalFlows: packetCapture.getFlowCount()
    });
  } catch (error) {
    console.error('Get flows error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Analyze a specific captured flow
router.post('/analyze/flow/:flowId', wrap(async (req, res) => {
  try {
    if (!packetCapture || !packetCapture.isCapturing) {
      return res.status(400).json({
        success: false,
        message: 'Packet capture not running'
      });
    }

    const flowId = req.params.flowId;
    const flows = packetCapture.getAllFlows();
    const targetFlow = flows.find(
      f => `${f.srcIP}:${f.srcPort}-${f.dstIP}:${f.dstPort}` === flowId
    );

    if (!targetFlow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }

    // Prepare flow and get model prediction
    const flowData = prepareFlowFromCaptured(targetFlow);

    const modelResponse = await detect(
      flowData.modelRequest,
      req.body?.mockScenario || 'normal'
    );

    const result = decide(modelResponse);

    // Record event in database
    if (result.success) {
      await events.record(req.user.id, result, flowData);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }

    console.error('Analyze flow error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis failed: ' + error.message
    });
  }
}));

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Unknown endpoint' }
  });
});

// Global error handler
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message
    }
  });
});

module.exports = router;