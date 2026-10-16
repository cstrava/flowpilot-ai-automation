import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [requests, setRequests] = useState([]);
  const [reviewRequests, setReviewRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [stats, setStats] = useState({
    totalRequests: 0,
    autoProcessed: 0,
    humanReview: 0,
    completed: 0,
    automationRate: 0,
    estimatedTimeSaved: "-",
  });

  const [currentPage, setCurrentPage] = useState("dashboard");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const loadDashboardData = async () => {
    try {
      const [requestsResponse, statsResponse] = await Promise.all([
        fetch("http://localhost:5000/api/requests"),
        fetch("http://localhost:5000/api/stats"),
      ]);

      if (!requestsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const requestsData = await requestsResponse.json();
      const statsData = await statsResponse.json();

      setRequests(requestsData);
      setStats(statsData);
    } catch (error) {
      console.error("Dashboard error:", error);
    }
  };

  const loadReviewRequests = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/requests/review"
      );

      if (!response.ok) {
        throw new Error("Failed to load review requests");
      }

      const data = await response.json();
      setReviewRequests(data);
    } catch (error) {
      console.error("Review queue error:", error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/audit-logs"
      );

      if (!response.ok) {
        throw new Error("Failed to load audit logs");
      }

      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error("Audit log error:", error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadReviewRequests();
    loadAuditLogs();
  }, []);

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (!description.trim()) {
      setSubmitMessage("Please enter a request description.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage("");

      const response = await fetch(
        "http://localhost:5000/api/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create request");
      }

      const newRequest = await response.json();

      setSubmitMessage(
        `Request #${newRequest.id} created successfully.`
      );

      setDescription("");

      await loadDashboardData();
      await loadReviewRequests();
      await loadAuditLogs();

      setTimeout(() => {
        setCurrentPage("dashboard");
        setSubmitMessage("");
      }, 800);
    } catch (error) {
      console.error("Create request error:", error);
      setSubmitMessage("Could not create request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewDecision = async (requestId, decision) => {
    try {
      setReviewMessage("");

      const response = await fetch(
        `http://localhost:5000/api/requests/${requestId}/${decision}`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update request");
      }

      const result = await response.json();

      setReviewMessage(result.message);

      await loadReviewRequests();
      await loadDashboardData();
      await loadAuditLogs();
    } catch (error) {
      console.error("Review decision error:", error);
      setReviewMessage("Could not update request.");
    }
  };

  const openPage = async (page) => {
    setCurrentPage(page);

    if (page === "dashboard") {
      await loadDashboardData();
    }

    if (page === "validation") {
      await loadReviewRequests();
    }

    if (page === "audit") {
      await loadAuditLogs();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredRequests = requests.filter((request) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      search === "" ||
      String(request.id).toLowerCase().includes(search) ||
      (request.description || "").toLowerCase().includes(search) ||
      (request.type || "").toLowerCase().includes(search) ||
      (request.priority || "").toLowerCase().includes(search) ||
      (request.status || "").toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      request.status === statusFilter;

    const matchesPriority =
      priorityFilter === "All" ||
      request.priority === priorityFilter;

    const matchesType =
      typeFilter === "All" ||
      request.type === typeFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesType
    );
  });

  const requestTypes = [
    ...new Set(
      requests
        .map((request) => request.type)
        .filter(Boolean)
    ),
  ].sort();

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setTypeFilter("All");
  };

  const filtersActive =
    searchTerm !== "" ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    typeFilter !== "All";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h2 className="logo">FlowPilot</h2>
          <p className="logo-subtitle">AI Automation</p>
        </div>

        <nav className="nav">
          <button
            className={`nav-item ${
              currentPage === "dashboard" ? "active" : ""
            }`}
            onClick={() => openPage("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={`nav-item ${
              currentPage === "new-request" ? "active" : ""
            }`}
            onClick={() => openPage("new-request")}
          >
            New Request
          </button>

          <button
            className={`nav-item ${
              currentPage === "validation" ? "active" : ""
            }`}
            onClick={() => openPage("validation")}
          >
            Validation Queue
          </button>

          <button
            className={`nav-item ${
              currentPage === "audit" ? "active" : ""
            }`}
            onClick={() => openPage("audit")}
          >
            Audit Log
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {currentPage === "dashboard" && (
          <>
            <header className="page-header">
              <div>
                <h1>Dashboard</h1>
                <p>
                  Overview of your automated business processes.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => openPage("new-request")}
              >
                + New Request
              </button>
            </header>

            <section className="stats-grid">
              <div className="stat-card">
                <span>Total Requests</span>
                <strong>{stats.totalRequests}</strong>
                <small>All submitted requests</small>
              </div>

              <div className="stat-card">
                <span>Auto Processed</span>
                <strong>{stats.autoProcessed}</strong>
                <small>
                  {stats.automationRate}% automation rate
                </small>
              </div>

              <div className="stat-card">
                <span>Human Review</span>
                <strong>{stats.humanReview}</strong>
                <small>Waiting for validation</small>
              </div>

              <div className="stat-card">
                <span>Completed</span>
                <strong>{stats.completed}</strong>
                <small>Successfully processed</small>
              </div>
            </section>

            <section className="content-grid">
              <div className="table-card">
                <div className="section-heading">
                  <div>
                    <h2>Recent Requests</h2>
                    <p>
                      Search, filter and inspect requests processed
                      by FlowPilot.
                    </p>
                  </div>

                  <span className="results-count">
                    {filteredRequests.length} results
                  </span>
                </div>

                <div className="request-filters">
                  <div className="search-wrapper">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search requests..."
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                    />
                  </div>

                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                  >
                    <option value="All">All statuses</option>
                    <option value="Completed">
                      Completed
                    </option>
                    <option value="Human Review">
                      Human Review
                    </option>
                    <option value="Rejected">
                      Rejected
                    </option>
                  </select>

                  <select
                    className="filter-select"
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(event.target.value)
                    }
                  >
                    <option value="All">
                      All priorities
                    </option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value)
                    }
                  >
                    <option value="All">All types</option>

                    {requestTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {filtersActive && (
                    <button
                      className="clear-filters-button"
                      onClick={clearFilters}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Confidence</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="no-results"
                          >
                            No requests match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((request) => (
                          <tr
                            key={request.id}
                            className="clickable-row"
                            onClick={() =>
                              setSelectedRequest(request)
                            }
                          >
                            <td>#{request.id}</td>

                            <td>{request.type}</td>

                            <td>
                              {request.priority || "-"}
                            </td>

                            <td>
                              {request.confidence}%
                            </td>

                            <td>
                              <span
                                className={`status ${
                                  request.status ===
                                  "Completed"
                                    ? "completed"
                                    : request.status ===
                                      "Rejected"
                                    ? "rejected"
                                    : "review"
                                }`}
                              >
                                {request.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="automation-card">
                <h2>Automation Performance</h2>

                <div className="automation-value">
                  {stats.automationRate}%
                </div>

                <p>
                  of requests are processed automatically
                  without human review.
                </p>

                <div className="progress">
                  <div
                    className="progress-value"
                    style={{
                      width: `${stats.automationRate}%`,
                    }}
                  ></div>
                </div>

                <div className="time-saved">
                  <span>Estimated time saved</span>
                  <strong>
                    {stats.estimatedTimeSaved}
                  </strong>
                </div>
              </div>
            </section>
          </>
        )}

        {currentPage === "new-request" && (
          <>
            <header className="page-header">
              <div>
                <h1>New Request</h1>
                <p>
                  Submit a business request for automated
                  processing.
                </p>
              </div>
            </header>

            <section className="request-form-card">
              <form onSubmit={handleCreateRequest}>
                <label htmlFor="description">
                  Request description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Example: Customer requests a refund for invoice INV-2026-421 because the delivered product was damaged."
                  rows="8"
                />

                <div className="form-help">
                  FlowPilot will analyze the request, classify it
                  and decide whether it can be processed
                  automatically or requires human validation.
                </div>

                {submitMessage && (
                  <div className="submit-message">
                    {submitMessage}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openPage("dashboard")}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : "Analyze Request"}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}

        {currentPage === "validation" && (
          <>
            <header className="page-header">
              <div>
                <h1>Validation Queue</h1>
                <p>
                  Review requests that could not be processed
                  automatically.
                </p>
              </div>
            </header>

            {reviewMessage && (
              <div className="submit-message review-feedback">
                {reviewMessage}
              </div>
            )}

            {reviewRequests.length === 0 ? (
              <div className="empty-state">
                <h2>No requests waiting for review</h2>
                <p>
                  All current requests have been processed.
                </p>
              </div>
            ) : (
              <div className="review-list">
                {reviewRequests.map((request) => (
                  <div
                    className="review-card"
                    key={request.id}
                  >
                    <div className="review-card-header">
                      <div>
                        <span className="request-id">
                          Request #{request.id}
                        </span>

                        <h2>{request.type}</h2>
                      </div>

                      <span className="status review">
                        Human Review
                      </span>
                    </div>

                    {request.description && (
                      <div className="review-section">
                        <span className="review-label">
                          Request
                        </span>

                        <p>{request.description}</p>
                      </div>
                    )}

                    <div className="review-details">
                      <div>
                        <span>Priority</span>

                        <strong>
                          {request.priority || "Medium"}
                        </strong>
                      </div>

                      <div>
                        <span>AI Confidence</span>

                        <strong>
                          {request.confidence}%
                        </strong>
                      </div>
                    </div>

                    <div className="review-section">
                      <span className="review-label">
                        Recommended Action
                      </span>

                      <p>
                        {request.recommendedAction ||
                          "Manual review required"}
                      </p>
                    </div>

                    <div className="review-actions">
                      <button
                        className="reject-button"
                        onClick={() =>
                          handleReviewDecision(
                            request.id,
                            "reject"
                          )
                        }
                      >
                        Reject
                      </button>

                      <button
                        className="approve-button"
                        onClick={() =>
                          handleReviewDecision(
                            request.id,
                            "approve"
                          )
                        }
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {currentPage === "audit" && (
          <>
            <header className="page-header">
              <div>
                <h1>Audit Log</h1>

                <p>
                  Complete history of automated and human
                  decisions.
                </p>
              </div>
            </header>

            <section className="audit-card">
              {auditLogs.length === 0 ? (
                <div className="empty-state">
                  <h2>No audit events yet</h2>

                  <p>
                    Audit events will appear here as requests are
                    processed.
                  </p>
                </div>
              ) : (
                <div className="audit-list">
                  {auditLogs.map((log) => (
                    <div
                      className="audit-item"
                      key={log.id}
                    >
                      <div className="audit-marker"></div>

                      <div className="audit-content">
                        <div className="audit-header">
                          <div>
                            <span className="request-id">
                              Request #{log.requestId}
                            </span>

                            <h3>{log.action}</h3>
                          </div>

                          <span className="audit-time">
                            {formatTimestamp(
                              log.timestamp
                            )}
                          </span>
                        </div>

                        <p>{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {selectedRequest && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="request-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="request-id">
                  Request #{selectedRequest.id}
                </span>

                <h2>Request Details</h2>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                ×
              </button>
            </div>

            <div className="detail-section">
              <span className="detail-label">
                Description
              </span>

              <p>
                {selectedRequest.description ||
                  "No description available"}
              </p>
            </div>

            <div className="details-grid">
              <div className="detail-box">
                <span>Category</span>
                <strong>
                  {selectedRequest.type}
                </strong>
              </div>

              <div className="detail-box">
                <span>Priority</span>
                <strong>
                  {selectedRequest.priority || "-"}
                </strong>
              </div>

              <div className="detail-box">
                <span>AI Confidence</span>
                <strong>
                  {selectedRequest.confidence}%
                </strong>
              </div>

              <div className="detail-box">
                <span>Status</span>
                <strong>
                  {selectedRequest.status}
                </strong>
              </div>
            </div>

            <div className="detail-section">
              <span className="detail-label">
                Recommended Action
              </span>

              <p>
                {selectedRequest.recommendedAction ||
                  "No recommended action"}
              </p>
            </div>

            {selectedRequest.reviewDecision && (
              <div className="detail-section">
                <span className="detail-label">
                  Review Decision
                </span>

                <p>
                  {selectedRequest.reviewDecision}
                </p>
              </div>
            )}

            <div className="detail-section">
              <span className="detail-label">
                Created At
              </span>

              <p>
                {selectedRequest.createdAt
                  ? new Date(
                      selectedRequest.createdAt
                    ).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;