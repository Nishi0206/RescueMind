import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";
import LiveMap from "./LiveMap";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://127.0.0.1:5000";

function App() {
  // =========================================================
  // STATE
  // =========================================================

  const [requests, setRequests] = useState([]);
  const [teams, setTeams] = useState([]);

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [showForm, setShowForm] = useState(false);

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignRequest, setSelectedAssignRequest] = useState(null);
  const [teamId, setTeamId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Search / filter
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");

  // Loading / errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New incident form
  const [form, setForm] = useState({
    name: "",
    location: "",
    emergency: "Flood",
    people: 1,
    description: "",
  });

  // =========================================================
  // PRIORITY ORDER
  // =========================================================

  const priorityOrder = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  // =========================================================
  // FETCH REQUESTS
  // =========================================================

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/requests`);

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setRequests(data);
      setError("");
    } catch (err) {
      console.error("Unable to load requests:", err);

      setError(
        "Unable to connect to RescueMind command server."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH TEAMS
  // =========================================================

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/teams`);

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setTeams(data);
    } catch (err) {
      console.error(
        "Unable to load rescue teams:",
        err
      );
    }
  };

  // =========================================================
  // INITIAL LOAD + AUTO REFRESH
  // =========================================================

  useEffect(() => {
    fetchRequests();
    fetchTeams();

    const interval = setInterval(() => {
      fetchRequests();
      fetchTeams();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // AI ANALYSIS
  // =========================================================

  const analyzeRequest = async (request) => {
    try {
      setSelectedRequest(request);
      setAiAnalysis(null);

      const response = await axios.get(
        `${API_URL}/api/requests/${request.id}/ai-analysis`
      );

      setAiAnalysis(response.data);
    } catch (err) {
      console.error("AI analysis failed:", err);

      setAiAnalysis(null);

      alert(
        "Unable to analyze this emergency request."
      );
    }
  };

  // =========================================================
  // SORT REQUESTS
  // =========================================================

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const priorityA =
        priorityOrder[a.severity] || 0;

      const priorityB =
        priorityOrder[b.severity] || 0;

      return priorityB - priorityA;
    });
  }, [requests]);

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const filteredRequests = useMemo(() => {
    const searchText = search
      .trim()
      .toLowerCase();

    return sortedRequests.filter((request) => {
      const name = String(
        request.name || ""
      ).toLowerCase();

      const location = String(
        request.location || ""
      ).toLowerCase();

      const id = String(
        request.id || ""
      ).toLowerCase();

      const emergency = String(
        request.emergency || ""
      ).toLowerCase();

      const severity = String(
        request.severity || ""
      );

      const matchesSearch =
        name.includes(searchText) ||
        location.includes(searchText) ||
        id.includes(searchText) ||
        emergency.includes(searchText);

      const matchesSeverity =
        severityFilter === "All" ||
        severity === severityFilter;

      return (
        matchesSearch &&
        matchesSeverity
      );
    });
  }, [
    sortedRequests,
    search,
    severityFilter,
  ]);

  // =========================================================
  // DASHBOARD STATISTICS
  // =========================================================

  const stats = useMemo(() => {
    const critical = requests.filter(
      (request) =>
        request.severity === "Critical"
    ).length;

    const high = requests.filter(
      (request) =>
        request.severity === "High"
    ).length;

    const pending = requests.filter(
      (request) =>
        request.status === "Pending"
    ).length;

    const assigned = requests.filter(
      (request) =>
        request.status === "Rescue Assigned"
    ).length;

    const people = requests.reduce(
      (total, request) =>
        total +
        Number(request.people || 0),
      0
    );

    return {
      critical,
      high,
      pending,
      assigned,
      people,
    };
  }, [requests]);

  // =========================================================
  // CHART DATA
  // =========================================================

  const chartData = [
    {
      name: "Critical",
      value: stats.critical,
    },
    {
      name: "High",
      value: stats.high,
    },
    {
      name: "Pending",
      value: stats.pending,
    },
    {
      name: "Assigned",
      value: stats.assigned,
    },
  ];

  // =========================================================
  // FORM HANDLING
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // =========================================================
  // SUBMIT NEW EMERGENCY
  // =========================================================

  const submitRequest = async (event) => {
    event.preventDefault();

    try {
      await axios.post(
        `${API_URL}/api/requests`,
        {
          name: form.name.trim(),
          location: form.location.trim(),
          emergency: form.emergency,
          people: Number(form.people),
          description:
            form.description.trim(),
        }
      );

      await fetchRequests();

      setForm({
        name: "",
        location: "",
        emergency: "Flood",
        people: 1,
        description: "",
      });

      setShowForm(false);

      alert(
        "Emergency request submitted successfully."
      );
    } catch (err) {
      console.error(
        "Unable to submit emergency:",
        err
      );

      alert(
        err.response?.data?.error ||
          "Unable to submit emergency request."
      );
    }
  };

  // =========================================================
  // OPEN ASSIGN MODAL
  // =========================================================

  const openAssignModal = (request) => {
    setSelectedAssignRequest(request);
    setTeamId("");
    setShowAssignModal(true);
  };

  // =========================================================
  // CLOSE ASSIGN MODAL
  // =========================================================

  const closeAssignModal = () => {
    if (assigning) return;

    setShowAssignModal(false);
    setSelectedAssignRequest(null);
    setTeamId("");
  };

  // =========================================================
  // ASSIGN RESCUE TEAM
  // =========================================================

  const assignRescue = async () => {
    if (!selectedAssignRequest) {
      alert(
        "No emergency request selected."
      );
      return;
    }

    if (!teamId) {
      alert(
        "Please select a rescue team."
      );
      return;
    }

    try {
      setAssigning(true);

      await axios.put(
        `${API_URL}/api/requests/${selectedAssignRequest.id}/assign`,
        {
          team_id: teamId,
        }
      );

      await fetchRequests();
      await fetchTeams();

      setShowAssignModal(false);
      setSelectedAssignRequest(null);
      setTeamId("");

      alert(
        "Rescue team deployed successfully."
      );
    } catch (err) {
      console.error(
        "Unable to assign rescue team:",
        err
      );

      alert(
        err.response?.data?.error ||
          "Unable to assign rescue team."
      );
    } finally {
      setAssigning(false);
    }
  };

  // =========================================================
  // RESET FILTERS
  // =========================================================

  const resetFilters = () => {
    setSearch("");
    setSeverityFilter("All");
  };

  // =========================================================
  // AVAILABLE TEAMS
  // =========================================================

  const availableTeams = useMemo(() => {
    return teams.filter(
      (team) =>
        String(team.status || "")
          .toLowerCase() === "available"
    );
  }, [teams]);

  // =========================================================
  // SELECTED TEAM
  // =========================================================

  const selectedTeam = useMemo(() => {
    return teams.find(
      (team) =>
        String(team.id) ===
        String(teamId)
    );
  }, [teams, teamId]);

  // =========================================================
  // TEAM ICON
  // =========================================================

  const getTeamIcon = (vehicle) => {
    if (vehicle === "Rescue Boat") {
      return "🛟";
    }

    if (vehicle === "Ambulance") {
      return "🚑";
    }

    return "🚒";
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-logo">
            RM
          </div>

          <div>
            <h2>RescueMind</h2>

            <span>
              Emergency Intelligence
            </span>
          </div>

        </div>

        <div className="nav-section">

          <p>COMMAND CENTER</p>

          <button
            type="button"
            className="nav-item active"
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            type="button"
            className="nav-item"
          >
            <span>🚨</span>
            Incidents
            <b>{requests.length}</b>
          </button>

          <button
            type="button"
            className="nav-item"
          >
            <span>⌖</span>
            Live Map
          </button>

        </div>

        <div className="nav-section">

          <p>OPERATIONS</p>

          <button
            type="button"
            className="nav-item"
          >
            <span>🚑</span>
            Rescue Teams
          </button>

          <button
            type="button"
            className="nav-item"
          >
            <span>📦</span>
            Resources
          </button>

          <button
            type="button"
            className="nav-item"
          >
            <span>🏥</span>
            Shelters
          </button>

        </div>

        <div className="nav-section">

          <p>INSIGHTS</p>

          <button
            type="button"
            className="nav-item"
          >
            <span>▥</span>
            Analytics
          </button>

        </div>

        <div className="sidebar-footer">

          <div className="online-dot"></div>

          <div>
            <strong>
              System Operational
            </strong>

            <small>
              All services online
            </small>
          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="main">

        {/* ===================================================
            TOP BAR
        =================================================== */}

        <header className="topbar">

          <div>

            <div className="breadcrumb">
              CONTROL CENTER / OVERVIEW
            </div>

            <h1>
              Emergency Operations Center
            </h1>

            <p>
              Real-time disaster monitoring and
              response coordination
            </p>

          </div>

          <div className="topbar-right">

            <div className="live-indicator">
              <span></span>
              LIVE
            </div>

            <button
              type="button"
              className="icon-button"
            >
              🔔
            </button>

            <div className="operator">

              <div className="operator-avatar">
                DR
              </div>

              <div>

                <strong>
                  Response Officer
                </strong>

                <small>
                  Command Center
                </small>

              </div>

            </div>

          </div>

        </header>

        {/* ===================================================
            CONNECTION ERROR
        =================================================== */}

        {error && (
          <div className="connection-warning">
            ⚠ {error}
          </div>
        )}

        {/* ===================================================
            CRITICAL BANNER
        =================================================== */}

        {stats.critical > 0 && (

          <div className="emergency-banner">

            <div className="alert-symbol">
              !
            </div>

            <div>

              <strong>
                CRITICAL INCIDENTS REQUIRE ATTENTION
              </strong>

              <p>
                {stats.critical} critical emergency{" "}
                {stats.critical === 1
                  ? "request is"
                  : "requests are"}{" "}
                currently awaiting response.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSeverityFilter("Critical")
              }
            >
              Review Critical
            </button>

          </div>

        )}

        {/* ===================================================
            KPI CARDS
        =================================================== */}

        <section className="kpi-grid">

          <div className="kpi-card critical-kpi">

            <div className="kpi-top">

              <span>
                CRITICAL INCIDENTS
              </span>

              <div className="kpi-icon red">
                !
              </div>

            </div>

            <h2>
              {stats.critical}
            </h2>

            <div className="kpi-bottom">

              <span className="danger-text">
                ● Immediate response
              </span>

            </div>

          </div>

          <div className="kpi-card">

            <div className="kpi-top">

              <span>
                PENDING REQUESTS
              </span>

              <div className="kpi-icon orange">
                ◷
              </div>

            </div>

            <h2>
              {stats.pending}
            </h2>

            <div className="kpi-bottom">

              <span>
                {stats.high} high priority
              </span>

            </div>

          </div>

          <div className="kpi-card">

            <div className="kpi-top">

              <span>
                RESCUE OPERATIONS
              </span>

              <div className="kpi-icon blue">
                +
              </div>

            </div>

            <h2>
              {stats.assigned}
            </h2>

            <div className="kpi-bottom">

              <span className="success-text">
                ● Teams deployed
              </span>

            </div>

          </div>

          <div className="kpi-card">

            <div className="kpi-top">

              <span>
                PEOPLE AFFECTED
              </span>

              <div className="kpi-icon purple">
                ♙
              </div>

            </div>

            <h2>
              {stats.people}
            </h2>

            <div className="kpi-bottom">

              <span>
                Across active incidents
              </span>

            </div>

          </div>

        </section>

        {/* ===================================================
            DASHBOARD GRID
        =================================================== */}

        <section className="dashboard-grid">

          {/* =================================================
              LIVE MAP
          ================================================= */}

          <div className="panel map-panel">
            <LiveMap requests={requests} />
          </div>

          {/* =================================================
              INCIDENT ANALYTICS
          ================================================= */}

          <div className="panel">

            <h2>
              Incident Analytics
            </h2>

            <ResponsiveContainer
              width="100%"
              height={250}
            >

              <BarChart data={chartData}>

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Bar dataKey="value" />

              </BarChart>

            </ResponsiveContainer>

          </div>

          {/* =================================================
              AI PRIORITY ANALYSIS
          ================================================= */}

          <div className="panel ai-panel">

            <div className="ai-header">

              <div>

                <h2>
                  🤖 RescueMind AI Analysis
                </h2>

                <p>
                  Explainable emergency prioritization
                </p>

              </div>

              {aiAnalysis && (
                <span className="ai-badge">
                  AI ANALYZED
                </span>
              )}

            </div>

            {!aiAnalysis ? (

              <div className="ai-empty">

                <div className="ai-empty-icon">
                  🤖
                </div>

                <h3>
                  Select an emergency request
                </h3>

                <p>
                  Click "AI Analyze" on an
                  emergency to view its priority
                  assessment.
                </p>

              </div>

            ) : (

              <div className="ai-result">

                <div className="ai-request">

                  <div>

                    <span className="ai-label">
                      REQUEST
                    </span>

                    <strong>
                      {aiAnalysis.request_id}
                    </strong>

                  </div>

                  <div>

                    <span className="ai-label">
                      LOCATION
                    </span>

                    <strong>
                      📍 {aiAnalysis.location}
                    </strong>

                  </div>

                </div>

                <div className="ai-score">

                  <span className="ai-label">
                    AI PRIORITY SCORE
                  </span>

                  <div className="score-number">
                    {aiAnalysis?.analysis?.score ??
                      "N/A"}
                  </div>

                  <div
                    className={`ai-priority ${
                      String(
                        aiAnalysis?.analysis?.priority ||
                          "Unknown"
                      ).toLowerCase()
                    }`}
                  >
                    {aiAnalysis?.analysis?.priority ||
                      "Unknown"}
                  </div>

                </div>

                <div className="ai-reasons">

                  <h3>
                    Why this priority?
                  </h3>

                  {Array.isArray(
                    aiAnalysis?.analysis?.reasons
                  ) &&
                  aiAnalysis.analysis.reasons.length >
                    0 ? (

                    aiAnalysis.analysis.reasons.map(
                      (reason, index) => (

                        <div
                          className="ai-reason"
                          key={index}
                        >

                          <span>✓</span>

                          {reason}

                        </div>

                      )
                    )

                  ) : (

                    <p>
                      No detailed reasons available.
                    </p>

                  )}

                </div>

                <div className="ai-recommendation">

                  <span>🚨</span>

                  <div>

                    <small>
                      RECOMMENDED ACTION
                    </small>

                    <strong>
                      {aiAnalysis?.analysis
                        ?.recommendation ||
                        "No recommendation available."}
                    </strong>

                  </div>

                </div>

              </div>

            )}

          </div>

          {/* =================================================
              INCIDENT TABLE
          ================================================= */}

          <div className="panel incidents-panel">

            <div className="panel-header">

              <div>

                <h2>
                  Active Incidents
                </h2>

                <p>
                  AI-prioritized emergency requests
                </p>

              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setShowForm(true)
                }
              >
                + New Incident
              </button>

            </div>

            {/* SEARCH + FILTER */}

            <div className="toolbar">

              <div className="search-box">

                🔎

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search incidents, locations..."
                />

              </div>

              <div className="filter-buttons">

                {[
                  "All",
                  "Critical",
                  "High",
                  "Medium",
                  "Low",
                ].map((filter) => (

                  <button
                    type="button"
                    key={filter}
                    className={
                      severityFilter === filter
                        ? "filter active"
                        : "filter"
                    }
                    onClick={() =>
                      setSeverityFilter(filter)
                    }
                  >
                    {filter}
                  </button>

                ))}

              </div>

            </div>

            {/* INCIDENT TABLE */}

            <div className="incident-table">

              <table>

                <thead>

                  <tr>

                    <th>PRIORITY</th>
                    <th>INCIDENT</th>
                    <th>LOCATION</th>
                    <th>PEOPLE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>

                  </tr>

                </thead>

                <tbody>

                  {loading ? (

                    <tr>

                      <td
                        colSpan="6"
                        className="empty-state"
                      >
                        Loading incidents...
                      </td>

                    </tr>

                  ) : filteredRequests.length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        className="empty-state"
                      >

                        No incidents found.

                        <br />

                        <button
                          type="button"
                          onClick={resetFilters}
                        >
                          Clear filters
                        </button>

                      </td>

                    </tr>

                  ) : (

                    filteredRequests.map(
                      (request) => {

                        const severity =
                          request.severity || "Low";

                        const status =
                          request.status || "Pending";

                        const emergency =
                          request.emergency ||
                          "Emergency";

                        const location =
                          request.location ||
                          "Unknown";

                        const people =
                          request.people || 0;

                        return (

                          <tr key={request.id}>

                            {/* PRIORITY */}

                            <td>

                              <span
                                className={`priority-badge ${severity.toLowerCase()}`}
                              >

                                <i></i>

                                {severity}

                              </span>

                            </td>

                            {/* INCIDENT */}

                            <td>

                              <div className="incident-info">

                                <strong>
                                  {request.id}
                                </strong>

                                <span>
                                  {emergency}
                                </span>

                              </div>

                            </td>

                            {/* LOCATION */}

                            <td>

                              <div className="location">

                                <span>
                                  ⌖
                                </span>

                                {location}

                              </div>

                            </td>

                            {/* PEOPLE */}

                            <td>

                              <strong>
                                {people}
                              </strong>

                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={
                                  status === "Pending"
                                    ? "status pending"
                                    : "status assigned"
                                }
                              >

                                {status === "Pending"
                                  ? "Awaiting response"
                                  : "Team assigned"}

                              </span>

                            </td>

                            {/* ACTION */}

                            <td>

                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >

                                {/* AI ANALYZE */}

                                <button
                                  type="button"
                                  className="ai-analyze-btn"
                                  onClick={() =>
                                    analyzeRequest(
                                      request
                                    )
                                  }
                                >
                                  🤖 AI Analyze
                                </button>

                                {/* ASSIGN */}

                                {status ===
                                "Pending" ? (

                                  <button
                                    type="button"
                                    className="assign-button"
                                    onClick={() =>
                                      openAssignModal(
                                        request
                                      )
                                    }
                                  >
                                    Assign
                                  </button>

                                ) : (

                                  <span className="completed">
                                    ✓ Active
                                  </span>

                                )}

                              </div>

                            </td>

                          </tr>

                        );

                      }
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <div className="right-column">

            {/* =================================================
                AI STATUS
            ================================================= */}

            <div className="panel ai-card">

              <div className="ai-header">

                <div className="ai-title">

                  <div className="ai-logo">
                    ✦
                  </div>

                  <div>

                    <h2>
                      RescueMind AI
                    </h2>

                    <span>
                      Priority Intelligence
                    </span>

                  </div>

                </div>

                <div className="ai-status">
                  ACTIVE
                </div>

              </div>

              <div className="ai-content">

                <div className="ai-score">

                  <div className="score-circle">

                    <strong>
                      {stats.critical > 0
                        ? "HIGH"
                        : "NORMAL"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Current threat level
                    </span>

                    <strong>
                      {stats.critical > 0
                        ? "Immediate attention"
                        : "Monitoring"}
                    </strong>

                  </div>

                </div>

                <div className="ai-divider"></div>

                <p>
                  AI continuously evaluates
                  incident severity, affected
                  population, emergency type and
                  response status to prioritize
                  rescue operations.
                </p>

              </div>

            </div>

            {/* =================================================
                RESPONSE READINESS
            ================================================= */}

            <div className="panel readiness-card">

              <div className="panel-title-row">

                <div>

                  <h2>
                    Response Readiness
                  </h2>

                  <p>
                    Current operational capacity
                  </p>

                </div>

                <span className="ready-badge">
                  READY
                </span>

              </div>

              <div className="readiness-item">

                <div>

                  <span>
                    Rescue Teams
                  </span>

                  <strong>
                    {
                      teams.filter(
                        (team) =>
                          String(
                            team.status || ""
                          ).toLowerCase() ===
                          "available"
                      ).length
                    }{" "}
                    / {teams.length}
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width:
                        teams.length > 0
                          ? `${
                              (availableTeams.length /
                                teams.length) *
                              100
                            }%`
                          : "0%",
                    }}
                  ></span>

                </div>

              </div>

              <div className="readiness-item">

                <div>

                  <span>
                    Ambulances
                  </span>

                  <strong>
                    5 / 8
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "62%",
                    }}
                  ></span>

                </div>

              </div>

              <div className="readiness-item">

                <div>

                  <span>
                    Emergency Boats
                  </span>

                  <strong>
                    3 / 5
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "60%",
                    }}
                  ></span>

                </div>

              </div>

            </div>

            {/* =================================================
                RESCUE TEAMS
            ================================================= */}

            <div className="panel teams-card">

              <div className="panel-title-row">

                <div>

                  <h2>
                    Rescue Teams
                  </h2>

                  <p>
                    Live deployment status
                  </p>

                </div>

                <span className="team-count">
                  {teams.length} TEAMS
                </span>

              </div>

              <div className="teams-list">

                {teams.length === 0 ? (

                  <div className="empty-state">
                    No rescue teams available.
                  </div>

                ) : (

                  teams.map((team) => {

                    const vehicle =
                      team.vehicle ||
                      "Rescue Vehicle";

                    return (

                      <div
                        className="team-item"
                        key={team.id}
                      >

                        <div className="team-icon">
                          {getTeamIcon(vehicle)}
                        </div>

                        <div className="team-info">

                          <strong>
                            {team.name ||
                              "Unnamed Team"}
                          </strong>

                          <span>
                            {team.type ||
                              "Rescue Team"}
                          </span>

                          <small>
                            👥{" "}
                            {team.members || 0}{" "}
                            members
                            {" • "}
                            📍{" "}
                            {team.location ||
                              "Unknown"}
                          </small>

                        </div>

                        <span
                          className={
                            String(
                              team.status || ""
                            ).toLowerCase() ===
                            "available"
                              ? "team-status available"
                              : "team-status mission"
                          }
                        >
                          {team.status ||
                            "Unknown"}
                        </span>

                      </div>

                    );

                  })

                )}

              </div>

            </div>

            {/* =================================================
                SYSTEM STATUS
            ================================================= */}

            <div className="panel system-card">

              <div className="panel-title-row">

                <div>

                  <h2>
                    System Status
                  </h2>

                  <p>
                    RescueMind services
                  </p>

                </div>

                <span className="online-label">
                  ● ONLINE
                </span>

              </div>

              <div className="service">

                <span>
                  API Server
                </span>

                <strong>
                  Operational
                </strong>

              </div>

              <div className="service">

                <span>
                  AI Engine
                </span>

                <strong>
                  Operational
                </strong>

              </div>

              <div className="service">

                <span>
                  Database
                </span>

                <strong>
                  Operational
                </strong>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer>

          <span>
            RescueMind Emergency Intelligence
            Platform
          </span>

          <span>
            ● Live monitoring enabled
          </span>

        </footer>

      </main>

      {/* =====================================================
          NEW INCIDENT MODAL
      ===================================================== */}

      {showForm && (

        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowForm(false);
            }
          }}
        >

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  EMERGENCY INTAKE
                </span>

                <h2>
                  Report New Incident
                </h2>

                <p>
                  Submit information for AI
                  prioritization.
                </p>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                ×
              </button>

            </div>

            <form onSubmit={submitRequest}>

              <label>
                Person Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter person's name"
                required
              />

              <label>
                Location
              </label>

              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City / area / landmark"
                required
              />

              <label>
                Emergency Type
              </label>

              <select
                name="emergency"
                value={form.emergency}
                onChange={handleChange}
              >

                <option value="Flood">
                  Flood
                </option>

                <option value="Fire">
                  Fire
                </option>

                <option value="Earthquake">
                  Earthquake
                </option>

                <option value="Cyclone">
                  Cyclone
                </option>

                <option value="Medical">
                  Medical
                </option>

                <option value="Accident">
                  Accident
                </option>

              </select>

              <label>
                People Affected
              </label>

              <input
                type="number"
                name="people"
                min="1"
                value={form.people}
                onChange={handleChange}
                required
              />

              <label>
                Emergency Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the situation, injuries, trapped people, water level, fire, etc."
                rows="4"
              ></textarea>

              <button
                className="submit-button"
                type="submit"
              >
                🚨 Submit Emergency
              </button>

            </form>

          </div>

        </div>

      )}

      {/* =====================================================
          ASSIGN RESCUE TEAM MODAL
      ===================================================== */}

      {showAssignModal &&
        selectedAssignRequest && (

          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !assigning
              ) {
                closeAssignModal();
              }
            }}
          >

            <div className="modal assign-modal">

              {/* MODAL HEADER */}

              <div className="modal-header">

                <div>

                  <span className="modal-label">
                    RESCUE DEPLOYMENT
                  </span>

                  <h2>
                    Assign Rescue Team
                  </h2>

                  <p>
                    Select an available team for
                    this emergency.
                  </p>

                </div>

                <button
                  type="button"
                  className="close-button"
                  onClick={closeAssignModal}
                  disabled={assigning}
                >
                  ×
                </button>

              </div>

              {/* INCIDENT INFORMATION */}

              <div className="assignment-request">

                <div>

                  <span>
                    INCIDENT
                  </span>

                  <strong>
                    {selectedAssignRequest.id}
                  </strong>

                </div>

                <div>

                  <span>
                    EMERGENCY
                  </span>

                  <strong>
                    {selectedAssignRequest.emergency ||
                      "Emergency"}
                  </strong>

                </div>

                <div>

                  <span>
                    LOCATION
                  </span>

                  <strong>
                    📍{" "}
                    {selectedAssignRequest.location ||
                      "Unknown"}
                  </strong>

                </div>

                <div>

                  <span>
                    PEOPLE
                  </span>

                  <strong>
                    {selectedAssignRequest.people ||
                      0}
                  </strong>

                </div>

              </div>

              {/* =================================================
                  TEAM SELECTION
              ================================================= */}

              <div className="team-selection-section">

                <label htmlFor="team-select">
                  Select Rescue Team
                </label>

                <select
                  id="team-select"
                  value={teamId}
                  onChange={(event) =>
                    setTeamId(event.target.value)
                  }
                  disabled={
                    assigning ||
                    availableTeams.length === 0
                  }
                >

                  <option value="">
                    -- Select an available team --
                  </option>

                  {availableTeams.map((team) => (

                    <option
                      key={team.id}
                      value={team.id}
                    >

                      {team.name ||
                        "Unnamed Team"}

                      {" - "}

                      {team.type ||
                        "Rescue Team"}

                      {" - "}

                      {team.vehicle ||
                        "Rescue Vehicle"}

                    </option>

                  ))}

                </select>

              </div>

              {/* NO AVAILABLE TEAMS */}

              {availableTeams.length === 0 && (

                <div className="no-teams-warning">

                  ⚠ No rescue teams are currently
                  available.

                  <small>
                    Please wait for a team to become
                    available before deploying.
                  </small>

                </div>

              )}

              {/* SELECTED TEAM PREVIEW */}

              {selectedTeam && (

                <div className="selected-team-preview">

                  <div className="selected-team-icon">

                    {getTeamIcon(
                      selectedTeam.vehicle
                    )}

                  </div>

                  <div>

                    <strong>
                      {selectedTeam.name ||
                        "Unnamed Team"}
                    </strong>

                    <span>
                      {selectedTeam.type ||
                        "Rescue Team"}
                    </span>

                    <small>
                      👥{" "}
                      {selectedTeam.members || 0}
                      {" "}members
                      {" • "}
                      📍{" "}
                      {selectedTeam.location ||
                        "Unknown"}
                    </small>

                    <small className="selected-team-status">
                      ● Available for deployment
                    </small>

                  </div>

                </div>

              )}

              {/* =================================================
                  ACTION BUTTONS
              ================================================= */}

              <div className="assignment-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeAssignModal}
                  disabled={assigning}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="submit-button"
                  onClick={assignRescue}
                  disabled={
                    !teamId ||
                    assigning
                  }
                >

                  {assigning
                    ? "🚨 Deploying..."
                    : "🚑 Deploy Rescue Team"}

                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}

export default App;