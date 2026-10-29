// Main logic: ties the simulator, API, charts and dashboard together.
const state = {
  timer: null,
  todayKwh: 0,
  tickCount: 0,
  peakW: 0,
  settings: { pricePerKwh: CONFIG.DEFAULT_PRICE, thresholdW: CONFIG.DEFAULT_THRESHOLD }
};

const $ = (id) => document.getElementById(id);
const todayUTC = () => new Date().toISOString().slice(0, 10);

function setBackendStatus(online) {
  const el = $("backendStatus");
  el.textContent = online ? "Backend: connected" : "Backend: offline (local only)";
  el.className = "badge " + (online ? "badge-on" : "badge-off");
}

function renderEnergyAndCost() {
  $("energyVal").textContent = state.todayKwh.toFixed(4);
  $("costVal").textContent = (state.todayKwh * state.settings.pricePerKwh).toFixed(2);
}

function checkAlert(powerW) {
  const banner = $("alertBanner");
  if (powerW > state.settings.thresholdW) {
    banner.textContent = `⚠ High usage: ${powerW} W exceeds your ${state.settings.thresholdW} W threshold (simulated reading)`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function renderSummary(rows) {
  const body = $("summaryBody");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6">No data yet. Start the simulation.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${Number(r.totalKwh).toFixed(4)}</td>
      <td>${CONFIG.CURRENCY}${(r.totalKwh * state.settings.pricePerKwh).toFixed(2)}</td>
      <td>${r.peakPowerW}</td>
      <td>${r.peakTime ? new Date(r.peakTime).toLocaleTimeString() : "--"}</td>
      <td>${r.readingCount}</td>
    </tr>`).join("");
}

async function refreshHistoryAndSummary() {
  try {
    const [readings, summary] = await Promise.all([
      api.getReadings(CONFIG.HISTORY_LIMIT),
      api.getSummary()
    ]);
    setHistory(readings);
    renderSummary(summary);
    setBackendStatus(true);
  } catch {
    setBackendStatus(false);
  }
}

async function tick() {
  const r = generateReading();

  $("powerVal").textContent = r.powerW;
  $("voltageVal").textContent = r.voltageV;
  $("currentVal").textContent = r.currentA;

  state.todayKwh += r.energyKwh;
  renderEnergyAndCost();

  if (r.powerW > state.peakW) {
    state.peakW = r.powerW;
    $("peakVal").textContent = r.powerW;
    $("peakTime").textContent = "W at " + new Date(r.timestamp).toLocaleTimeString();
  }

  checkAlert(r.powerW);
  addLivePoint(new Date(r.timestamp).toLocaleTimeString(), r.powerW);

  try {
    await api.saveReading(r);
    setBackendStatus(true);
  } catch {
    setBackendStatus(false);
  }

  state.tickCount++;
  if (state.tickCount % 10 === 0) refreshHistoryAndSummary();
}

function startSimulation() {
  if (state.timer) return;
  state.timer = setInterval(tick, CONFIG.INTERVAL_MS);
  tick();
  $("startBtn").disabled = true;
  $("stopBtn").disabled = false;
  $("simState").textContent = "Running (simulated)";
}

function stopSimulation() {
  clearInterval(state.timer);
  state.timer = null;
  $("startBtn").disabled = false;
  $("stopBtn").disabled = true;
  $("simState").textContent = "Stopped";
  refreshHistoryAndSummary();
}

async function loadSettings() {
  try {
    const s = await api.getSettings();
    state.settings.pricePerKwh = s.pricePerKwh;
    state.settings.thresholdW = s.thresholdW;
    setBackendStatus(true);
  } catch {
    setBackendStatus(false);
  }
  $("priceInput").value = state.settings.pricePerKwh;
  $("thresholdInput").value = state.settings.thresholdW;
}

async function saveSettings(event) {
  event.preventDefault();
  state.settings.pricePerKwh = parseFloat($("priceInput").value);
  state.settings.thresholdW = parseFloat($("thresholdInput").value);
  renderEnergyAndCost();
  try {
    await api.saveSettings(state.settings);
    setBackendStatus(true);
  } catch {
    setBackendStatus(false);
  }
}

async function init() {
  document.querySelectorAll(".cur").forEach(el => (el.textContent = CONFIG.CURRENCY));
  initCharts();
  await loadSettings();
  await refreshHistoryAndSummary();

  // Continue today's running total from what is already stored
  try {
    const summary = await api.getSummary();
    const today = summary.find(row => row.date === todayUTC());
    if (today) state.todayKwh = Number(today.totalKwh);
  } catch { /* backend not ready yet, start from zero */ }
  renderEnergyAndCost();

  $("startBtn").addEventListener("click", startSimulation);
  $("stopBtn").addEventListener("click", stopSimulation);
  $("refreshBtn").addEventListener("click", refreshHistoryAndSummary);
  $("settingsForm").addEventListener("submit", saveSettings);
}

init();