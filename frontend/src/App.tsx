import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchDashboard, mintInputMaterial, processSwap } from "./api";
import { useTheme } from "./theme";
import type { DashboardSnapshot, ProcessorDDP } from "./types";

type SwapForm = {
  processorId: string;
  inputTokenId: string;
  inputQty: number;
  claimedOutputQty: number;
  processType: string;
  evaporation: number;
  waste: number;
  qualityRejection: number;
};

type ProcessorSort = "score_desc" | "score_asc" | "id_asc";

const emptySnapshot: DashboardSnapshot = {
  standards: [],
  processors: [],
  inputs: [],
  outputs: [],
  alerts: []
};

const scenarioPresets = {
  normal: { name: "Normal", claimedOutputQty: 900, evaporation: 3, waste: 7, qualityRejection: 0 },
  warning: {
    name: "Low Yield Warning",
    claimedOutputQty: 780,
    evaporation: 9,
    waste: 11,
    qualityRejection: 2
  },
  critical: {
    name: "Critical Range",
    claimedOutputQty: 760,
    evaporation: 11,
    waste: 15,
    qualityRejection: 3
  }
};

export default function App() {
  const { mode, toggleTheme } = useTheme();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [minting, setMinting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [processorQuery, setProcessorQuery] = useState("");
  const [processorSort, setProcessorSort] = useState<ProcessorSort>("score_desc");
  const [showSuspendedOnly, setShowSuspendedOnly] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<"ALL" | "WARNING" | "CRITICAL">("ALL");

  const [mintForm, setMintForm] = useState({
    ownerProcessorId: "proc_alpha",
    processType: "grain_cleaning",
    quantity: 1000,
    originFarmHash: "farm_hash_demo",
    qualityGrade: "A",
    moistureContent: 10.5
  });

  const defaultSwap = useMemo<SwapForm>(
    () => ({
      processorId: "proc_alpha",
      inputTokenId: "",
      inputQty: 1000,
      claimedOutputQty: 900,
      processType: "grain_cleaning",
      evaporation: 3,
      waste: 7,
      qualityRejection: 0
    }),
    []
  );
  const [swapForm, setSwapForm] = useState<SwapForm>(defaultSwap);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboard();
      setSnapshot(data);
      if (!swapForm.inputTokenId && data.inputs.length > 0) {
        const first = data.inputs[0];
        setSwapForm((prev) => ({
          ...prev,
          inputTokenId: first.tokenId,
          inputQty: first.quantity,
          processType: first.processType,
          processorId: first.ownerProcessorId
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const applySwapScenario = (scenario: keyof typeof scenarioPresets) => {
    const preset = scenarioPresets[scenario];
    setSwapForm((prev) => ({ ...prev, ...preset }));
    setNotice(`Scenario applied: ${preset.name}`);
  };

  const handleMint = async (ev: FormEvent) => {
    ev.preventDefault();
    setMinting(true);
    setError("");
    setNotice("");
    try {
      await mintInputMaterial(mintForm);
      setNotice("Input material token minted");
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setMinting(false);
    }
  };

  const handleSwap = async (ev: FormEvent) => {
    ev.preventDefault();
    setSwapping(true);
    setError("");
    setNotice("");
    try {
      const output = await processSwap({
        processorId: swapForm.processorId,
        inputTokenId: swapForm.inputTokenId,
        inputQty: Number(swapForm.inputQty),
        claimedOutputQty: Number(swapForm.claimedOutputQty),
        processType: swapForm.processType,
        lossBreakdown: {
          evaporation: Number(swapForm.evaporation),
          waste: Number(swapForm.waste),
          qualityRejection: Number(swapForm.qualityRejection)
        }
      });
      setNotice(
        `${output.message}. Minted ${output.outputQuantity.toFixed(2)} as token ${output.tokenId}`
      );
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwapping(false);
    }
  };

  const outputCount = snapshot.outputs.length;
  const criticalCount = snapshot.alerts.filter((a) => a.severity === "CRITICAL").length;
  const warningCount = snapshot.alerts.filter((a) => a.severity === "WARNING").length;
  const avgCompliance = snapshot.processors.length
    ? snapshot.processors.reduce((sum, p) => sum + p.complianceScore, 0) / snapshot.processors.length
    : 0;

  const processorRows = useMemo(() => {
    const q = processorQuery.trim().toLowerCase();
    const filtered = snapshot.processors.filter((processor) => {
      const textMatch =
        q.length === 0 ||
        processor.processorId.toLowerCase().includes(q) ||
        processor.equipmentSpecs.toLowerCase().includes(q) ||
        processor.processAuthorizations.join(" ").toLowerCase().includes(q);
      const suspendedMatch = !showSuspendedOnly || processor.suspended;
      return textMatch && suspendedMatch;
    });

    const sorter: Record<ProcessorSort, (a: ProcessorDDP, b: ProcessorDDP) => number> = {
      score_desc: (a, b) => b.complianceScore - a.complianceScore,
      score_asc: (a, b) => a.complianceScore - b.complianceScore,
      id_asc: (a, b) => a.processorId.localeCompare(b.processorId)
    };
    return filtered.sort(sorter[processorSort]);
  }, [snapshot.processors, processorQuery, processorSort, showSuspendedOnly]);

  const filteredAlerts = useMemo(
    () =>
      alertSeverity === "ALL"
        ? snapshot.alerts
        : snapshot.alerts.filter((a) => a.severity === alertSeverity),
    [snapshot.alerts, alertSeverity]
  );

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      void loadDashboard();
    }, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Architecture 1</p>
          <h1>Yield Accounting Command Center</h1>
          <p className="subhead">
            Centralized yield standards oracle with atomic token swap enforcement and graduated
            response logic.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost-btn" onClick={toggleTheme}>
            Theme: {mode === "dark" ? "Dark" : "Light"}
          </button>
          <button className="ghost-btn" onClick={() => setAutoRefresh((v) => !v)}>
            Auto Refresh: {autoRefresh ? "On" : "Off"}
          </button>
          <button className="refresh-btn" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </header>

      <section className="stats">
        <article>
          <h3>Yield Standards</h3>
          <p>{snapshot.standards.length}</p>
        </article>
        <article>
          <h3>Active Processors</h3>
          <p>{snapshot.processors.length}</p>
        </article>
        <article>
          <h3>Output Tokens</h3>
          <p>{outputCount}</p>
        </article>
        <article>
          <h3>Critical Alerts</h3>
          <p>{criticalCount}</p>
        </article>
        <article>
          <h3>Warnings</h3>
          <p>{warningCount}</p>
        </article>
        <article>
          <h3>Avg Compliance</h3>
          <p>{(avgCompliance * 100).toFixed(1)}%</p>
        </article>
      </section>

      {error && <p className="banner error">{error}</p>}
      {notice && <p className="banner success">{notice}</p>}

      <main className="grid">
        <section className="panel">
          <h2>Yield Standards Oracle</h2>
          <table>
            <thead>
              <tr>
                <th>Process</th>
                <th>Min %</th>
                <th>Max %</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.standards.map((s) => (
                <tr key={s.processType}>
                  <td>{s.processType}</td>
                  <td>{s.minimumPct}</td>
                  <td>{s.maximumPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Processor Registry</h2>
          <div className="toolbar">
            <input
              placeholder="Search processors..."
              value={processorQuery}
              onChange={(e) => setProcessorQuery(e.target.value)}
            />
            <select
              value={processorSort}
              onChange={(e) => setProcessorSort(e.target.value as ProcessorSort)}
            >
              <option value="score_desc">Score High-Low</option>
              <option value="score_asc">Score Low-High</option>
              <option value="id_asc">ID A-Z</option>
            </select>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={showSuspendedOnly}
                onChange={(e) => setShowSuspendedOnly(e.target.checked)}
              />
              Suspended only
            </label>
          </div>
          <div className="processor-scroll">
            {processorRows.map((p) => (
              <article key={p.processorId} className={`processor-card ${p.suspended ? "suspended" : ""}`}>
                <div>
                  <strong>{p.processorId}</strong>
                  <small>{p.equipmentSpecs}</small>
                </div>
                <div className="chip-row">
                  <span className="chip">Cert {p.certificationLevel}</span>
                  <span className="chip">{(p.complianceScore * 100).toFixed(1)}% compliance</span>
                  {p.suspended && <span className="chip danger">Suspended</span>}
                </div>
              </article>
            ))}
            {processorRows.length === 0 && <p>No processors match current filters.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>Mint Input Material DDP</h2>
          <form className="form" onSubmit={handleMint}>
            <label>
              Processor ID
              <input
                value={mintForm.ownerProcessorId}
                onChange={(e) => setMintForm({ ...mintForm, ownerProcessorId: e.target.value })}
              />
            </label>
            <label>
              Process Type
              <input
                value={mintForm.processType}
                onChange={(e) => setMintForm({ ...mintForm, processType: e.target.value })}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                value={mintForm.quantity}
                onChange={(e) => setMintForm({ ...mintForm, quantity: Number(e.target.value) })}
              />
            </label>
            <label>
              Farm Hash
              <input
                value={mintForm.originFarmHash}
                onChange={(e) => setMintForm({ ...mintForm, originFarmHash: e.target.value })}
              />
            </label>
            <label>
              Quality Grade
              <input
                value={mintForm.qualityGrade}
                onChange={(e) => setMintForm({ ...mintForm, qualityGrade: e.target.value })}
              />
            </label>
            <label>
              Moisture %
              <input
                type="number"
                value={mintForm.moistureContent}
                onChange={(e) =>
                  setMintForm({ ...mintForm, moistureContent: Number(e.target.value) })
                }
              />
            </label>
            <button type="submit" disabled={minting}>
              {minting ? "Minting..." : "Mint Input Token"}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Token Swap Enforcement</h2>
          <div className="scenario-row">
            {Object.entries(scenarioPresets).map(([key, value]) => (
              <button
                key={key}
                className="mini-btn"
                type="button"
                onClick={() => applySwapScenario(key as keyof typeof scenarioPresets)}
              >
                {value.name}
              </button>
            ))}
          </div>
          <form className="form" onSubmit={handleSwap}>
            <label>
              Processor ID
              <input
                value={swapForm.processorId}
                onChange={(e) => setSwapForm({ ...swapForm, processorId: e.target.value })}
              />
            </label>
            <label>
              Input Token
              <select
                value={swapForm.inputTokenId}
                onChange={(e) => {
                  const token = snapshot.inputs.find((x) => x.tokenId === e.target.value);
                  setSwapForm({
                    ...swapForm,
                    inputTokenId: e.target.value,
                    inputQty: token?.quantity ?? swapForm.inputQty,
                    processType: token?.processType ?? swapForm.processType,
                    processorId: token?.ownerProcessorId ?? swapForm.processorId
                  });
                }}
              >
                <option value="">Select token</option>
                {snapshot.inputs.map((input) => (
                  <option key={input.tokenId} value={input.tokenId}>
                    {input.tokenId} ({input.quantity} {input.processType})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Input Qty
              <input
                type="number"
                value={swapForm.inputQty}
                onChange={(e) => setSwapForm({ ...swapForm, inputQty: Number(e.target.value) })}
              />
            </label>
            <label>
              Claimed Output Qty
              <input
                type="number"
                value={swapForm.claimedOutputQty}
                onChange={(e) =>
                  setSwapForm({ ...swapForm, claimedOutputQty: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Process Type
              <input
                value={swapForm.processType}
                onChange={(e) => setSwapForm({ ...swapForm, processType: e.target.value })}
              />
            </label>
            <label>
              Evaporation %
              <input
                type="number"
                value={swapForm.evaporation}
                onChange={(e) => setSwapForm({ ...swapForm, evaporation: Number(e.target.value) })}
              />
            </label>
            <label>
              Waste %
              <input
                type="number"
                value={swapForm.waste}
                onChange={(e) => setSwapForm({ ...swapForm, waste: Number(e.target.value) })}
              />
            </label>
            <label>
              Quality Rejection %
              <input
                type="number"
                value={swapForm.qualityRejection}
                onChange={(e) =>
                  setSwapForm({ ...swapForm, qualityRejection: Number(e.target.value) })
                }
              />
            </label>
            <button type="submit" disabled={swapping || !swapForm.inputTokenId}>
              {swapping ? "Processing..." : "Execute Swap"}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Recent Output Passports</h2>
          <div className="list">
            {snapshot.outputs.slice(0, 10).map((out) => (
              <article key={out.tokenId} className={`item ${out.severity.toLowerCase()}`}>
                <strong>{out.tokenId}</strong>
                <p>{out.message}</p>
                <small>
                  Processor {out.processorId} | Claimed {out.claimedYieldPct.toFixed(2)}% | Actual{" "}
                  {out.actualYieldPct.toFixed(2)}%
                </small>
              </article>
            ))}
            {snapshot.outputs.length === 0 && <p>No output passports yet.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>Alerts</h2>
          <div className="toolbar">
            <select
              value={alertSeverity}
              onChange={(e) => setAlertSeverity(e.target.value as "ALL" | "WARNING" | "CRITICAL")}
            >
              <option value="ALL">All Alerts</option>
              <option value="WARNING">Warnings</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="list">
            {filteredAlerts.slice(0, 12).map((alert) => (
              <article key={alert.alertId} className={`item ${alert.severity.toLowerCase()}`}>
                <strong>{alert.severity}</strong>
                <p>{alert.message}</p>
                <small>
                  {alert.processorId} · {new Date(alert.timestamp).toLocaleString()}
                </small>
              </article>
            ))}
            {filteredAlerts.length === 0 && <p>No alerts in this filter.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

