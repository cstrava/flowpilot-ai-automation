import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [requests, setRequests] = useState([]);

  const [stats, setStats] = useState({
    totalRequests: 0,
    autoProcessed: 0,
    humanReview: 0,
    completed: 0,
    automationRate: 0,
    estimatedTimeSaved: "-",
  });

  useEffect(() => {
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

    loadDashboardData();
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h2 className="logo">FlowPilot</h2>
          <p className="logo-subtitle">AI Automation</p>
        </div>

        <nav className="nav">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">New Request</button>
          <button className="nav-item">Validation Queue</button>
          <button className="nav-item">Audit Log</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Overview of your automated business processes.</p>
          </div>

          <button className="primary-button">+ New Request</button>
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
            <small>{stats.automationRate}% automation rate</small>
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
                <p>Latest requests processed by FlowPilot.</p>
              </div>

              <button className="secondary-button">View all</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Confidence</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>{request.type}</td>
                    <td>{request.confidence}%</td>
                    <td>
                      <span
                        className={`status ${
                          request.status === "Completed"
                            ? "completed"
                            : "review"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="automation-card">
            <h2>Automation Performance</h2>

            <div className="automation-value">
              {stats.automationRate}%
            </div>

            <p>
              of requests are processed automatically without human review.
            </p>

            <div className="progress">
              <div
                className="progress-value"
                style={{ width: `${stats.automationRate}%` }}
              ></div>
            </div>

            <div className="time-saved">
              <span>Estimated time saved</span>
              <strong>{stats.estimatedTimeSaved}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;