export const seedStore = (store) => {
  store.setYieldRange({
    processType: "grain_cleaning",
    minimumPct: 82,
    maximumPct: 93,
    actor: "standards_body_v1",
    reason: "Initial engineering baseline"
  });

  store.setYieldRange({
    processType: "fruit_sorting",
    minimumPct: 70,
    maximumPct: 88,
    actor: "standards_body_v1",
    reason: "Pilot process defaults"
  });

  store.registerProcessor({
    processorId: "proc_alpha",
    processAuthorizations: ["grain_cleaning", "fruit_sorting"],
    certificationLevel: "L2",
    equipmentSpecs: "Optical sorter + rotary cleaner",
    complianceScore: 0.97
  });

  store.registerProcessor({
    processorId: "proc_beta",
    processAuthorizations: ["grain_cleaning"],
    certificationLevel: "L1",
    equipmentSpecs: "Mechanical separator",
    complianceScore: 0.9
  });

  store.mintInputMaterial({
    ownerProcessorId: "proc_alpha",
    processType: "grain_cleaning",
    quantity: 1000,
    originFarmHash: "farm_hash_001",
    qualityGrade: "A",
    moistureContent: 11.2
  });
};

