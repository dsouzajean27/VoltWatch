// Generates FAKE electricity readings. No hardware involved.
let basePower = 800; // watts, drifts slowly like a real household load

function generateReading() {
  // Slow random drift, kept between 200 W and 2200 W
  basePower += (Math.random() - 0.5) * 120;
  basePower = Math.max(200, Math.min(2200, basePower));

  // Occasional spike (about 1 in 15 readings), like a kettle or heater turning on
  const spike = Math.random() < 0.07 ? 600 + Math.random() * 600 : 0;

  const powerW = Math.round(basePower + spike + (Math.random() - 0.5) * 60);
  const voltageV = +(230 + (Math.random() - 0.5) * 8).toFixed(1);
  const currentA = +(powerW / voltageV).toFixed(2);

  // Energy used in this interval: kWh = W x hours / 1000
  const hours = (CONFIG.INTERVAL_MS / 1000) * CONFIG.TIME_SCALE / 3600;
  const energyKwh = +((powerW * hours) / 1000).toFixed(6);

  return {
    timestamp: new Date().toISOString(),
    powerW,
    voltageV,
    currentA,
    energyKwh,
    simulated: true
  };
}