import type {
  Alert,
  DashboardSnapshot,
  InputMaterialDDP,
  OutputMaterialDDP,
  ProcessorDDP,
  YieldStandard
} from "./types";

type MintInput = {
  ownerProcessorId: string;
  processType: string;
  quantity: number;
  originFarmHash: string;
  qualityGrade: string;
  moistureContent: number;
};

type SwapInput = {
  processorId: string;
  inputTokenId: string;
  inputQty: number;
  claimedOutputQty: number;
  processType: string;
  lossBreakdown?: { evaporation?: number; waste?: number; qualityRejection?: number };
};

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

const standards: YieldStandard[] = [
  { processType: "grain_cleaning", minimumPct: 82, maximumPct: 93 },
  { processType: "fruit_sorting", minimumPct: 70, maximumPct: 88 }
];

const processors: ProcessorDDP[] = [
  {
    processorId: "proc_alpha",
    processAuthorizations: ["grain_cleaning", "fruit_sorting"],
    certificationLevel: "L2",
    equipmentSpecs: "Optical sorter + rotary cleaner",
    complianceScore: 0.97,
    suspended: false
  },
  {
    processorId: "proc_beta",
    processAuthorizations: ["grain_cleaning"],
    certificationLevel: "L1",
    equipmentSpecs: "Mechanical separator",
    complianceScore: 0.9,
    suspended: false
  }
];

const inputs: InputMaterialDDP[] = [
  {
    tokenId: makeId("in"),
    processType: "grain_cleaning",
    quantity: 1000,
    originFarmHash: "farm_hash_seed",
    qualityGrade: "A",
    moistureContent: 11.2,
    ownerProcessorId: "proc_alpha",
    createdAt: now()
  }
];

const outputs: OutputMaterialDDP[] = [];
const alerts: Alert[] = [];
const violations: Record<string, number> = {};

function getRange(processType: string): YieldStandard {
  const standard = standards.find((s) => s.processType === processType);
  if (!standard) throw new Error(`No yield standard for ${processType}`);
  return standard;
}

function getProcessor(id: string): ProcessorDDP {
  const processor = processors.find((p) => p.processorId === id);
  if (!processor) throw new Error(`Unknown processor ${id}`);
  if (processor.suspended) throw new Error(`Processor ${id} is suspended`);
  return processor;
}

export async function fetchMockDashboard(): Promise<DashboardSnapshot> {
  return {
    standards: [...standards],
    processors: [...processors],
    inputs: [...inputs],
    outputs: [...outputs],
    alerts: [...alerts]
  };
}

export async function mintMockInputMaterial(input: MintInput): Promise<InputMaterialDDP> {
  getProcessor(input.ownerProcessorId);
  const token: InputMaterialDDP = {
    tokenId: makeId("in"),
    processType: input.processType,
    quantity: input.quantity,
    originFarmHash: input.originFarmHash,
    qualityGrade: input.qualityGrade,
    moistureContent: input.moistureContent,
    ownerProcessorId: input.ownerProcessorId,
    createdAt: now()
  };
  inputs.unshift(token);
  return token;
}

export async function processMockSwap(input: SwapInput): Promise<OutputMaterialDDP> {
  const processor = getProcessor(input.processorId);
  const idx = inputs.findIndex((x) => x.tokenId === input.inputTokenId);
  if (idx < 0) throw new Error("Input token not found");
  const source = inputs[idx];
  if (source.ownerProcessorId !== input.processorId) throw new Error("Input token ownership mismatch");
  if (Math.abs(source.quantity - input.inputQty) > 1e-9) throw new Error("Input quantity mismatch");

  const range = getRange(input.processType);
  const claimedYieldPct = (input.claimedOutputQty / input.inputQty) * 100;
  if (claimedYieldPct > range.maximumPct) {
    throw new Error(
      `Reverted: claimed yield ${claimedYieldPct.toFixed(2)}% exceeds max ${range.maximumPct.toFixed(2)}%`
    );
  }

  const key = `${input.processorId}:${input.processType}`;
  let mintQty = input.claimedOutputQty;
  let severity: OutputMaterialDDP["severity"] = "INFO";
  let message = "Swap accepted in normal range";
  let auditFlagged = false;

  if (claimedYieldPct < range.minimumPct) {
    const count = (violations[key] ?? 0) + 1;
    violations[key] = count;
    if (count === 1) {
      severity = "WARNING";
      message = "First deviation: warning logged, transaction proceeds";
    } else if (count === 2) {
      severity = "WARNING";
      mintQty = Number((input.claimedOutputQty * 0.95).toFixed(6));
      message = "Second deviation: reduced minting ratio applied (5%)";
    } else if (count === 3) {
      severity = "CRITICAL";
      mintQty = Number((input.claimedOutputQty * 0.9).toFixed(6));
      message = "Third deviation: flagged for audit and reduced minting ratio (10%)";
      auditFlagged = true;
    } else {
      processor.suspended = true;
      throw new Error("Persistent violations: processor suspended");
    }
  }

  inputs.splice(idx, 1);

  const output: OutputMaterialDDP = {
    tokenId: makeId("out"),
    parentInputTokenId: source.tokenId,
    processorId: input.processorId,
    processType: input.processType,
    outputQuantity: mintQty,
    claimedYieldPct,
    actualYieldPct: (mintQty / input.inputQty) * 100,
    lossBreakdown: {
      evaporation: input.lossBreakdown?.evaporation ?? 0,
      waste: input.lossBreakdown?.waste ?? 0,
      qualityRejection: input.lossBreakdown?.qualityRejection ?? 0
    },
    timestamp: now(),
    severity,
    message,
    auditFlagged
  };

  outputs.unshift(output);
  if (severity !== "INFO") {
    alerts.unshift({
      alertId: makeId("alert"),
      processorId: input.processorId,
      processType: input.processType,
      severity,
      message,
      timestamp: now(),
      outputTokenId: output.tokenId
    });
  }

  return output;
}

