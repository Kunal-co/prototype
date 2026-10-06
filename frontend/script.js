const API_BASE = '/api';

class App {
  constructor() {
    this.token = null;
    this.user = null;
    this.isLoggedIn = false;
    this.captureRunning = false;
    this.autoRefreshInterval = null;
  }

  async apiCall(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();

      if (response.status === 401 && this.isLoggedIn) {
        this.logout();
        return null;
      }

      return data;
    } catch (error) {
      console.error('API call error:', error);
      return {
        success: false,
        error: { message: 'Network error' }
      };
    }
  }

  async login(username, password) {
    const result = await this.apiCall('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (result?.success && result.token) {
      this.token = result.token;
      this.user = result.user;
      this.isLoggedIn = true;
      sessionStorage.setItem('token', this.token);
      sessionStorage.setItem('user', JSON.stringify(this.user));
      return true;
    }

    return false;
  }

  logout() {
    this.token = null;
    this.user = null;
    this.isLoggedIn = false;
    sessionStorage.clear();
    window.location.href = 'login.html';
  }

  restoreSession() {
    const token = sessionStorage.getItem('token');
    const user = sessionStorage.getItem('user');

    if (token && user) {
      this.token = token;
      this.user = JSON.parse(user);
      this.isLoggedIn = true;
      return true;
    }

    return false;
  }
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'login') {
    initLoginPage();
  } else if (page === 'dashboard') {
    initDashboardPage();
  }
});

function initLoginPage() {
  const form = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.remove('show');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError(errorMessage, 'Please enter username and password');
      return;
    }

    const success = await app.login(username, password);

    if (success) {
      window.location.href = 'dashboard.html';
    } else {
      showError(errorMessage, 'Invalid username or password');
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
  });
}

function initDashboardPage() {
  if (!app.restoreSession()) {
    window.location.href = 'login.html';
    return;
  }

  setupDashboardElements();
  setupEventListeners();
  loadDashboard();

  app.autoRefreshInterval = setInterval(loadDashboard, 3000);
}

function setupDashboardElements() {
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage && app.user) {
    welcomeMessage.textContent = `Welcome, ${app.user.username}`;
  }
}

function setupEventListeners() {
  const captureToggleBtn = document.getElementById('captureToggleBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshFlowsBtn = document.getElementById('refreshFlowsBtn');
  const refreshEventsBtn = document.getElementById('refreshEventsBtn');

  if (captureToggleBtn) {
    captureToggleBtn.addEventListener('click', toggleCapture);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => app.logout());
  }

  if (refreshFlowsBtn) {
    refreshFlowsBtn.addEventListener('click', loadFlows);
  }

  if (refreshEventsBtn) {
    refreshEventsBtn.addEventListener('click', loadEvents);
  }

  // Update capture status periodically
  setInterval(updateCaptureStatus, 2000);
}

async function toggleCapture() {
  try {
    const btn = document.getElementById('captureToggleBtn');

    if (app.captureRunning) {
      // Stop capture
      const result = await app.apiCall('/capture/stop', { method: 'POST' });
      if (result?.success) {
        app.captureRunning = false;
        btn.textContent = 'Start Capture';
        btn.classList.remove('btn-primary-active');
      }
    } else {
      // Start capture
      const result = await app.apiCall('/capture/start', { method: 'POST' });
      if (result?.success) {
        app.captureRunning = true;
        btn.textContent = 'Stop Capture';
        btn.classList.add('btn-primary-active');
        loadFlows();
      }
    }
  } catch (error) {
    console.error('Capture toggle error:', error);
  }
}

async function updateCaptureStatus() {
  try {
    const result = await app.apiCall('/capture/status');

    if (result?.success) {
      const statusText = document.getElementById('captureStatusText');
      const flowCountText = document.getElementById('flowCountText');

      if (result.isCapturing) {
        statusText.textContent = '🔴 Capture Running';
        statusText.style.color = '#3fb950';
      } else {
        statusText.textContent = '⚫ Capture Stopped';
        statusText.style.color = '#8b949e';
      }

      flowCountText.textContent = `${result.activeFlows} flows`;
    }
  } catch (error) {
    console.error('Error updating capture status:', error);
  }
}

