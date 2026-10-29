// Checks incoming data before it is saved. Never trust data from the browser.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function validateReading(body) {
  if (!body || typeof body !== "object") {
    return { error: "Body must be a JSON object." };
  }

  const fields = {
    powerW: body.powerW,
    voltageV: body.voltageV,
    currentA: body.currentA,
    energyKwh: body.energyKwh
  };

  for (const [name, value] of Object.entries(fields)) {
    if (!isNum(value) || value < 0) {
      return { error: `${name} must be a number that is 0 or more.` };
    }
  }
  if (fields.powerW > 100000) {
    return { error: "powerW is unrealistically large." };
  }

  // Use the sent timestamp if it is valid, otherwise use the server time
  let when = new Date(body.timestamp);
  if (Number.isNaN(when.getTime())) when = new Date();

  return {
    reading: {
      timestamp: when.toISOString(),
      powerW: fields.powerW,
      voltageV: fields.voltageV,
      currentA: fields.currentA,
      energyKwh: fields.energyKwh,
      simulated: true // always true: this project has no real hardware
    }
  };
}

function validateSettings(body) {
  if (!body || typeof body !== "object") {
    return { error: "Body must be a JSON object." };
  }
  if (!isNum(body.pricePerKwh) || body.pricePerKwh < 0 || body.pricePerKwh > 10000) {
    return { error: "pricePerKwh must be a number between 0 and 10000." };
  }
  if (!isNum(body.thresholdW) || body.thresholdW < 1 || body.thresholdW > 100000) {
    return { error: "thresholdW must be a number between 1 and 100000." };
  }
  return { settings: { pricePerKwh: body.pricePerKwh, thresholdW: body.thresholdW } };
}

module.exports = { validateReading, validateSettings };