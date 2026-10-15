const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db/database");
const { analyzeRequest } = require("./services/aiService");

const app = express();

app.use(cors());
app.use(express.json());

function addAuditLog(requestId, action, details = "") {
  const statement = db.prepare(`
    INSERT INTO audit_logs (
      request_id,
      action,
      details
    )
    VALUES (?, ?, ?)
  `);

  statement.run(
    requestId,
    action,
    details
  );
}

function mapRequest(row) {
  return {
    id: row.id,
    description: row.description,
    type: row.type,
    priority: row.priority,
    confidence: row.confidence,
    recommendedAction: row.recommended_action,
    status: row.status,
    reviewDecision: row.review_decision,
    createdAt: row.created_at,
  };
}

function mapAuditLog(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    action: row.action,
    details: row.details,
    timestamp: row.timestamp,
  };
}

app.get("/", (req, res) => {
  res.json({
    message: "FlowPilot API is running",
  });
});

app.get("/api/requests", (req, res) => {
  const rows = db
    .prepare(`
      SELECT *
      FROM requests
      ORDER BY id DESC
    `)
    .all();

  res.json(rows.map(mapRequest));
});

app.get("/api/requests/review", (req, res) => {
  const rows = db
    .prepare(`
      SELECT *
      FROM requests
      WHERE status = ?
      ORDER BY id DESC
    `)
    .all("Human Review");

  res.json(rows.map(mapRequest));
});

app.get("/api/audit-logs", (req, res) => {
  const rows = db
    .prepare(`
      SELECT *
      FROM audit_logs
      ORDER BY id DESC
    `)
    .all();

  res.json(rows.map(mapAuditLog));
});

app.post("/api/requests", (req, res) => {
  const { description } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({
      message: "Description is required",
    });
  }

  const analysis = analyzeRequest(description);

  const status =
    analysis.confidence >= 85
      ? "Completed"
      : "Human Review";

  const insertRequest = db.prepare(`
    INSERT INTO requests (
      description,
      type,
      priority,
      confidence,
      recommended_action,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insertRequest.run(
    description.trim(),
    analysis.category,
    analysis.priority,
    analysis.confidence,
    analysis.recommendedAction,
    status
  );

  const requestId = Number(result.lastInsertRowid);

  addAuditLog(
    requestId,
    "Request created",
    `Request received and classified as ${analysis.category}`
  );

  addAuditLog(
    requestId,
    "AI analysis completed",
    `Confidence ${analysis.confidence}% - Priority ${analysis.priority}`
  );

  if (status === "Human Review") {
    addAuditLog(
      requestId,
      "Routed to human review",
      analysis.recommendedAction
    );
  } else {
    addAuditLog(
      requestId,
      "Automatically completed",
      analysis.recommendedAction
    );
  }

  const newRequest = db
    .prepare(`
      SELECT *
      FROM requests
      WHERE id = ?
    `)
    .get(requestId);

  res.status(201).json(
    mapRequest(newRequest)
  );
});

app.patch(
  "/api/requests/:id/approve",
  (req, res) => {
    const requestId = Number(req.params.id);

    const request = db
      .prepare(`
        SELECT *
        FROM requests
        WHERE id = ?
      `)
      .get(requestId);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "Human Review") {
      return res.status(400).json({
        message:
          "Request is not waiting for review",
      });
    }

    db.prepare(`
      UPDATE requests
      SET
        status = ?,
        review_decision = ?
      WHERE id = ?
    `).run(
      "Completed",
      "Approved",
      requestId
    );

    addAuditLog(
      requestId,
      "Human review approved",
      "Request approved by reviewer"
    );

    const updatedRequest = db
      .prepare(`
        SELECT *
        FROM requests
        WHERE id = ?
      `)
      .get(requestId);

    res.json({
      message:
        "Request approved successfully",
      request: mapRequest(updatedRequest),
    });
  }
);

app.patch(
  "/api/requests/:id/reject",
  (req, res) => {
    const requestId = Number(req.params.id);

    const request = db
      .prepare(`
        SELECT *
        FROM requests
        WHERE id = ?
      `)
      .get(requestId);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "Human Review") {
      return res.status(400).json({
        message:
          "Request is not waiting for review",
      });
    }

    db.prepare(`
      UPDATE requests
      SET
        status = ?,
        review_decision = ?
      WHERE id = ?
    `).run(
      "Rejected",
      "Rejected",
      requestId
    );

    addAuditLog(
      requestId,
      "Human review rejected",
      "Request rejected by reviewer"
    );

    const updatedRequest = db
      .prepare(`
        SELECT *
        FROM requests
        WHERE id = ?
      `)
      .get(requestId);

    res.json({
      message:
        "Request rejected successfully",
      request: mapRequest(updatedRequest),
    });
  }
);

app.get("/api/stats", (req, res) => {
  const totalRequests = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM requests
    `)
    .get().count;

  const autoProcessed = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM requests
      WHERE
        status = 'Completed'
        AND review_decision IS NULL
    `)
    .get().count;

  const humanReview = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM requests
      WHERE status = 'Human Review'
    `)
    .get().count;

  const completed = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM requests
      WHERE status = 'Completed'
    `)
    .get().count;

  const automationRate =
    totalRequests > 0
      ? Number(
          (
            (autoProcessed / totalRequests) *
            100
          ).toFixed(1)
        )
      : 0;

  const savedMinutes =
    autoProcessed * 5;

  const savedHours = Math.floor(
    savedMinutes / 60
  );

  const remainingMinutes =
    savedMinutes % 60;

  res.json({
    totalRequests,
    autoProcessed,
    humanReview,
    completed,
    automationRate,
    estimatedTimeSaved:
      `${savedHours}h ${remainingMinutes}m`,
  });
});

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `FlowPilot server running on port ${PORT}`
  );
});