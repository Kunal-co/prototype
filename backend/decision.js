function decide(modelResponse) {
  try {
    if (!modelResponse) {
      throw new Error('Model response is null');
    }

    const x = modelResponse.xgboost;
    const i = modelResponse.isolationForest;

    if (!x || !i) {
      throw new Error('Missing model outputs');
    }

    const xLabel = String(x.label || '').toLowerCase().trim();
    const iLabel = String(i.label || '').toLowerCase().trim();

    let detection;

    if (xLabel === 'attack') {
      detection = {
        status: 'attack',
        severity: 'high',
        confidence: typeof x.probability === 'number' ? x.probability : 0.5,
        attackType: x.attackType || 'Unknown Attack',
        reason: x.attackType
          ? `Known attack detected: ${x.attackType}`
          : 'Known attack pattern detected'
      };
    } else if (iLabel === 'anomaly') {
      detection = {
        status: 'possible_zero_day',
        severity: 'critical',
        confidence: typeof i.anomalyScore === 'number' ? Math.abs(i.anomalyScore) : 0.5,
        attackType: null,
        reason: 'Anomalous traffic detected. Possible zero-day or unknown attack.'
      };
    } else {
      detection = {
        status: 'normal',
        severity: 'low',
        confidence: typeof x.probability === 'number' ? x.probability : 0.5,
        attackType: null,
        reason: 'Traffic appears normal'
      };
    }

    return {
      success: true,
      detection,
      models: {
        xgboost: {
          label: x.label || 'unknown',
          confidence: x.probability ?? null,
          attackType: x.attackType || null
        },
        isolationForest: {
          label: i.label || 'unknown',
          anomalyScore: i.anomalyScore ?? null
        }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Decision error:', error);
    return {
      success: false,
      error: {
        code: 'DECISION_ERROR',
        message: error.message
      }
    };
  }
}

module.exports = { decide };