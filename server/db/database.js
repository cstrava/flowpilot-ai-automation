const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(
  dataDirectory,
  "flowpilot.db"
);

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    recommended_action TEXT,
    status TEXT NOT NULL,
    review_decision TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id)
  );
`);

const requestCount = db
  .prepare("SELECT COUNT(*) AS count FROM requests")
  .get().count;

if (requestCount === 0) {
  const insertRequest = db.prepare(`
    INSERT INTO requests (
      id,
      description,
      type,
      priority,
      confidence,
      recommended_action,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertRequest.run(
    124,
    "Customer requests a refund for a damaged product.",
    "Refund",
    "Medium",
    96,
    "Approve refund if invoice is valid",
    "Completed"
  );

  insertRequest.run(
    125,
    "Customer reports an issue with an invoice.",
    "Invoice",
    "Medium",
    88,
    "Validate invoice details",
    "Completed"
  );

  insertRequest.run(
    126,
    "Customer submitted a complaint requiring validation.",
    "Complaint",
    "High",
    61,
    "Escalate to customer support",
    "Human Review"
  );

  insertRequest.run(
    127,
    "Customer asks for information about an order.",
    "Order",
    "Medium",
    94,
    "Check order status",
    "Completed"
  );
}

const auditCount = db
  .prepare("SELECT COUNT(*) AS count FROM audit_logs")
  .get().count;

if (auditCount === 0) {
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (
      request_id,
      action,
      details
    )
    VALUES (?, ?, ?)
  `);

  insertAudit.run(
    124,
    "Automatically completed",
    "Refund request processed automatically"
  );

  insertAudit.run(
    126,
    "Routed to human review",
    "Complaint requires reviewer validation"
  );
}

module.exports = db;