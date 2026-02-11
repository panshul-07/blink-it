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
  { processType: "grain_cleaning_drying", minimumPct: 94, maximumPct: 98 },
  { processType: "fruit_sorting_packaging", minimumPct: 92, maximumPct: 95 },
  { processType: "metal_ore_refining", minimumPct: 93, maximumPct: 96 },
  { processType: "coffee_bean_processing", minimumPct: 91, maximumPct: 94 },
  { processType: "cotton_ginning", minimumPct: 90, maximumPct: 93 },
  { processType: "sugarcane_processing", minimumPct: 88, maximumPct: 92 }
];

const processors: ProcessorDDP[] = [
  {
    processorId: "proc_alpha",
    processAuthorizations: ["grain_cleaning_drying", "fruit_sorting_packaging"],
    certificationLevel: "L2",
    equipmentSpecs: "Optical sorter + rotary cleaner",
    complianceScore: 0.97,
    suspended: false
  },
  {
    processorId: "proc_beta",
    processAuthorizations: ["grain_cleaning_drying", "coffee_bean_processing"],
    certificationLevel: "L1",
    equipmentSpecs: "Mechanical separator",
    complianceScore: 0.9,
    suspended: false
  },
  {
    processorId: "proc_gamma",
    processAuthorizations: ["metal_ore_refining"],
    certificationLevel: "L2",
    equipmentSpecs: "Crushing + flotation plant",
    complianceScore: 0.94,
    suspended: false
  },
  {
    processorId: "proc_delta",
    processAuthorizations: ["cotton_ginning"],
    certificationLevel: "L1",
    equipmentSpecs: "Saw gin line",
    complianceScore: 0.91,
    suspended: false
  },
  {
    processorId: "proc_epsilon",
    processAuthorizations: ["sugarcane_processing"],
    certificationLevel: "L2",
    equipmentSpecs: "Diffuser + clarifier mill",
    complianceScore: 0.92,
    suspended: false
  },
  {
    processorId: "proc_zeta",
    processAuthorizations: ["fruit_sorting_packaging", "sugarcane_processing"],
    certificationLevel: "L2",
    equipmentSpecs: "Packing lane + cane press",
    complianceScore: 0.93,
    suspended: false
  },
  {
    processorId: "proc_eta",
    processAuthorizations: ["metal_ore_refining", "coffee_bean_processing"],
    certificationLevel: "L2",
    equipmentSpecs: "Roaster + flotation circuit",
    complianceScore: 0.95,
    suspended: false
  },
  {
    processorId: "proc_theta",
    processAuthorizations: ["cotton_ginning", "grain_cleaning_drying"],
    certificationLevel: "L1",
    equipmentSpecs: "Saw gin + dryer line",
    complianceScore: 0.89,
    suspended: false
  },
  {
    processorId: "proc_iota",
    processAuthorizations: ["fruit_sorting_packaging"],
    certificationLevel: "L1",
    equipmentSpecs: "Vision sorter line",
    complianceScore: 0.9,
    suspended: false
  },
  {
    processorId: "proc_kappa",
    processAuthorizations: ["sugarcane_processing"],
    certificationLevel: "L1",
    equipmentSpecs: "Clarifier + evaporator train",
    complianceScore: 0.88,
    suspended: false
  }
];

const inputs: InputMaterialDDP[] = [
  {
    tokenId: makeId("in"),
    processType: "grain_cleaning_drying",
    quantity: 1000,
    originFarmHash: "farm_hash_seed",
    qualityGrade: "A",
    moistureContent: 11.2,
    ownerProcessorId: "proc_alpha",
    createdAt: now()
  },
  {
    tokenId: makeId("in"),
    processType: "fruit_sorting_packaging",
    quantity: 900,
    originFarmHash: "farm_hash_seed_2",
    qualityGrade: "A",
    moistureContent: 10.4,
    ownerProcessorId: "proc_zeta",
    createdAt: now()
  },
  {
    tokenId: makeId("in"),
    processType: "metal_ore_refining",
    quantity: 1200,
    originFarmHash: "mine_hash_seed_3",
    qualityGrade: "A",
    moistureContent: 4.2,
    ownerProcessorId: "proc_gamma",
    createdAt: now()
  },
  {
    tokenId: makeId("in"),
    processType: "coffee_bean_processing",
    quantity: 800,
    originFarmHash: "farm_hash_seed_4",
    qualityGrade: "A",
    moistureContent: 12.1,
    ownerProcessorId: "proc_beta",
    createdAt: now()
  },
  {
    tokenId: makeId("in"),
    processType: "cotton_ginning",
    quantity: 950,
    originFarmHash: "farm_hash_seed_5",
    qualityGrade: "A",
    moistureContent: 9.6,
    ownerProcessorId: "proc_delta",
    createdAt: now()
  },
  {
    tokenId: makeId("in"),
    processType: "sugarcane_processing",
    quantity: 1100,
    originFarmHash: "farm_hash_seed_6",
    qualityGrade: "A",
    moistureContent: 15.4,
    ownerProcessorId: "proc_epsilon",
    createdAt: now()
  }
];

const outputs: OutputMaterialDDP[] = [];
const alerts: Alert[] = [];
const violations: Record<string, number> = {};

function addAlert(alert: Omit<Alert, "alertId" | "timestamp">) {
  alerts.unshift({
    alertId: makeId("alert"),
    timestamp: now(),
    ...alert
  });
}

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
  if (claimedYieldPct >= 99) {
    const message = `Paused: adversarial near-perfect claim ${claimedYieldPct.toFixed(2)}%`;
    addAlert({
      processorId: input.processorId,
      processType: input.processType,
      severity: "CRITICAL",
      message
    });
    throw new Error(message);
  }
  if (claimedYieldPct > range.maximumPct) {
    const message = `Paused: claimed yield ${claimedYieldPct.toFixed(2)}% exceeds max ${range.maximumPct.toFixed(2)}%`;
    addAlert({
      processorId: input.processorId,
      processType: input.processType,
      severity: "CRITICAL",
      message
    });
    throw new Error(message);
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
      const message = "Persistent violations: processor suspended";
      addAlert({
        processorId: input.processorId,
        processType: input.processType,
        severity: "CRITICAL",
        message
      });
      throw new Error(message);
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
  addAlert({
    processorId: input.processorId,
    processType: input.processType,
    severity,
    message,
    outputTokenId: output.tokenId
  });

  return output;
}
