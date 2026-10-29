// All Azure Table Storage code lives in this one file.
// The connection string comes from an environment variable, never from code.
const { TableClient, odata } = require("@azure/data-tables");

const DEFAULT_SETTINGS = { pricePerKwh: 8, thresholdW: 1500 };
const MAX_ROWKEY = 9999999999999; // used to make newest rows sort first

let clients = null;
let tablesReady = null;

// Creates the three table clients the first time they are needed
function getClients() {
  if (clients) return clients;

  const conn = process.env.STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error("STORAGE_CONNECTION_STRING is not set.");

  // Azurite (the local emulator) uses plain http, so allow that only locally
  const options = { allowInsecureConnection: conn.includes("UseDevelopmentStorage=true") };
  const make = (name) => TableClient.fromConnectionString(conn, name, options);

  clients = {
    readings: make("Readings"),
    summary: make("DailySummary"),
    settings: make("Settings")
  };
  return clients;
}

// Makes sure the tables exist (safe to call many times)
async function ready() {
  const c = getClients();
  if (!tablesReady) {
    tablesReady = Promise.all([
      c.readings.createTable(),
      c.summary.createTable(),
      c.settings.createTable()
    ]).catch((err) => {
      tablesReady = null; // try again on the next request
      throw err;
    });
  }
  await tablesReady;
  return c;
}

const dateOf = (isoString) => isoString.slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function toReading(e) {
  return {
    timestamp: e.readingTime,
    powerW: Number(e.powerW),
    voltageV: Number(e.voltageV),
    currentA: Number(e.currentA),
    energyKwh: Number(e.energyKwh),
    simulated: true
  };
}

// Adds one reading to the day's running totals and checks for a new peak
async function updateDailySummary(c, reading) {
  const date = dateOf(reading.timestamp);
  let s = { totalKwh: 0, peakPowerW: 0, peakTime: "", readingCount: 0 };

  try {
    s = await c.summary.getEntity("summary", date);
  } catch (err) {
    if (err.statusCode !== 404) throw err; // 404 just means "first reading of the day"
  }

  const isNewPeak = reading.powerW > Number(s.peakPowerW || 0);

  await c.summary.upsertEntity({
    partitionKey: "summary",
    rowKey: date,
    totalKwh: Math.round((Number(s.totalKwh) + reading.energyKwh) * 1e6) / 1e6,
    peakPowerW: isNewPeak ? reading.powerW : Number(s.peakPowerW),
    peakTime: isNewPeak ? reading.timestamp : s.peakTime,
    readingCount: Number(s.readingCount) + 1
  });
}

async function saveReading(reading) {
  const c = await ready();
  const ms = new Date(reading.timestamp).getTime();

  await c.readings.upsertEntity({
    partitionKey: dateOf(reading.timestamp),
    rowKey: String(MAX_ROWKEY - ms).padStart(13, "0"),
    readingTime: reading.timestamp,
    powerW: reading.powerW,
    voltageV: reading.voltageV,
    currentA: reading.currentA,
    energyKwh: reading.energyKwh,
    simulated: true
  });

  await updateDailySummary(c, reading);
}

// Newest rows come first inside each day, so we collect them and flip at the end
async function getLatestReadings(limit) {
  const c = await ready();
  const out = [];

  for (let i = 0; i < 7 && out.length < limit; i++) {
    const date = daysAgo(i);
    const rows = c.readings.listEntities({
      queryOptions: { filter: odata`PartitionKey eq ${date}` }
    });
    for await (const e of rows) {
      out.push(toReading(e));
      if (out.length >= limit) break;
    }
  }
  return out.reverse(); // oldest first, ready for the chart
}

async function getDailySummaries(days) {
  const c = await ready();
  const start = daysAgo(days - 1);
  const rows = [];

  const iter = c.summary.listEntities({
    queryOptions: { filter: odata`PartitionKey eq 'summary' and RowKey ge ${start}` }
  });
  for await (const e of iter) {
    rows.push({
      date: e.rowKey,
      totalKwh: Number(e.totalKwh),
      peakPowerW: Number(e.peakPowerW),
      peakTime: e.peakTime || null,
      readingCount: Number(e.readingCount)
    });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date)); // newest day first
  return rows;
}

async function getSettings() {
  const c = await ready();
  try {
    const e = await c.settings.getEntity("settings", "default");
    return { pricePerKwh: Number(e.pricePerKwh), thresholdW: Number(e.thresholdW) };
  } catch (err) {
    if (err.statusCode === 404) return { ...DEFAULT_SETTINGS };
    throw err;
  }
}

async function saveSettings(settings) {
  const c = await ready();
  await c.settings.upsertEntity({
    partitionKey: "settings",
    rowKey: "default",
    pricePerKwh: settings.pricePerKwh,
    thresholdW: settings.thresholdW
  });
}

module.exports = {
  saveReading,
  getLatestReadings,
  getDailySummaries,
  getSettings,
  saveSettings
};