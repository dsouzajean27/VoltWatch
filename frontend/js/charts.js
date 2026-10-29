let liveChart, historyChart;

function makeLineChart(canvasId, label, color) {
  return new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 8 }, grid: { color: "#334155" } },
        y: { beginAtZero: true, ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }
      },
      plugins: { legend: { labels: { color: "#e2e8f0" } } }
    }
  });
}

function initCharts() {
  liveChart = makeLineChart("liveChart", "Power (W) – simulated", "#38bdf8");
  historyChart = makeLineChart("historyChart", "Power (W) – simulated history", "#22c55e");
}

function addLivePoint(timeLabel, powerW) {
  const data = liveChart.data;
  data.labels.push(timeLabel);
  data.datasets[0].data.push(powerW);
  if (data.labels.length > CONFIG.LIVE_POINTS) {
    data.labels.shift();
    data.datasets[0].data.shift();
  }
  liveChart.update();
}

function setHistory(readings) {
  historyChart.data.labels = readings.map(r =>
    new Date(r.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  historyChart.data.datasets[0].data = readings.map(r => r.powerW);
  historyChart.update();
}