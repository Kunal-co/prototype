// test_detector.js - Mock detector for testing without real ML model
// This file provides random test scenarios to simulate ML model responses
// Use this to test the backend flow before integrating the real ML model

const SCENARIOS = {
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
  
  sqlInjection: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'SQL Injection',
      probability: 0.94
    },
    isolationForest: {
      prediction: 1,
      label: 'normal',
      anomalyScore: 0.08
    }
  },
  
  portScan: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'Port Scan',
      probability: 0.92
    },
    isolationForest: {
      prediction: -1,
      label: 'anomaly',
      anomalyScore: -0.35
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
  
  bruteForce: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'Brute Force',
      probability: 0.89
    },
    isolationForest: {
      prediction: -1,
      label: 'anomaly',
      anomalyScore: -0.28
    }
  },
  
  botnet: {
    success: true,
    xgboost: {
      prediction: 1,
      label: 'attack',
      attackType: 'Botnet',
      probability: 0.91
    },
    isolationForest: {
      prediction: 1,
      label: 'normal',
      anomalyScore: 0.12
    }
  },

  suspiciousTraffic: {
    success: true,
    xgboost: {
      prediction: 0,
      label: 'normal',
      attackType: null,
      probability: 0.65
    },
    isolationForest: {
      prediction: -1,
      label: 'anomaly',
      anomalyScore: -0.22
    }
  }
};

/**
 * Get a random test scenario
 * @returns {object} A mock ModelResponse
 */
function getRandomScenario() {
  const keys = Object.keys(SCENARIOS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return { scenario: randomKey, response: SCENARIOS[randomKey] };
}

/**
 * Get a specific scenario by name
 * @param {string} name - Scenario name (normal, attack, anomaly, etc.)
 * @returns {object} A mock ModelResponse
 */
function getScenario(name) {
  return SCENARIOS[name] || SCENARIOS.normal;
}

/**
 * List all available scenarios
 * @returns {array} Array of scenario names
 */
function listScenarios() {
  return Object.keys(SCENARIOS);
}

module.exports = { getRandomScenario, getScenario, listScenarios, SCENARIOS };

// USAGE INSTRUCTIONS:
// ==================
// 
// 1. IMPORT in detector.js temporarily:
//    const testDetector = require('./test_detector');
//
// 2. REPLACE the detect() function call in detector.js with:
//    const { scenario, response } = testDetector.getRandomScenario();
//    console.log('Using test scenario:', scenario);
//    return response;
//
// 3. OR use a specific scenario:
//    const response = testDetector.getScenario('attack');
//    return response;
//
// 4. AVAILABLE SCENARIOS:
const SCENARIO_DESCRIPTIONS = `
  - normal: Clean traffic, no threats detected
  - attack: Known attack detected by XGBoost, anomaly detected by IF
  - sqlInjection: SQL Injection attack scenario
  - portScan: Port scanning/reconnaissance activity
  - anomaly: Normal classification but anomaly detector triggered (possible zero-day)
  - bruteForce: Brute force attack pattern
  - botnet: Botnet communication pattern
  - suspiciousTraffic: Borderline case - low confidence normal, anomaly detected
//
// 5. WHEN DONE TESTING:
//    - Remove the test_detector import from detector.js
//    - Revert detector.js to use the real MODEL_URL
//    - Delete or archive this file
`;

console.log('Test detector loaded. ' + SCENARIO_DESCRIPTIONS);
