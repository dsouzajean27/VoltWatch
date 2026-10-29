// All backend calls live here. The frontend never sees Azure keys;
// it only talks to /api, and the backend holds the credentials.
async function request(path, options) {
  const res = await fetch(CONFIG.API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error("API error " + res.status);
  return res.json();
}

const api = {
  saveReading: (reading) =>
    request("/readings", { method: "POST", body: JSON.stringify(reading) }),
  getReadings: (limit) => request("/readings?limit=" + limit),
  getSummary: () => request("/summary"),
  getSettings: () => request("/settings"),
  saveSettings: (settings) =>
    request("/settings", { method: "PUT", body: JSON.stringify(settings) })
};