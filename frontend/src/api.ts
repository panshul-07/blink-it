import type { DashboardSnapshot, InputMaterialDDP, OutputMaterialDDP } from "./types";
import { fetchMockDashboard, mintMockInputMaterial, processMockSwap } from "./mockApi";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/graphql";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function graphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("Missing GraphQL data");
  return json.data;
}

export async function fetchDashboard(): Promise<DashboardSnapshot> {
  if (USE_MOCK) {
    return fetchMockDashboard();
  }
  const data = await graphQL<{ dashboard: DashboardSnapshot }>(`
    query Dashboard {
      dashboard {
        standards { processType minimumPct maximumPct }
        processors { processorId processAuthorizations certificationLevel equipmentSpecs complianceScore suspended }
        inputs { tokenId processType quantity originFarmHash qualityGrade moistureContent ownerProcessorId createdAt }
        outputs { tokenId parentInputTokenId processorId processType outputQuantity claimedYieldPct actualYieldPct lossBreakdown timestamp severity message auditFlagged }
        alerts { alertId processorId processType severity message timestamp outputTokenId }
      }
    }
  `);
  return data.dashboard;
}

export async function mintInputMaterial(input: {
  ownerProcessorId: string;
  processType: string;
  quantity: number;
  originFarmHash: string;
  qualityGrade: string;
  moistureContent: number;
}): Promise<InputMaterialDDP> {
  if (USE_MOCK) {
    return mintMockInputMaterial(input);
  }
  const data = await graphQL<{ mintInputMaterial: InputMaterialDDP }>(
    `
      mutation MintInputMaterial($input: MintInputMaterialInput!) {
        mintInputMaterial(input: $input) {
          tokenId
          processType
          quantity
          originFarmHash
          qualityGrade
          moistureContent
          ownerProcessorId
          createdAt
        }
      }
    `,
    { input }
  );
  return data.mintInputMaterial;
}

export async function processSwap(input: {
  processorId: string;
  inputTokenId: string;
  inputQty: number;
  claimedOutputQty: number;
  processType: string;
  lossBreakdown?: { evaporation?: number; waste?: number; qualityRejection?: number };
}): Promise<OutputMaterialDDP> {
  if (USE_MOCK) {
    return processMockSwap(input);
  }
  const data = await graphQL<{ processSwap: OutputMaterialDDP }>(
    `
      mutation ProcessSwap($input: ProcessSwapInput!) {
        processSwap(input: $input) {
          tokenId
          parentInputTokenId
          processorId
          processType
          outputQuantity
          claimedYieldPct
          actualYieldPct
          lossBreakdown
          timestamp
          severity
          message
          auditFlagged
        }
      }
    `,
    { input }
  );
  return data.processSwap;
}
