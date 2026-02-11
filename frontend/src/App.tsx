import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchDashboard, mintInputMaterial, processSwap } from "./api";
import { useTheme } from "./theme";
import type { DashboardSnapshot, ProcessorDDP } from "./types";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Switch } from "./components/ui/switch";

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

type ProcessMeta = {
  label: string;
  inputMaterial: string;
  typicalLoss: string;
  actionBelow: string;
  actionAbove: string;
};

const PROCESS_CATALOG: Record<string, ProcessMeta> = {
  grain_cleaning_drying: {
    label: "Grain Cleaning & Drying",
    inputMaterial: "Paddy/Wheat",
    typicalLoss: "3% - 6%",
    actionBelow: "Flag low efficiency",
    actionAbove: "Trigger audit (fraud risk)"
  },
  fruit_sorting_packaging: {
    label: "Fruit Sorting & Packaging",
    inputMaterial: "Apples/Oranges",
    typicalLoss: "5% - 8%",
    actionBelow: "Flag machine fault",
    actionAbove: "Trigger audit"
  },
  metal_ore_refining: {
    label: "Metal Ore Refining",
    inputMaterial: "Iron/Copper",
    typicalLoss: "4% - 7%",
    actionBelow: "Maintenance alert",
    actionAbove: "Pause transaction"
  },
  coffee_bean_processing: {
    label: "Coffee Bean Processing",
    inputMaterial: "Raw beans",
    typicalLoss: "6% - 9%",
    actionBelow: "Quality loss warning",
    actionAbove: "Trigger audit"
  },
  cotton_ginning: {
    label: "Cotton Ginning",
    inputMaterial: "Raw cotton",
    typicalLoss: "7% - 10%",
    actionBelow: "Yield drop alert",
    actionAbove: "Freeze output"
  },
  sugarcane_processing: {
    label: "Sugarcane Processing",
    inputMaterial: "Cane input",
    typicalLoss: "8% - 12%",
    actionBelow: "Process inefficiency",
    actionAbove: "Pause & audit"
  }
};

const emptySnapshot: DashboardSnapshot = {
  standards: [],
  processors: [],
  inputs: [],
  outputs: [],
  alerts: []
};

