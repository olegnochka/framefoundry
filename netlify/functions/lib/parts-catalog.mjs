// Curated parts for the PC builder (builder.html). Specs drive the compatibility checks in
// public/builder-compat.mjs; prices come live from the Best Buy Products API by `bestbuySku`.
// A part with no SKU, or one Best Buy no longer sells, is shown as unavailable.
// specsVerified: false = taken from our earlier research; confirm against the maker's spec page before launch.

export const PARTS = [
  // Processors
  { id: "cpu-9600x", category: "cpu", name: "AMD Ryzen 5 9600X", bestbuySku: null, specsVerified: false,
    specs: { socket: "AM5", cores: 6, tdpW: 65 } },
  { id: "cpu-9800x3d", category: "cpu", name: "AMD Ryzen 7 9800X3D", bestbuySku: null, specsVerified: false,
    specs: { socket: "AM5", cores: 8, tdpW: 120 } },

  // CPU coolers
  { id: "cooler-pa120se", category: "cooler", name: "Thermalright Peerless Assassin 120 SE", bestbuySku: null, specsVerified: false,
    specs: { sockets: ["AM5", "AM4", "LGA1700", "LGA1851"], heightMm: 155 } },
  { id: "cooler-drp5", category: "cooler", name: "be quiet! Dark Rock Pro 5", bestbuySku: null, specsVerified: false,
    specs: { sockets: ["AM5", "AM4", "LGA1700", "LGA1851"], heightMm: 168 } },

  // Motherboards
  { id: "mb-prime-b850-plus", category: "motherboard", name: "Asus PRIME B850-PLUS WIFI", bestbuySku: null, specsVerified: false,
    specs: { socket: "AM5", formFactor: "ATX", memoryType: "DDR5", memorySlots: 4, m2Slots: 3 } },

  // Memory
  { id: "ram-fury-16", category: "memory", name: "Kingston FURY Beast RGB 16GB (2x8GB) DDR5-6000", bestbuySku: null, specsVerified: false,
    specs: { type: "DDR5", modules: 2, capacityGb: 16, heightMm: 42 } },
  { id: "ram-vengeance-32", category: "memory", name: "Corsair Vengeance 32GB (2x16GB) DDR5-6000 CL36", bestbuySku: null, specsVerified: false,
    specs: { type: "DDR5", modules: 2, capacityGb: 32, heightMm: 35 } },

  // Graphics cards
  { id: "gpu-9060xt-pulse", category: "gpu", name: "Sapphire PULSE Radeon RX 9060 XT 16GB", bestbuySku: null, specsVerified: false,
    specs: { lengthMm: 240, boardPowerW: 160, recommendedPsuW: 500 } },
  { id: "gpu-9070xt-challenger", category: "gpu", name: "ASRock Challenger Radeon RX 9070 XT 16GB", bestbuySku: null, specsVerified: false,
    specs: { lengthMm: 291, boardPowerW: 304, recommendedPsuW: 750 } },
  { id: "gpu-5070ti-shadow", category: "gpu", name: "MSI SHADOW 3X OC GeForce RTX 5070 Ti 16GB", bestbuySku: null, specsVerified: false,
    specs: { lengthMm: 303, boardPowerW: 300, recommendedPsuW: 750 } },

  // Storage
  { id: "ssd-sn3000-1tb", category: "storage", name: "WD Green SN3000 1TB NVMe", bestbuySku: null, specsVerified: false,
    specs: { interface: "M.2", capacityGb: 1000 } },
  { id: "ssd-sn7100-2tb", category: "storage", name: "WD_BLACK SN7100 2TB NVMe", bestbuySku: null, specsVerified: false,
    specs: { interface: "M.2", capacityGb: 2000 } },

  // Power supplies
  { id: "psu-gf1-850", category: "psu", name: "Thermaltake Toughpower GF1 850W 80+ Gold, fully modular", bestbuySku: null, specsVerified: false,
    specs: { watts: 850 } },

  // Cases
  { id: "case-lancool-207", category: "case", name: "Lian Li Lancool 207", bestbuySku: null, specsVerified: false,
    specs: { formFactors: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuMm: 375, maxCoolerMm: 170 } },
  { id: "case-north", category: "case", name: "Fractal Design North (wood front)", bestbuySku: null, specsVerified: false,
    specs: { formFactors: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuMm: 355, maxCoolerMm: 170 } },

  // Operating system
  { id: "os-win11-home", category: "os", name: "Windows 11 Home", bestbuySku: null, specsVerified: false, specs: {} },
];

export const PARTS_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));
