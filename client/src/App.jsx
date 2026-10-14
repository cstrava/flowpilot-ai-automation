import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [apiMessage, setApiMessage] = useState("Checking API...");

  useEffect(() => {
    fetch("http://localhost:5000")
      .then((response) => response.json())
      .then((data) => setApiMessage(data.message))
      .catch(() => setApiMessage("API connection failed"));
  }, []);

  return (
    <div className="app">
      <h1>FlowPilot</h1>

      <p className="subtitle">
        AI-assisted business process automation
      </p>

      <div className="status-card">
        <h2>System Status</h2>
        <p>{apiMessage}</p>
      </div>
    </div>
  );
}

export default App;