import crypto from "node:crypto";

const nowISO = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 12)}`;

export class ArchitectureOneStore {
  constructor() {
    this.processors = new Map();
    this.inputMaterials = new Map();
    this.outputMaterials = new Map();
    this.oracleRanges = new Map();
    this.oracleHistory = [];
    this.ledgerBalances = new Map();
    this.ledgerEvents = [];
    this.alerts = [];
    this.violationCounts = new Map();
  }

  setYieldRange({ processType, minimumPct, maximumPct, actor, reason }) {
    if (minimumPct < 0 || maximumPct > 100 || minimumPct >= maximumPct) {
      throw new Error("Invalid yield range");
    }
    const oldRange = this.oracleRanges.get(processType) ?? null;
    const next = { minimumPct, maximumPct };
    this.oracleRanges.set(processType, next);
    this.oracleHistory.push({
      processType,
      oldRange,
      newRange: next,
      actor,
      reason,
      timestamp: nowISO()
    });
    return next;
  }

  registerProcessor(input) {
    const processor = {
      processorId: input.processorId,
      processAuthorizations: input.processAuthorizations,
      certificationLevel: input.certificationLevel,
      equipmentSpecs: input.equipmentSpecs,
      complianceScore: input.complianceScore ?? 1,
      suspended: false
    };
    this.processors.set(processor.processorId, processor);
    return processor;
  }

  mintInputMaterial(input) {
    const tokenId = input.tokenId ?? makeId("in");
    if (!this.processors.has(input.ownerProcessorId)) {
      throw new Error("Processor does not exist");
    }
    const material = {
      tokenId,
      processType: input.processType,
      quantity: input.quantity,
      originFarmHash: input.originFarmHash,
      qualityGrade: input.qualityGrade,
      moistureContent: input.moistureContent,
      ownerProcessorId: input.ownerProcessorId,
      createdAt: nowISO()
    };
    this.inputMaterials.set(tokenId, material);
    this.ledgerBalances.set(tokenId, {
      owner: input.ownerProcessorId,
      quantity: input.quantity
    });
    this.ledgerEvents.push({
      eventType: "MINT_INPUT",
      tokenId,
      owner: input.ownerProcessorId,
      quantity: input.quantity,
      metadata: { processType: input.processType },
      timestamp: nowISO()
    });
    return material;
  }

  getViolationCount(processorId, processType) {
    return this.violationCounts.get(`${processorId}:${processType}`) ?? 0;
  }

  incrementViolation(processorId, processType) {
    const key = `${processorId}:${processType}`;
    const next = (this.violationCounts.get(key) ?? 0) + 1;
    this.violationCounts.set(key, next);
    return next;
  }

  processSwap(input) {
    const processor = this.processors.get(input.processorId);
    if (!processor) throw new Error("Unknown processor");
    if (processor.suspended) throw new Error("Processor is suspended");
    if (!processor.processAuthorizations.includes(input.processType)) {
      throw new Error("Processor is not authorized for process type");
    }

    const standard = this.oracleRanges.get(input.processType);
    if (!standard) throw new Error("No oracle range configured");

    const inputMaterial = this.inputMaterials.get(input.inputTokenId);
    if (!inputMaterial) throw new Error("Input token not found");

    const balance = this.ledgerBalances.get(input.inputTokenId);
    if (!balance || balance.owner !== input.processorId) {
      throw new Error("Input token ownership mismatch");
    }
    if (Math.abs(balance.quantity - input.inputQty) > 1e-9) {
      throw new Error("Input quantity mismatch");
    }

    const claimedYieldPct = input.inputQty <= 0 ? 0 : (input.claimedOutputQty / input.inputQty) * 100;
    if (claimedYieldPct > standard.maximumPct) {
      throw new Error(
        `Reverted: claimed yield ${claimedYieldPct.toFixed(2)}% exceeds max ${standard.maximumPct.toFixed(2)}%`
      );
    }

    let mintQty = input.claimedOutputQty;
    let severity = "INFO";
    let message = "Swap accepted in normal range";
    let auditFlagged = false;

    if (claimedYieldPct < standard.minimumPct) {
      const count = this.incrementViolation(input.processorId, input.processType);
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

    this.ledgerBalances.delete(input.inputTokenId);
    this.ledgerEvents.push({
      eventType: "BURN_INPUT",
      tokenId: input.inputTokenId,
      owner: input.processorId,
      quantity: input.inputQty,
      metadata: {},
      timestamp: nowISO()
    });

    const outputTokenId = makeId("out");
    this.ledgerBalances.set(outputTokenId, {
      owner: input.processorId,
      quantity: mintQty
    });
    this.ledgerEvents.push({
      eventType: "MINT_OUTPUT",
      tokenId: outputTokenId,
      owner: input.processorId,
      quantity: mintQty,
      metadata: {
        parentInputTokenId: input.inputTokenId,
        processType: input.processType,
        claimedYieldPct
      },
      timestamp: nowISO()
    });

    const output = {
      tokenId: outputTokenId,
      parentInputTokenId: input.inputTokenId,
      processorId: input.processorId,
      processType: input.processType,
      outputQuantity: mintQty,
      claimedYieldPct,
      actualYieldPct: input.inputQty <= 0 ? 0 : (mintQty / input.inputQty) * 100,
      lossBreakdown: input.lossBreakdown ?? {},
      timestamp: nowISO(),
      severity,
      message,
      auditFlagged
    };
    this.outputMaterials.set(outputTokenId, output);

    if (severity !== "INFO") {
      this.alerts.unshift({
        alertId: makeId("alert"),
        processorId: input.processorId,
        processType: input.processType,
        severity,
        message,
        timestamp: nowISO(),
        outputTokenId
      });
    }

    return output;
  }

  snapshot() {
    return {
      processors: Array.from(this.processors.values()),
      inputs: Array.from(this.inputMaterials.values()),
      outputs: Array.from(this.outputMaterials.values()).sort((a, b) =>
        a.timestamp < b.timestamp ? 1 : -1
      ),
      standards: Array.from(this.oracleRanges.entries()).map(([processType, range]) => ({
        processType,
        ...range
      })),
      alerts: this.alerts.slice(0, 50),
      ledgerEvents: this.ledgerEvents.slice(-100).reverse()
    };
  }
}

