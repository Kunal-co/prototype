// API base: set <meta name="api-base" content="https://backend.example.com"> only if the API is on another origin.
const BASE = ((document.querySelector('meta[name=api-base]') || {}).content || '').replace(/\/$/, '') + '/api';
const $ = id => document.getElementById(id);
const LABEL = { normal: 'Normal', attack: 'Known attack', possible_zero_day: 'Possible Zero-Day / Unknown Anomaly', no_data: 'No data yet' };

async function api(path, opt = {}) {
  const t = sessionStorage.getItem('token');
  try {
    const response = await fetch(BASE + path, {
      ...opt,
      headers: {
        'Content-Type': 'application/json',
        ...(t && { Authorization: 'Bearer ' + t })
      }
    });

    const data = await response.json();
    if (response.status === 401 && path !== '/login') {
      sessionStorage.clear();
      location.href = 'login.html';
    }
    return data;
  } catch {
    return { success: false, error: { message: 'Cannot reach the server' } };
  }
}

const msg = d => (d.error && d.error.message) || d.message || 'Request failed';
const cell = (tr, v, cls) => {
  const td = tr.insertCell();
  td.textContent = v ?? '-';
  if (cls) td.className = cls;
};

function setError(text) {
  const el = $('err');
  if (!el) return;
  el.textContent = text || '';
}

if (document.body.dataset.page === 'login') {
  const loginForm = $('loginForm');
  const passwordField = $('p');
  const togglePassword = document.querySelector('[data-toggle-password]');

  const go = async () => {
    const username = $('u').value.trim();
    const password = $('p').value;
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    const d = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (d.success) {
      sessionStorage.setItem('token', d.token);
      sessionStorage.setItem('user', d.user.username);
      location.href = 'dashboard.html';
      return;
    }

    setError(msg(d));
  };

  if (loginForm) {
    loginForm.addEventListener('submit', event => {
      event.preventDefault();
      go();
    });
  }

  if (passwordField) {
    passwordField.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        go();
      }
    });
  }

  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      const shouldShow = passwordField.type === 'password';
      passwordField.type = shouldShow ? 'text' : 'password';
      togglePassword.textContent = shouldShow ? 'Hide' : 'Show';
      togglePassword.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
      passwordField.focus();
    });
  }
}

if (document.body.dataset.page === 'dashboard') {
  if (!sessionStorage.getItem('token')) location.href = 'login.html';
  $('out').onclick = () => {
    sessionStorage.clear();
    location.href = 'login.html';
  };

  async function refresh() {
    const [d, a] = await Promise.all([api('/dashboard'), api('/activity')]);
    if (!d.success || !a.success) {
      $('err').textContent = msg(d.success ? a : d);
      return;
    }

    $('err').textContent = '';
    const s = d.stats, c = d.currentStatus;
    $('total').textContent = s.totalEvents;
    $('normal').textContent = s.normalTraffic;
    $('attacks').textContent = s.attacks;
    $('anoms').textContent = s.anomalies;
    $('st').textContent = LABEL[c.status] || c.status;
    $('sev').textContent = c.severity;
    $('banner').className = 'panel s-' + c.status;

    const body = $('rows');
    body.textContent = '';

    for (const e of a.events) {
      const tr = body.insertRow();
      cell(tr, new Date(e.timestamp).toLocaleString());
      cell(tr, e.sourceIp);
      cell(tr, e.destinationIp);
      cell(tr, LABEL[e.status] || e.status, 'pill s-' + e.status);
      cell(tr, e.attackType);
      cell(tr, e.severity);
      cell(tr, e.confidence == null ? '-' : Math.round(e.confidence * 100) + '%');
    }

    $('empty').hidden = a.events.length > 0;
  }

  $('an').onclick = async () => {
    let features;
    try {
      features = JSON.parse($('feat').value);
    } catch {
      $('res').textContent = 'Features must be valid JSON';
      return;
    }

    const d = await api('/analyze', {
      method: 'POST',
      body: JSON.stringify({
        features,
        sourceIp: $('sip').value,
        destinationIp: $('dip').value,
        mockScenario: $('mock').value
      })
    });

    $('res').textContent = d.success
      ? `${LABEL[d.detection.status]} (${d.detection.severity}): ${d.detection.reason}`
      : msg(d);

    refresh();
  };

  refresh();
  setInterval(refresh, 5000);
}
