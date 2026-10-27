// The three "buy as-is" builds. Checkout prices come ONLY from here (never from the browser).
// Keep these in sync with public/builds.html - the price is the "Total before sales tax" row (the agreed set prices).
export const BUILDS = {
  mainstream: {
    name: "Mainstream build",
    summary: "Ryzen 5 9600X, Radeon RX 9060 XT 16GB, 16GB DDR5, 1TB SSD, Lancool 207, Windows 11 Home, standard assembly",
    totalCents: 199900,
  },
  performance: {
    name: "Performance build",
    summary: "Ryzen 5 9600X, Radeon RX 9070 XT 16GB, 32GB DDR5, 1TB SSD, Lancool 207, Windows 11 Home, standard assembly",
    totalCents: 259900,
  },
  "quiet-creator": {
    name: "Quiet Creator build",
    summary: "Ryzen 7 9800X3D, GeForce RTX 5070 Ti 16GB, 32GB DDR5, 2TB SSD, Fractal North, Windows 11 Home, premium quiet assembly",
    totalCents: 399900,
  },
};

export const DEPOSIT_RATE = 0.3;

export function depositCents(totalCents) {
  return Math.round(totalCents * DEPOSIT_RATE);
}

// Delivery area: San Fernando Valley, Conejo Valley, Simi Valley, Camarillo, Malibu and the Westside (see services.html). Outside these ZIPs we quote first.
export const SERVICE_ZIPS = new Set([
  // Canoga Park, Winnetka, West Hills, Woodland Hills, Tarzana, Reseda, Encino
  "91303", "91304", "91305", "91306", "91307", "91308", "91309", "91364", "91365", "91367", "91371",
  "91356", "91357", "91335", "91337", "91316", "91436",
  // Chatsworth, Northridge, Porter Ranch, Granada Hills, Van Nuys, Sherman Oaks
  "91311", "91313", "91324", "91325", "91326", "91327", "91328", "91330", "91343", "91344", "91406", "91411", "91403", "91423",
  // Calabasas, Hidden Hills, Agoura Hills, Oak Park, Westlake Village
  "91302", "91372", "91301", "91376", "91377", "91361", "91362",
  // Thousand Oaks, Newbury Park, Simi Valley, Moorpark
  "91320", "91358", "91359", "91360", "93063", "93065", "93062", "93064", "93094", "93021",
  // Added 2026-10-16 (Oleg's map): East Valley, Burbank, Malibu/Topanga, Westside, Camarillo
  // Van Nuys, Panorama City, Mission Hills, San Fernando, Pacoima/Arleta, Sylmar/Kagel Canyon/Lake View Terrace, Sun Valley, Sunland-Tujunga
  "91401", "91402", "91405", "91345", "91340", "91331", "91342", "91352", "91040", "91042",
  // North Hollywood, Valley Village, Toluca Lake, Studio City, Burbank
  "91601", "91602", "91605", "91606", "91607", "91604", "91501", "91502", "91504", "91505", "91506",
  // Topanga, Malibu, Pacific Palisades, Santa Monica, Brentwood, Westwood, Bel Air, West LA, Mar Vista, Marina del Rey
  "90290", "90265", "90272", "90401", "90402", "90403", "90404", "90405", "90049", "90024", "90077", "90025", "90064", "90066", "90292",
  // Beverly Hills, West Hollywood, Inglewood
  "90210", "90211", "90212", "90069", "90046", "90048", "90301", "90302", "90303", "90304", "90305",
  // Camarillo / Santa Rosa Valley, Somis
  "93010", "93012", "93066",
]);

export function formatUSD(cents) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Tune-up and Frame Foundry Care (services.html#care). Keep in sync with the services and terms pages.
export const SERVICES = {
  tuneup: {
    name: "Frame Foundry tune-up",
    description: "One in-home visit: dust cleaning, processor thermal paste, BIOS/driver/Windows updates, stress test and report.",
    amountCents: 7900,
  },
  care: {
    name: "Frame Foundry Care (yearly)",
    description:
      "Yearly plan: one tune-up per year, repair labor on PCs we built (20% off for other PCs), priority replies, 3 remote help sessions. Renews every year until cancelled.",
    amountCents: 9900,
    interval: "year",
  },
};
