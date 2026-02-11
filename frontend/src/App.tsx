import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchDashboard, mintInputMaterial, processSwap } from "./api";
import type { DashboardSnapshot } from "./types";

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

const emptySnapshot: DashboardSnapshot = {
  standards: [],
  processors: [],
  inputs: [],
  outputs: [],
  alerts: []
};

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [minting, setMinting] = useState(false);
  const [swapping, setSwapping] = useState(false);

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

  useEffect(() => {
    void loadDashboard();
  }, []);

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
        <button className="refresh-btn" onClick={loadDashboard} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
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
            {snapshot.outputs.slice(0, 8).map((out) => (
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
          <div className="list">
            {snapshot.alerts.slice(0, 8).map((alert) => (
              <article key={alert.alertId} className={`item ${alert.severity.toLowerCase()}`}>
                <strong>{alert.severity}</strong>
                <p>{alert.message}</p>
                <small>
                  {alert.processorId} · {new Date(alert.timestamp).toLocaleString()}
                </small>
              </article>
            ))}
            {snapshot.alerts.length === 0 && <p>No alerts.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