async function loadFlows() {
  try {
    const result = await app.apiCall('/flows');

    if (!result?.success) {
      return;
    }

    const tbody = document.getElementById('flowsTable');
    tbody.innerHTML = '';

    if (result.flows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center; color: #888;">No flows captured</td></tr>';
      return;
    }

    result.flows.forEach((flow) => {
      const row = tbody.insertRow();

      row.innerHTML = `
        <td><code>${flow.srcIP}</code></td>
        <td>${flow.srcPort}</td>
        <td><code>${flow.dstIP}</code></td>
        <td>${flow.dstPort}</td>
        <td>${flow.protocol}</td>
        <td>${flow.totalPackets}</td>
        <td>${flow.totalBytes}</td>
        <td><button class="analyze-btn" data-flow-id="${flow.id}">Analyze</button></td>
      `;

      const analyzeBtn = row.querySelector('.analyze-btn');
      analyzeBtn.addEventListener('click', () => analyzeFlow(flow.id));
    });
  } catch (error) {
    console.error('Load flows error:', error);
  }
}

async function analyzeFlow(flowId) {
  try {
    const result = await app.apiCall(`/analyze/flow/${flowId}`, {
      method: 'POST',
      body: JSON.stringify({})
    });

    if (result?.success) {
      showFlowAnalysisResult(result);
      loadDashboard();
    } else {
      alert('Analysis failed: ' + (result?.error?.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Analyze flow error:', error);
    alert('Error analyzing flow');
  }
}

function showFlowAnalysisResult(result) {
  const detection = result.detection;
  const models = result.models;

  const statusClass =
    detection.status === 'normal'
      ? 'result-success'
      : detection.status === 'attack'
        ? 'result-danger'
        : 'result-warning';

  alert(`
Analysis Result:
━━━━━━━━━━━━━━━━━
Status: ${formatStatus(detection.status)}
Severity: ${detection.severity.toUpperCase()}
Confidence: ${(detection.confidence * 100).toFixed(1)}%
${detection.attackType ? `Attack Type: ${detection.attackType}` : ''}

━━━━━━━━━━━━━━━━━
XGBoost:
  Label: ${models.xgboost.label}
  Confidence: ${(models.xgboost.confidence * 100).toFixed(1)}%

Isolation Forest:
  Label: ${models.isolationForest.label}
  Anomaly Score: ${models.isolationForest.anomalyScore?.toFixed(3)}

━━━━━━━━━━━━━━━━━
${detection.reason}
  `);
}

async function loadDashboard() {
  try {
    const [dashboardResult, eventsResult] = await Promise.all([
      app.apiCall('/dashboard'),
      app.apiCall('/activity')
    ]);

    if (!dashboardResult?.success || !eventsResult?.success) {
      return;
    }

    updateDashboard(dashboardResult, eventsResult);
  } catch (error) {
    console.error('Load dashboard error:', error);
  }
}

function updateDashboard(dashboardResult, eventsResult) {
  const { stats, currentStatus } = dashboardResult;
  const { events } = eventsResult;

  document.getElementById('totalEvents').textContent = stats.totalEvents;
  document.getElementById('normalTraffic').textContent = stats.normalTraffic;
  document.getElementById('attacks').textContent = stats.attacks;
  document.getElementById('anomalies').textContent = stats.anomalies;

  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const severityText = document.getElementById('severityText');
  const lastUpdate = document.getElementById('lastUpdate');

  statusBanner.className = `status-banner status-${currentStatus.status}`;
  statusText.textContent = formatStatus(currentStatus.status);
  severityText.textContent = currentStatus.severity.toUpperCase();
  lastUpdate.textContent = new Date().toLocaleTimeString();

  const eventsTable = document.getElementById('eventsTable');
  eventsTable.innerHTML = '';

  if (events.length === 0) {
    eventsTable.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: #888;">No events yet</td></tr>';
  } else {
    events.forEach((event) => {
      const row = eventsTable.insertRow();
      row.innerHTML = `
        <td>${new Date(event.timestamp).toLocaleString()}</td>
        <td><code>${event.sourceIp || '—'}</code></td>
        <td><code>${event.destinationIp || '—'}</code></td>
        <td><span class="status-badge ${event.status}">${formatStatus(event.status)}</span></td>
        <td>${event.attackType || '—'}</td>
        <td>${event.confidence ? (event.confidence * 100).toFixed(1) + '%' : '—'}</td>
      `;
    });
  }
}

async function loadEvents() {
  await loadDashboard();
}

function showError(element, message) {
  element.textContent = message;
  element.classList.add('show');
}

function formatStatus(status) {
  const statusMap = {
    normal: 'Normal',
    attack: 'Attack Detected',
    possible_zero_day: 'Possible Zero-Day'
  };
  return statusMap[status] || status;
}