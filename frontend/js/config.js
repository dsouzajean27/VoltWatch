// Central settings. Change values here, not inside other files.
const CONFIG = {
  API_BASE: "/api",        // Static Web Apps routes /api to your Azure Functions
  INTERVAL_MS: 2000,       // one new reading every 2 seconds
  TIME_SCALE: 60,          // each 2-second tick represents 2 minutes of usage,
                           // so kWh and cost grow visibly during a demo
  CURRENCY: "₹",
  LIVE_POINTS: 30,         // points kept on the live chart
  HISTORY_LIMIT: 200,      // readings requested for the history chart
  DEFAULT_PRICE: 8,        // price per kWh until the user saves one
  DEFAULT_THRESHOLD: 1500  // alert threshold in watts
};