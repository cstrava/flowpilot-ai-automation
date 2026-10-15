const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { analyzeRequest } = require("./services/aiService");

const app = express();

app.use(cors());
app.use(express.json());

let requests = [
  {
    id: 124,
    type: "Refund",
    priority: "Medium",
    confidence: 96,
    recommendedAction: "Approve refund if invoice is valid",
    status: "Completed",
  },
  {
    id: 125,
    type: "Invoice",
    priority: "Medium",
    confidence: 88,
    recommendedAction: "Validate invoice details",
    status: "Completed",
  },
  {
    id: 126,
    type: "Complaint",
    priority: "High",
    confidence: 61,
    recommendedAction: "Escalate to customer support",
    status: "Human Review",
  },
  {
    id: 127,
    type: "Order",
    priority: "Medium",
    confidence: 94,
    recommendedAction: "Check order status",
    status: "Completed",
  },
];

let auditLogs = [
  {
    id: 1,
    requestId: 124,
    action: "Automatically completed",
    details: "Refund request processed automatically",
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    requestId: 126,
    action: "Routed to human review",
    details: "Complaint requires reviewer validation",
    timestamp: new Date().toISOString(),
  },
];

function addAuditLog(requestId, action, details = "") {
  const nextAuditId =
    auditLogs.length > 0
      ? Math.max(...auditLogs.map((log) => log.id)) + 1
      : 1;

  const newLog = {
    id: nextAuditId,
    requestId,
    action,
    details,
    timestamp: new Date().toISOString(),
  };

  auditLogs.unshift(newLog);
}

app.get("/", (req, res) => {
  res.json({
    message: "FlowPilot API is running",
  });
});

app.get("/api/requests", (req, res) => {
  res.json(requests);
});

app.get("/api/requests/review", (req, res) => {
  const reviewRequests = requests.filter(
    (request) => request.status === "Human Review"
  );

  res.json(reviewRequests);
});

app.get("/api/audit-logs", (req, res) => {
  res.json(auditLogs);
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
    analysis.confidence >= 85 ? "Completed" : "Human Review";

  const nextId =
    requests.length > 0
      ? Math.max(...requests.map((request) => request.id)) + 1
      : 1;

  const newRequest = {
    id: nextId,
    description,
    type: analysis.category,
    priority: analysis.priority,
    confidence: analysis.confidence,
    recommendedAction: analysis.recommendedAction,
    status,
  };

  requests.unshift(newRequest);

  addAuditLog(
    newRequest.id,
    "Request created",
    `Request received and classified as ${newRequest.type}`
  );

  addAuditLog(
    newRequest.id,
    "AI analysis completed",
    `Confidence ${newRequest.confidence}% - Priority ${newRequest.priority}`
  );

  if (newRequest.status === "Human Review") {
    addAuditLog(
      newRequest.id,
      "Routed to human review",
      newRequest.recommendedAction
    );
  } else {
    addAuditLog(
      newRequest.id,
      "Automatically completed",
      newRequest.recommendedAction
    );
  }

  res.status(201).json(newRequest);
});

app.patch("/api/requests/:id/approve", (req, res) => {
  const requestId = Number(req.params.id);

  const request = requests.find(
    (item) => item.id === requestId
  );

  if (!request) {
    return res.status(404).json({
      message: "Request not found",
    });
  }

  if (request.status !== "Human Review") {
    return res.status(400).json({
      message: "Request is not waiting for review",
    });
  }

  request.status = "Completed";
  request.reviewDecision = "Approved";

  addAuditLog(
    request.id,
    "Human review approved",
    "Request approved by reviewer"
  );

  res.json({
    message: "Request approved successfully",
    request,
  });
});

app.patch("/api/requests/:id/reject", (req, res) => {
  const requestId = Number(req.params.id);

  const request = requests.find(
    (item) => item.id === requestId
  );

  if (!request) {
    return res.status(404).json({
      message: "Request not found",
    });
  }

  if (request.status !== "Human Review") {
    return res.status(400).json({
      message: "Request is not waiting for review",
    });
  }

  request.status = "Rejected";
  request.reviewDecision = "Rejected";

  addAuditLog(
    request.id,
    "Human review rejected",
    "Request rejected by reviewer"
  );

  res.json({
    message: "Request rejected successfully",
    request,
  });
});

app.get("/api/stats", (req, res) => {
  const totalRequests = requests.length;

  const autoProcessed = requests.filter(
    (request) =>
      request.status === "Completed" &&
      !request.reviewDecision
  ).length;

  const humanReview = requests.filter(
    (request) => request.status === "Human Review"
  ).length;

  const completed = requests.filter(
    (request) => request.status === "Completed"
  ).length;

  const automationRate =
    totalRequests > 0
      ? Number(
          ((autoProcessed / totalRequests) * 100).toFixed(1)
        )
      : 0;

  const savedMinutes = autoProcessed * 5;

  const savedHours = Math.floor(savedMinutes / 60);
  const remainingMinutes = savedMinutes % 60;

  res.json({
    totalRequests,
    autoProcessed,
    humanReview,
    completed,
    automationRate,
    estimatedTimeSaved: `${savedHours}h ${remainingMinutes}m`,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FlowPilot server running on port ${PORT}`);
});