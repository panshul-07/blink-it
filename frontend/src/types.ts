export type YieldStandard = {
  processType: string;
  minimumPct: number;
  maximumPct: number;
};

export type ProcessorDDP = {
  processorId: string;
  processAuthorizations: string[];
  certificationLevel: string;
  equipmentSpecs: string;
  complianceScore: number;
  suspended: boolean;
};

export type InputMaterialDDP = {
  tokenId: string;
  processType: string;
  quantity: number;
  originFarmHash: string;
  qualityGrade: string;
  moistureContent: number;
  ownerProcessorId: string;
  createdAt: string;
};

export type OutputMaterialDDP = {
  tokenId: string;
  parentInputTokenId: string;
  processorId: string;
  processType: string;
  outputQuantity: number;
  claimedYieldPct: number;
  actualYieldPct: number;
  lossBreakdown: Record<string, number>;
  timestamp: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  auditFlagged: boolean;
};

export type Alert = {
  alertId: string;
  processorId: string;
  processType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  timestamp: string;
  outputTokenId?: string;
};

export type DashboardSnapshot = {
  standards: YieldStandard[];
  processors: ProcessorDDP[];
  inputs: InputMaterialDDP[];
  outputs: OutputMaterialDDP[];
  alerts: Alert[];
};

