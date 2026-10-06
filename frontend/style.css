 :root {
  --bg: #07141d;
  --panel: #0f1d2a;
  --panel-soft: #122532;
  --line: rgba(143, 190, 220, 0.18);
  --text: #ebf4ff;
  --muted: #9db7c9;
  --accent: #60d2ff;
  --accent-strong: #3ab8f7;
  --ok: #45d39a;
  --warn: #f4b75d;
  --crit: #ff5d73;
  --shadow: rgba(8, 18, 26, 0.5);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at top, #112a3d 0%, var(--bg) 35%, #07141d 100%);
  color: var(--text);
}

body {
  min-height: 100vh;
}

h1, h2, h3 {
  margin: 0 0 0.6rem;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

button, input, select, textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid rgba(96, 210, 255, 0.9);
  outline-offset: 2px;
}

.wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}

.hero {
  min-height: 100vh;
  display: grid;
  align-content: center;
  gap: 1.5rem;
}

.hero h1 {
  font-size: clamp(2.5rem, 6vw, 5rem);
  max-width: 12ch;
}

.hero p {
  max-width: 58ch;
  color: var(--muted);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.tags span {
  border: 1px solid var(--line);
  background: rgba(17, 34, 46, 0.8);
  color: var(--accent);
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85rem;
}

.btn {
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #041e2c;
  font-weight: 700;
  padding: 0.8rem 1.15rem;
  min-height: 46px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 10px 25px rgba(92, 172, 245, 0.25);
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.ghost {
  background: rgba(15, 29, 42, 0.7);
  border: 1px solid var(--line);
  color: var(--text);
  box-shadow: none;
}

.btn-full {
  width: 100%;
}

.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
}

.auth-card {
  width: min(100%, 430px);
  background: rgba(16, 29, 39, 0.9);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 24px 60px var(--shadow);
}

.brand-block {
  margin-bottom: 1rem;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(96, 210, 255, 0.1);
  border: 1px solid rgba(96, 210, 255, 0.2);
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

#login-title {
  margin-top: 0.8rem;
  font-size: clamp(1.7rem, 4vw, 2.4rem);
}

form {
  display: grid;
  gap: 1rem;
}

label {
  display: grid;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 600;
}

label span {
  color: var(--muted);
}

input, select, textarea {
  width: 100%;
  border: 1px solid var(--line);
  background: rgba(6, 16, 22, 0.9);
  color: var(--text);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  font-size: 1rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input::placeholder {
  color: rgba(157, 183, 201, 0.72);
}

input:focus, select:focus, textarea:focus {
  border-color: rgba(96, 210, 255, 0.88);
  box-shadow: 0 0 0 4px rgba(96, 210, 255, 0.12);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 4.2rem;
}

.toggle-password {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: rgba(96, 210, 255, 0.12);
  color: var(--accent);
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.err {
  margin: 0;
  min-height: 1.25rem;
  color: var(--crit);
  font-size: 0.9rem;
}

.panel {
  background: rgba(17, 31, 42, 0.92);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.25rem;
}

header.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

#banner {
  border-left: 6px solid var(--ok);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

#banner b {
  font-size: clamp(1.2rem, 2.6vw, 1.8rem);
}

.s-normal { --c: var(--ok); }
.s-attack { --c: var(--warn); }
.s-possible_zero_day { --c: var(--crit); }
.s-no_data { --c: var(--muted); }

#banner { border-color: var(--c, var(--muted)); }
.pill { color: var(--c); font-weight: 700; }

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stats .panel {
  display: grid;
  gap: 0.2rem;
}

.stats .panel b {
  display: block;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-variant-numeric: tabular-nums;
}

.stats span {
  color: var(--muted);
}

.scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

th, td {
  text-align: left;
  vertical-align: top;
  padding: 0.7rem 0.7rem;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

th {
  color: var(--muted);
  font-weight: 600;
}

summary {
  cursor: pointer;
  font-weight: 600;
}

details .panel {
  display: grid;
  gap: 0.8rem;
  margin-top: 0.8rem;
}

textarea {
  min-height: 120px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

@media (max-width: 640px) {
  .auth-card {
    padding: 1.2rem;
  }

  .wrap {
    padding: 1.25rem 0.9rem;
  }

  header.bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
