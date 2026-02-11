export const seedStore = (store) => {
  store.setYieldRange({
    processType: "grain_cleaning_drying",
    minimumPct: 94,
    maximumPct: 98,
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

  const processors = [
    {
      processorId: "proc_alpha",
      processAuthorizations: ["grain_cleaning_drying", "fruit_sorting_packaging"],
      certificationLevel: "L2",
      equipmentSpecs: "Optical sorter + rotary cleaner",
      complianceScore: 0.97
    },
    {
      processorId: "proc_beta",
      processAuthorizations: ["grain_cleaning_drying", "coffee_bean_processing"],
      certificationLevel: "L1",
      equipmentSpecs: "Mechanical separator",
      complianceScore: 0.9
    },
    {
      processorId: "proc_gamma",
      processAuthorizations: ["metal_ore_refining"],
      certificationLevel: "L2",
      equipmentSpecs: "Crushing + flotation plant",
      complianceScore: 0.94
    },
    {
      processorId: "proc_delta",
      processAuthorizations: ["cotton_ginning"],
      certificationLevel: "L1",
      equipmentSpecs: "Saw gin line",
      complianceScore: 0.91
    },
    {
      processorId: "proc_epsilon",
      processAuthorizations: ["sugarcane_processing"],
      certificationLevel: "L2",
      equipmentSpecs: "Diffuser + clarifier mill",
      complianceScore: 0.92
    },
    {
      processorId: "proc_zeta",
      processAuthorizations: ["fruit_sorting_packaging", "sugarcane_processing"],
      certificationLevel: "L2",
      equipmentSpecs: "Packing lane + cane press",
      complianceScore: 0.93
    },
    {
      processorId: "proc_eta",
      processAuthorizations: ["metal_ore_refining", "coffee_bean_processing"],
      certificationLevel: "L2",
      equipmentSpecs: "Roaster + flotation circuit",
      complianceScore: 0.95
    },
    {
      processorId: "proc_theta",
      processAuthorizations: ["cotton_ginning", "grain_cleaning_drying"],
      certificationLevel: "L1",
      equipmentSpecs: "Saw gin + dryer line",
      complianceScore: 0.89
    },
    {
      processorId: "proc_iota",
      processAuthorizations: ["fruit_sorting_packaging"],
      certificationLevel: "L1",
      equipmentSpecs: "Vision sorter line",
      complianceScore: 0.9
    },
    {
      processorId: "proc_kappa",
      processAuthorizations: ["sugarcane_processing"],
      certificationLevel: "L1",
      equipmentSpecs: "Clarifier + evaporator train",
      complianceScore: 0.88
    }
  ];

  processors.forEach((processor) => store.registerProcessor(processor));

  const starterInputs = [
    ["proc_alpha", "grain_cleaning_drying", 1000, "farm_hash_001"],
    ["proc_zeta", "fruit_sorting_packaging", 900, "farm_hash_002"],
    ["proc_gamma", "metal_ore_refining", 1200, "mine_hash_003"],
    ["proc_beta", "coffee_bean_processing", 800, "farm_hash_004"],
    ["proc_delta", "cotton_ginning", 950, "farm_hash_005"],
    ["proc_epsilon", "sugarcane_processing", 1100, "farm_hash_006"]
  ];

  starterInputs.forEach(([ownerProcessorId, processType, quantity, originFarmHash]) => {
    store.mintInputMaterial({
      ownerProcessorId,
      processType,
      quantity,
      originFarmHash,
      qualityGrade: "A",
      moistureContent: 11.2
    });
  });
};
