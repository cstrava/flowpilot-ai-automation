const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

let requests = [
  {
    id: 124,
    type: "Refund",
    confidence: 96,
    status: "Completed",
  },
  {
    id: 125,
    type: "Invoice",
    confidence: 88,
    status: "Completed",
  },
  {
    id: 126,
    type: "Complaint",
    confidence: 61,
    status: "Human Review",
  },
  {
    id: 127,
    type: "Order",
    confidence: 94,
    status: "Completed",
  },
];

app.get("/", (req, res) => {
  res.json({
    message: "FlowPilot API is running",
  });
});

app.get("/api/requests", (req, res) => {
  res.json(requests);
});

app.post("/api/requests", (req, res) => {
  const { description } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({
      message: "Description is required",
    });
  }

  const confidence = Math.floor(Math.random() * 41) + 60;

  const lowerDescription = description.toLowerCase();

  let type = "General";

  if (lowerDescription.includes("refund")) {
    type = "Refund";
  } else if (lowerDescription.includes("invoice")) {
    type = "Invoice";
  } else if (lowerDescription.includes("complaint")) {
    type = "Complaint";
  } else if (lowerDescription.includes("order")) {
    type = "Order";
  }

  const status =
    confidence >= 85 ? "Completed" : "Human Review";

  const nextId =
    requests.length > 0
      ? Math.max(...requests.map((request) => request.id)) + 1
      : 1;

  const newRequest = {
    id: nextId,
    description,
    type,
    confidence,
    status,
  };

  requests.unshift(newRequest);

  res.status(201).json(newRequest);
});

app.get("/api/stats", (req, res) => {
  const totalRequests = requests.length;

  const autoProcessed = requests.filter(
    (request) => request.status === "Completed"
  ).length;

  const humanReview = requests.filter(
    (request) => request.status === "Human Review"
  ).length;

  const completed = autoProcessed;

  const automationRate =
    totalRequests > 0
      ? Number(((autoProcessed / totalRequests) * 100).toFixed(1))
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