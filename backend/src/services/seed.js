export const seedStore = (store) => {
  store.setYieldRange({
    processType: "grain_cleaning_drying",
    minimumPct: 94,
    maximumPct: 97,
    actor: "standards_body_v1",
    reason: "Paddy/Wheat baseline"
  });

  store.setYieldRange({
    processType: "fruit_sorting_packaging",
    minimumPct: 92,
    maximumPct: 95,
    actor: "standards_body_v1",
    reason: "Apples/Oranges baseline"
  });

  store.setYieldRange({
    processType: "metal_ore_refining",
    minimumPct: 93,
    maximumPct: 96,
    actor: "standards_body_v1",
    reason: "Iron/Copper baseline"
  });

  store.setYieldRange({
    processType: "coffee_bean_processing",
    minimumPct: 91,
    maximumPct: 94,
    actor: "standards_body_v1",
    reason: "Raw beans baseline"
  });

  store.setYieldRange({
    processType: "cotton_ginning",
    minimumPct: 90,
    maximumPct: 93,
    actor: "standards_body_v1",
    reason: "Raw cotton baseline"
  });

  store.setYieldRange({
    processType: "sugarcane_processing",
    minimumPct: 88,
    maximumPct: 92,
    actor: "standards_body_v1",
    reason: "Cane input baseline"
  });

  store.registerProcessor({
    processorId: "proc_alpha",
    processAuthorizations: ["grain_cleaning_drying", "fruit_sorting_packaging"],
    certificationLevel: "L2",
    equipmentSpecs: "Optical sorter + rotary cleaner",
    complianceScore: 0.97
  });

  store.registerProcessor({
    processorId: "proc_beta",
    processAuthorizations: ["grain_cleaning_drying", "coffee_bean_processing"],
    certificationLevel: "L1",
    equipmentSpecs: "Mechanical separator",
    complianceScore: 0.9
  });

  store.registerProcessor({
    processorId: "proc_gamma",
    processAuthorizations: ["metal_ore_refining"],
    certificationLevel: "L2",
    equipmentSpecs: "Crushing + flotation plant",
    complianceScore: 0.94
  });

  store.registerProcessor({
    processorId: "proc_delta",
    processAuthorizations: ["cotton_ginning"],
    certificationLevel: "L1",
    equipmentSpecs: "Saw gin line",
    complianceScore: 0.91
  });

  store.registerProcessor({
    processorId: "proc_epsilon",
    processAuthorizations: ["sugarcane_processing"],
    certificationLevel: "L2",
    equipmentSpecs: "Diffuser + clarifier mill",
    complianceScore: 0.92
  });

  store.mintInputMaterial({
    ownerProcessorId: "proc_alpha",
    processType: "grain_cleaning_drying",
    quantity: 1000,
    originFarmHash: "farm_hash_001",
    qualityGrade: "A",
    moistureContent: 11.2
  });
};
