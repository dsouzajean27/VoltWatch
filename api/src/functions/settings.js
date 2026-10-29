const { app } = require("@azure/functions");
const storage = require("../lib/storage");
const { validateSettings } = require("../lib/validate");

// GET /api/settings -> { pricePerKwh, thresholdW }
// PUT /api/settings -> save new values
app.http("settings", {
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  route: "settings",
  handler: async (request, context) => {
    try {
      if (request.method === "PUT") {
        let body;
        try {
          body = await request.json();
        } catch {
          return { status: 400, jsonBody: { error: "Invalid JSON." } };
        }

        const { settings, error } = validateSettings(body);
        if (error) return { status: 400, jsonBody: { error } };

        await storage.saveSettings(settings);
        return { status: 200, jsonBody: settings };
      }

      const settings = await storage.getSettings();
      return { status: 200, jsonBody: settings };
    } catch (err) {
      context.error("settings failed:", err);
      return { status: 500, jsonBody: { error: "Server error." } };
    }
  }
});