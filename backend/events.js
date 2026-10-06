const crypto = require('crypto');
const db = require('./db');

function getCurrentStatus(recentEvents) {
  if (!recentEvents || recentEvents.length === 0) {
    return { status: 'normal', severity: 'low' };
  }

  if (recentEvents.some((e) => e.status === 'possible_zero_day')) {
    return { status: 'possible_zero_day', severity: 'critical' };
  }

  if (recentEvents.some((e) => e.status === 'attack')) {
    return { status: 'attack', severity: 'high' };
  }

  return { status: 'normal', severity: 'low' };
}

async function record(userId, result, flowData) {
  try {
    if (!result.detection) {
      throw new Error('Invalid result structure');
    }

    const event = {
      id: crypto.randomUUID(),
      timestamp: result.timestamp || new Date().toISOString(),
      userId,
      sourceIp: flowData?.sourceIp || null,
      destinationIp: flowData?.destinationIp || null,
      destinationPort: flowData?.destinationPort || null,
      status: result.detection.status,
      severity: result.detection.severity,
      attackType: result.detection.attackType || null,
      confidence: result.detection.confidence ?? null,
      reason: result.detection.reason || 'No reason provided',
      anomalyScore: result.models?.isolationForest?.anomalyScore ?? null,
      xgboostLabel: result.models?.xgboost?.label || null,
      xgboostProb: result.models?.xgboost?.confidence ?? null,
      isoForestLabel: result.models?.isolationForest?.label || null,
      isoForestScore: result.models?.isolationForest?.anomalyScore ?? null
    };

    const success = await db.saveEvent(event);

    if (!success) {
      throw new Error('Failed to save event to database');
    }

    return event;
  } catch (error) {
    console.error('Error recording event:', error);
    throw error;
  }
}

async function dashboard() {
  try {
    const stats = await db.getDashboardStats();
    const recent = await db.getEvents(20);

    const currentStatus = getCurrentStatus(recent);

    return {
      success: true,
      stats,
      currentStatus
    };
  } catch (error) {
    console.error('Dashboard error:', error);
    return {
      success: false,
      error: { code: 'DASHBOARD_ERROR', message: error.message }
    };
  }
}

async function activity() {
  try {
    const eventsList = await db.getEvents(50);

    return {
      success: true,
      events: eventsList.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        sourceIp: event.sourceIp,
        destinationIp: event.destinationIp,
        destinationPort: event.destinationPort,
        status: event.status,
        severity: event.severity,
        attackType: event.attackType,
        confidence: event.confidence,
        reason: event.reason
      }))
    };
  } catch (error) {
    console.error('Activity error:', error);
    return {
      success: false,
      error: { code: 'ACTIVITY_ERROR', message: error.message }
    };
  }
}

async function list(limit = 50) {
  try {
    return await db.getEvents(limit);
  } catch (error) {
    console.error('List events error:', error);
    return [];
  }
}

module.exports = {
  record,
  dashboard,
  activity,
  list
};