const scenarioPresets = {
  normal: { name: "Normal", claimedOutputQty: 960, evaporation: 3, waste: 4, qualityRejection: 0 },
  warning: {
    name: "Low Yield Warning",
    claimedOutputQty: 920,
    evaporation: 9,
    waste: 11,
    qualityRejection: 2
  },
  critical: {
    name: "Adversarial Claim",
    claimedOutputQty: 1000,
    evaporation: 0,
    waste: 0,
    qualityRejection: 0
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
    processType: "grain_cleaning_drying",
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
      processType: "grain_cleaning_drying",
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

  const recentOutputs = useMemo(
    () =>
      [...snapshot.outputs]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-12),
    [snapshot.outputs]
  );

  const activeStandard = useMemo(
    () =>
      snapshot.standards.find((s) => s.processType === swapForm.processType) ??
      snapshot.standards[0] ??
      null,
    [snapshot.standards, swapForm.processType]
  );

  const trendCoordinates = useMemo(() => {
    const width = 360;
    const height = 150;
    if (recentOutputs.length === 0) return [];
    const minX = 18;
    const maxX = width - 18;
    const minY = 12;
    const maxY = height - 18;
    return recentOutputs
      .map((out, idx) => {
        const x =
          recentOutputs.length === 1
            ? width / 2
            : minX + (idx * (maxX - minX)) / (recentOutputs.length - 1);
        const y = maxY - (Math.max(0, Math.min(100, out.actualYieldPct)) / 100) * (maxY - minY);
        return { tokenId: out.tokenId, x, y, actualYieldPct: out.actualYieldPct };
      });
  }, [recentOutputs]);
  const trendPoints = useMemo(
    () => trendCoordinates.map((p) => `${p.x},${p.y}`).join(" "),
    [trendCoordinates]
  );

  const yForPct = (pct: number) => {
    const minY = 12;
    const maxY = 132;
    return maxY - (Math.max(0, Math.min(100, pct)) / 100) * (maxY - minY);
  };
  const trendAvgYield =
    recentOutputs.length > 0
      ? recentOutputs.reduce((sum, item) => sum + item.actualYieldPct, 0) / recentOutputs.length
      : null;

  const alertBars = useMemo(() => {
    const infoCount = snapshot.alerts.filter((a) => a.severity === "INFO").length;
    const warning = snapshot.alerts.filter((a) => a.severity === "WARNING").length;
    const critical = snapshot.alerts.filter((a) => a.severity === "CRITICAL").length;
    const maxValue = Math.max(1, infoCount, warning, critical);
    return [
      { key: "Info", count: infoCount, heightPct: (infoCount / maxValue) * 100, tone: "info" },
      { key: "Warning", count: warning, heightPct: (warning / maxValue) * 100, tone: "warning" },
      { key: "Critical", count: critical, heightPct: (critical / maxValue) * 100, tone: "critical" }
    ];
  }, [snapshot.alerts]);

  const processDistribution = useMemo(() => {
    const groups = snapshot.outputs.reduce<Record<string, number>>((acc, out) => {
      acc[out.processType] = (acc[out.processType] ?? 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(groups);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    if (!total) {
      return {
        style: "conic-gradient(#cbd5e1 0deg 360deg)",
        legend: [{ label: "No outputs yet", value: 0, color: "#94a3b8" }]
      };
    }
    const palette = ["#1f6feb", "#0b7285", "#e67700", "#b02a37", "#7c3aed"];
    let start = 0;
    const slices = entries.map(([label, value], idx) => {
      const angle = (value / total) * 360;
      const end = start + angle;
      const color = palette[idx % palette.length];
      const slice = { label, value, color, start, end };
      start = end;
      return slice;
    });
    return {
      style: `conic-gradient(${slices
        .map((s) => `${s.color} ${s.start.toFixed(1)}deg ${s.end.toFixed(1)}deg`)
        .join(",")})`,
      legend: slices.map((s) => ({ label: s.label, value: s.value, color: s.color }))
    };
  }, [snapshot.outputs]);

  const processPerformance = useMemo(
    () =>
      snapshot.standards.map((standard) => {
        const outputsForType = snapshot.outputs.filter((o) => o.processType === standard.processType);
        const avgActualYield =
          outputsForType.length > 0
            ? outputsForType.reduce((sum, item) => sum + item.actualYieldPct, 0) / outputsForType.length
            : null;
        return {
          processType: standard.processType,
          minimumPct: standard.minimumPct,
          maximumPct: standard.maximumPct,
          avgActualYield,
          count: outputsForType.length
        };
      }),
    [snapshot.standards, snapshot.outputs]
  );

  const outputQuantityBars = useMemo(() => {
    const maxQty = Math.max(1, ...recentOutputs.map((o) => o.outputQuantity));
    return recentOutputs.map((out, index) => ({
      tokenId: out.tokenId,
      label: `#${index + 1}`,
      qty: out.outputQuantity,
      heightPct: (out.outputQuantity / maxQty) * 100
    }));
  }, [recentOutputs]);

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

  const processTypeExplorer = useMemo(() => {
    const processorByType = snapshot.processors.reduce<Record<string, string[]>>((acc, processor) => {
      processor.processAuthorizations.forEach((type) => {
        if (!acc[type]) acc[type] = [];
        acc[type].push(processor.processorId);
      });
      return acc;
    }, {});

    return snapshot.standards
      .map((standard) => ({
        processType: standard.processType,
        label: PROCESS_CATALOG[standard.processType]?.label ?? standard.processType,
        inputMaterial: PROCESS_CATALOG[standard.processType]?.inputMaterial ?? "n/a",
        typicalLoss: PROCESS_CATALOG[standard.processType]?.typicalLoss ?? "n/a",
        actionBelow: PROCESS_CATALOG[standard.processType]?.actionBelow ?? "n/a",
        actionAbove: PROCESS_CATALOG[standard.processType]?.actionAbove ?? "n/a",
        minimumPct: standard.minimumPct,
        maximumPct: standard.maximumPct,
        processors: (processorByType[standard.processType] ?? []).sort()
      }))
      .sort((a, b) => a.processType.localeCompare(b.processType));
  }, [snapshot.standards, snapshot.processors]);

  const allProcessorIds = useMemo(
    () => snapshot.processors.map((p) => p.processorId).sort((a, b) => a.localeCompare(b)),
    [snapshot.processors]
  );
  const allProcessTypes = useMemo(
    () => snapshot.standards.map((s) => s.processType).sort((a, b) => a.localeCompare(b)),
    [snapshot.standards]
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
          <div className="switch-chip">
            <span>Theme</span>
            <Switch checked={mode === "dark"} onCheckedChange={toggleTheme} />
          </div>
          <div className="switch-chip">
            <span>Auto Refresh</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Button className="refresh-btn" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
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
        <section className="panel span-2">
          <h2>How This Dashboard Works</h2>
          <p className="help-text">
            This system checks whether output claims are physically realistic. Inside allowed range,
            swaps pass automatically. Below range creates warnings/penalties. Above range or near-100%
            claim pauses and raises a critical alert.
          </p>
          <div className="explainer-grid">
            <article className="explain-card">
              <strong>Available Processors</strong>
              <p>{allProcessorIds.join(", ") || "None"}</p>
            </article>
            <article className="explain-card">
              <strong>Available Process Types</strong>
              <p>{allProcessTypes.join(", ") || "None"}</p>
            </article>
            <article className="explain-card">
              <strong>If You Mint Input</strong>
              <p>Creates an input token. Graphs do not move until a swap is executed.</p>
            </article>
            <article className="explain-card">
              <strong>If You Execute Swap</strong>
              <p>Outputs, alerts, and all graphs update from the new transaction result.</p>
            </article>
          </div>
        </section>

        <section className="panel span-2">
          <h2>Live Graphs</h2>
          <p className="help-text">
            Trend = actual yield over recent swaps, timeline = output quantity by recent swap, process
            bar = average yield vs allowed range, alert bars = warning/critical counts, donut = output
            mix by process type.
          </p>
          <div className="graphs-grid">
            <article className="graph-card">
              <h3>Yield Trend (Actual %)</h3>
              <svg viewBox="0 0 360 150" className="trend-svg" role="img" aria-label="Yield trend">
                <line x1="14" y1="132" x2="348" y2="132" className="axis-line" />
                <line x1="14" y1="12" x2="14" y2="132" className="axis-line" />
                {activeStandard && (
                  <rect
                    x="14"
                    y={yForPct(activeStandard.maximumPct)}
                    width="334"
                    height={Math.max(
                      4,
                      yForPct(activeStandard.minimumPct) - yForPct(activeStandard.maximumPct)
                    )}
                    className="range-band"
                  />
                )}
                {trendAvgYield !== null && (
                  <line
                    x1="14"
                    y1={yForPct(trendAvgYield)}
                    x2="348"
                    y2={yForPct(trendAvgYield)}
                    className="avg-line"
                  />
                )}
                {trendPoints && <polyline points={trendPoints} className="trend-line" />}
                {trendCoordinates.map((point) => {
                  return <circle key={point.tokenId} cx={point.x} cy={point.y} r="2.8" className="trend-dot" />;
                })}
              </svg>
              <small>
                Last {recentOutputs.length} outputs · latest{" "}
                {recentOutputs.length
                  ? `${recentOutputs[recentOutputs.length - 1].actualYieldPct.toFixed(1)}%`
                  : "n/a"}
              </small>
            </article>

            <article className="graph-card">
              <h3>Output Quantity Timeline</h3>
              <div className="timeline-bars">
                {outputQuantityBars.length ? (
                  outputQuantityBars.map((bar) => (
                    <div key={bar.tokenId} className="timeline-col">
                      <div className="timeline-track">
                        <div className="timeline-fill" style={{ height: `${bar.heightPct}%` }} />
                      </div>
                      <small>{bar.label}</small>
                    </div>
                  ))
                ) : (
                  <p>No output quantities yet.</p>
                )}
              </div>
            </article>

            <article className="graph-card">
              <h3>Process Performance vs Allowed Range</h3>
              <div className="perf-list">
                {processPerformance.map((row) => (
                  <div key={row.processType} className="perf-row">
                    <div className="perf-head">
                      <strong>{row.processType}</strong>
                      <small>
                        {row.avgActualYield !== null
                          ? `${row.avgActualYield.toFixed(1)}% avg (${row.count})`
                          : "No outputs"}
                      </small>
                    </div>
                    <div className="perf-track">
                      <div
                        className="perf-range"
                        style={{
                          left: `${row.minimumPct}%`,
                          width: `${Math.max(2, row.maximumPct - row.minimumPct)}%`
                        }}
                      />
                      {row.avgActualYield !== null && (
                        <div className="perf-marker" style={{ left: `${row.avgActualYield}%` }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="graph-card">
              <h3>Alert Severity Live Bars</h3>
              <div className="bars-wrap">
                {alertBars.map((bar) => (
                  <div key={bar.key} className="bar-col">
                    <div className="bar-track">
                      <div className={`bar-fill ${bar.tone}`} style={{ height: `${bar.heightPct}%` }} />
                    </div>
                    <strong>{bar.count}</strong>
                    <small>{bar.key}</small>
                  </div>
                ))}
              </div>
            </article>
            <article className="graph-card">
              <h3>Output Distribution by Process</h3>
              <div className="ring-wrap">
                <div className="donut-ring" style={{ background: processDistribution.style }} />
                <div className="ring-legend">
                  {processDistribution.legend.map((item) => (
                    <div key={item.label} className="legend-item">
                      <span style={{ background: item.color }} />
                      <small>
                        {item.label}: {item.value}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="panel">
          <h2>Process Type Explorer</h2>
          <p className="help-text">
            Shows each process type, its loss/allowed range, and which processors are authorized.
          </p>
          <div className="scroll-table">
            <table>
              <thead>
                <tr>
                  <th>Process Type</th>
                  <th>Input</th>
                  <th>Loss</th>
                  <th>Min %</th>
                  <th>Max %</th>
                  <th>Processors</th>
                </tr>
              </thead>
              <tbody>
                {processTypeExplorer.map((item) => (
                  <tr key={item.processType}>
                    <td>{item.processType}</td>
                    <td>{item.inputMaterial}</td>
                    <td>{item.typicalLoss}</td>
                    <td>{item.minimumPct}</td>
                    <td>{item.maximumPct}</td>
                    <td>{item.processors.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="process-type-scroll">
            {processTypeExplorer.map((item) => (
              <article key={item.processType} className="process-type-card">
                <div>
                  <strong>{item.label}</strong>
                  <small>
                    {item.processType} | input {item.inputMaterial} | typical loss {item.typicalLoss}
                  </small>
                  <small>
                    Below range: {item.actionBelow} | Above range: {item.actionAbove}
                  </small>
                </div>
                <div className="chip-row">
                  {item.processors.length ? (
                    item.processors.map((processorId) => (
                      <Badge key={`${item.processType}-${processorId}`} variant="outline">
                        {processorId}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="warning">No processors mapped</Badge>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Yield Standards Oracle</h2>
          <p className="help-text">Official min/max yield limits used by enforcement.</p>
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
          <p className="help-text">
            Searchable/scrollable processor list with compliance and authorized process types.
          </p>
          <div className="toolbar">
            <Input
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
              <Switch checked={showSuspendedOnly} onCheckedChange={setShowSuspendedOnly} />
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
                  <Badge variant="secondary">Cert {p.certificationLevel}</Badge>
                  <Badge variant="outline">{(p.complianceScore * 100).toFixed(1)}% compliance</Badge>
                  {p.suspended && <Badge variant="critical">Suspended</Badge>}
                </div>
                <div className="chip-row">
                  {p.processAuthorizations.map((processType) => (
                    <Badge key={`${p.processorId}-${processType}`} variant="outline">
                      {processType}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
            {processorRows.length === 0 && <p>No processors match current filters.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>Mint Input Material DDP</h2>
          <p className="help-text">
            Create an input token (digital passport for real input material batch).
          </p>
          <form className="form" onSubmit={handleMint}>
            <label>
              Processor ID
              <Input
                value={mintForm.ownerProcessorId}
                onChange={(e) => setMintForm({ ...mintForm, ownerProcessorId: e.target.value })}
              />
            </label>
            <label>
              Process Type
              <Input
                value={mintForm.processType}
                onChange={(e) => setMintForm({ ...mintForm, processType: e.target.value })}
                list="all-process-types"
              />
            </label>
            <label>
              Quantity
              <Input
                type="number"
                value={mintForm.quantity}
                onChange={(e) => setMintForm({ ...mintForm, quantity: Number(e.target.value) })}
              />
            </label>
            <label>
              Farm Hash
              <Input
                value={mintForm.originFarmHash}
                onChange={(e) => setMintForm({ ...mintForm, originFarmHash: e.target.value })}
              />
            </label>
            <label>
              Quality Grade
              <Input
                value={mintForm.qualityGrade}
                onChange={(e) => setMintForm({ ...mintForm, qualityGrade: e.target.value })}
              />
            </label>
            <label>
              Moisture %
              <Input
                type="number"
                value={mintForm.moistureContent}
                onChange={(e) =>
                  setMintForm({ ...mintForm, moistureContent: Number(e.target.value) })
                }
              />
            </label>
            <Button type="submit" disabled={minting}>
              {minting ? "Minting..." : "Mint Input Token"}
            </Button>
          </form>
        </section>

        <section className="panel">
          <h2>Token Swap Enforcement</h2>
          <p className="help-text">
            Burns input token and mints output token only if claim is within tolerance rules.
          </p>
          <div className="scenario-row">
            {Object.entries(scenarioPresets).map(([key, value]) => (
              <Button
                key={key}
                className="mini-btn"
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => applySwapScenario(key as keyof typeof scenarioPresets)}
              >
                {value.name}
              </Button>
            ))}
          </div>
          <form className="form" onSubmit={handleSwap}>
            <label>
              Processor ID
              <Input
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
              <Input
                type="number"
                value={swapForm.inputQty}
                onChange={(e) => setSwapForm({ ...swapForm, inputQty: Number(e.target.value) })}
              />
            </label>
            <label>
              Claimed Output Qty
              <Input
                type="number"
                value={swapForm.claimedOutputQty}
                onChange={(e) =>
                  setSwapForm({ ...swapForm, claimedOutputQty: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Process Type
              <Input
                value={swapForm.processType}
                onChange={(e) => setSwapForm({ ...swapForm, processType: e.target.value })}
                list="all-process-types"
              />
            </label>
            <label>
              Evaporation %
              <Input
                type="number"
                value={swapForm.evaporation}
                onChange={(e) => setSwapForm({ ...swapForm, evaporation: Number(e.target.value) })}
              />
            </label>
            <label>
              Waste %
              <Input
                type="number"
                value={swapForm.waste}
                onChange={(e) => setSwapForm({ ...swapForm, waste: Number(e.target.value) })}
              />
            </label>
            <label>
              Quality Rejection %
              <Input
                type="number"
                value={swapForm.qualityRejection}
                onChange={(e) =>
                  setSwapForm({ ...swapForm, qualityRejection: Number(e.target.value) })
                }
              />
            </label>
            <Button type="submit" disabled={swapping || !swapForm.inputTokenId}>
              {swapping ? "Processing..." : "Execute Swap"}
            </Button>
          </form>
        </section>

        <section className="panel">
          <h2>Recent Output Passports</h2>
          <p className="help-text">Latest processed outputs with claimed vs actual yield.</p>
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
          <p className="help-text">
            Warning/Critical signals generated when claims move outside expected behavior.
          </p>
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
      <datalist id="all-process-types">
        {snapshot.standards.map((s) => (
          <option key={s.processType} value={s.processType} />
        ))}
      </datalist>
    </div>
  );
}
