const { app } = require("@azure/functions");
const storage = require("../lib/storage");

// GET /api/summary?days=7 -> daily totals, newest day first
app.http("summary", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "summary",
  handler: async (request, context) => {
    try {
      let days = parseInt(request.query.get("days"), 10);
      if (Number.isNaN(days)) days = 7;
      days = Math.min(Math.max(days, 1), 31);

      const rows = await storage.getDailySummaries(days);
      return { status: 200, jsonBody: rows };
    } catch (err) {
      context.error("summary failed:", err);
      return { status: 500, jsonBody: { error: "Server error." } };
    }
  }
});