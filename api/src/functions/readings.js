const { app } = require("@azure/functions");
const storage = require("../lib/storage");
const { validateReading } = require("../lib/validate");

// POST /api/readings  -> save one reading
// GET  /api/readings?limit=200 -> latest readings, oldest first
app.http("readings", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "readings",
  handler: async (request, context) => {
    try {
      if (request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return { status: 400, jsonBody: { error: "Invalid JSON." } };
        }

        const { reading, error } = validateReading(body);
        if (error) return { status: 400, jsonBody: { error } };

        await storage.saveReading(reading);
        return { status: 201, jsonBody: reading };
      }

      // GET: read ?limit= and keep it between 1 and 1000
      let limit = parseInt(request.query.get("limit"), 10);
      if (Number.isNaN(limit)) limit = 200;
      limit = Math.min(Math.max(limit, 1), 1000);

      const readings = await storage.getLatestReadings(limit);
      return { status: 200, jsonBody: readings };
    } catch (err) {
      context.error("readings failed:", err);
      return { status: 500, jsonBody: { error: "Server error." } };
    }
  }
});