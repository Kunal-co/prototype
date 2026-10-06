const { ApiError } = require('./flow');

// Mock responses for testing before real model is deployed
const MOCK_RESPONSES = {
  normal: {
    success: true,
    xgboost: {
      prediction: 0,
      label: 'normal',
      attackType: null,
      probability: 0.98
    },
    isolationForest: {
      prediction: 1,
      label: 'normal',
      anomalyScore: 0.18
    }
  },

  attack: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'DDoS',
      probability: 0.96
    },
    isolationForest: {
      prediction: -1,
      label: 'anomaly',
      anomalyScore: -0.4
    }
  },

  anomaly: {
    success: true,
    xgboost: {
      prediction: 0,
      label: 'normal',
      attackType: null,
      probability: 0.61
    },
    isolationForest: {
      prediction: -1,
      label: 'anomaly',
      anomalyScore: -0.31
    }
  },

  sqlInjection: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'SQL Injection',
      probability: 0.89
    },
    isolationForest: {
      prediction: 1,
      label: 'normal',
      anomalyScore: 0.12
    }
  },

  portScan: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'Port Scan',
      probability: 0.87
    },
    isolationForest: {
      prediction: -1,
      label: 'anomaly',
      anomalyScore: -0.35
    }
  },

  bruteForce: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'Brute Force',
      probability: 0.92
    },
    isolationForest: {
      prediction: 1,
      label: 'normal',
      anomalyScore: 0.08
    }
  }
};

function validateModelResponse(response) {
  if (!response) {
    throw new ApiError(502, 'MODEL_BAD_RESPONSE', 'Model returned null');
  }

  if (response.success !== true) {
    throw new ApiError(502, 'MODEL_BAD_RESPONSE', 'Model returned success=false');
  }

  if (!response.xgboost || typeof response.xgboost.label !== 'string') {
    throw new ApiError(502, 'MODEL_BAD_RESPONSE', 'Missing or invalid xgboost response');
  }

  if (!response.isolationForest || typeof response.isolationForest.label !== 'string') {
    throw new ApiError(502, 'MODEL_BAD_RESPONSE', 'Missing or invalid isolationForest response');
  }

  return response;
}

async function detect(modelRequest, mockScenario) {
  try {
    const mode = process.env.MODEL_MODE || 'mock';

    if (mode === 'mock') {
      const selected = MOCK_RESPONSES[mockScenario] || MOCK_RESPONSES.normal;
      return validateModelResponse(JSON.parse(JSON.stringify(selected)));
    }

    if (mode === 'http') {
      if (!process.env.MODEL_URL) {
        throw new ApiError(503, 'MODEL_NOT_CONFIGURED', 'MODEL_URL environment variable not set');
      }

      const response = await fetch(process.env.MODEL_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.MODEL_API_KEY ? { Authorization: `Bearer ${process.env.MODEL_API_KEY}` } : {})
        },
        body: JSON.stringify(modelRequest)
      });

      if (!response.ok) {
        throw new ApiError(502, 'MODEL_ERROR', `Model API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return validateModelResponse(data);
    }

    throw new ApiError(503, 'MODEL_NOT_CONFIGURED', `Unknown MODEL_MODE: ${mode}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Detector error:', error);
    throw new ApiError(502, 'MODEL_UNAVAILABLE', 'Could not reach model service');
  }
}

module.exports = { detect };