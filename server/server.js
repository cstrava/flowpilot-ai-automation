const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const requests = [
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

app.get("/api/stats", (req, res) => {
  res.json({
    totalRequests: 128,
    autoProcessed: 91,
    humanReview: 23,
    completed: 114,
    automationRate: 71.1,
    estimatedTimeSaved: "7h 35m",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FlowPilot server running on port ${PORT}`);
});