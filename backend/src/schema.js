import { GraphQLError } from "graphql";
import { GraphQLScalarType, Kind } from "graphql";

export const typeDefs = `#graphql
  scalar JSON

  type YieldStandard {
    processType: String!
    minimumPct: Float!
    maximumPct: Float!
  }

  type ProcessorDDP {
    processorId: String!
    processAuthorizations: [String!]!
    certificationLevel: String!
    equipmentSpecs: String!
    complianceScore: Float!
    suspended: Boolean!
  }

  type InputMaterialDDP {
    tokenId: String!
    processType: String!
    quantity: Float!
    originFarmHash: String!
    qualityGrade: String!
    moistureContent: Float!
    ownerProcessorId: String!
    createdAt: String!
  }

  type OutputMaterialDDP {
    tokenId: String!
    parentInputTokenId: String!
    processorId: String!
    processType: String!
    outputQuantity: Float!
    claimedYieldPct: Float!
    actualYieldPct: Float!
    lossBreakdown: JSON!
    timestamp: String!
    severity: String!
    message: String!
    auditFlagged: Boolean!
  }

  type Alert {
    alertId: String!
    processorId: String!
    processType: String!
    severity: String!
    message: String!
    timestamp: String!
    outputTokenId: String
  }

  type LedgerEvent {
    eventType: String!
    tokenId: String!
    owner: String!
    quantity: Float!
    metadata: JSON!
    timestamp: String!
  }

  type DashboardSnapshot {
    processors: [ProcessorDDP!]!
    inputs: [InputMaterialDDP!]!
    outputs: [OutputMaterialDDP!]!
    standards: [YieldStandard!]!
    alerts: [Alert!]!
    ledgerEvents: [LedgerEvent!]!
  }

  input RegisterProcessorInput {
    processorId: String!
    processAuthorizations: [String!]!
    certificationLevel: String!
    equipmentSpecs: String!
    complianceScore: Float
  }

  input MintInputMaterialInput {
    tokenId: String
    ownerProcessorId: String!
    processType: String!
    quantity: Float!
    originFarmHash: String!
    qualityGrade: String!
    moistureContent: Float!
  }

  input LossBreakdownInput {
    evaporation: Float
    waste: Float
    qualityRejection: Float
  }

  input ProcessSwapInput {
    processorId: String!
    inputTokenId: String!
    inputQty: Float!
    claimedOutputQty: Float!
    processType: String!
    lossBreakdown: LossBreakdownInput
  }

  type Query {
    health: String!
    standards: [YieldStandard!]!
    processors: [ProcessorDDP!]!
    inputs: [InputMaterialDDP!]!
    outputs: [OutputMaterialDDP!]!
    alerts: [Alert!]!
    dashboard: DashboardSnapshot!
  }

  type Mutation {
    upsertYieldStandard(processType: String!, minimumPct: Float!, maximumPct: Float!, actor: String!, reason: String!): YieldStandard!
    registerProcessor(input: RegisterProcessorInput!): ProcessorDDP!
    mintInputMaterial(input: MintInputMaterialInput!): InputMaterialDDP!
    processSwap(input: ProcessSwapInput!): OutputMaterialDDP!
  }
`;

export const resolvers = {
  JSON: new GraphQLScalarType({
    name: "JSON",
    description: "Arbitrary JSON value",
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => {
      if (ast.kind === Kind.STRING) return ast.value;
      if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) return Number(ast.value);
      if (ast.kind === Kind.BOOLEAN) return ast.value;
      return null;
    }
  }),
  Query: {
    health: () => "ok",
    standards: (_, __, { store }) => store.snapshot().standards,
    processors: (_, __, { store }) => store.snapshot().processors,
    inputs: (_, __, { store }) => store.snapshot().inputs,
    outputs: (_, __, { store }) => store.snapshot().outputs,
    alerts: (_, __, { store }) => store.snapshot().alerts,
    dashboard: (_, __, { store }) => store.snapshot()
  },
  Mutation: {
    upsertYieldStandard: (_, args, { store }) => {
      store.setYieldRange({
        processType: args.processType,
        minimumPct: args.minimumPct,
        maximumPct: args.maximumPct,
        actor: args.actor,
        reason: args.reason
      });
      return {
        processType: args.processType,
        minimumPct: args.minimumPct,
        maximumPct: args.maximumPct
      };
    },
    registerProcessor: (_, { input }, { store }) => store.registerProcessor(input),
    mintInputMaterial: (_, { input }, { store }) => store.mintInputMaterial(input),
    processSwap: (_, { input }, { store }) => {
      try {
        return store.processSwap(input);
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: { code: "ENFORCEMENT_ERROR" }
        });
      }
    }
  }
};
