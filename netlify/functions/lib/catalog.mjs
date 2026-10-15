// The three "buy as-is" builds. Checkout prices come ONLY from here (never from the browser).
// Keep these in sync with public/builds.html - the price is the "Total before sales tax" row.
export const BUILDS = {
  mainstream: {
    name: "Mainstream build",
    summary: "Ryzen 5 9600X, Radeon RX 9060 XT 16GB, 16GB DDR5, 1TB SSD, Lancool 207, Windows 11 Home, standard assembly",
    totalCents: 186532,
  },
  performance: {
    name: "Performance build",
    summary: "Ryzen 5 9600X, Radeon RX 9070 XT 16GB, 32GB DDR5, 1TB SSD, Lancool 207, Windows 11 Home, standard assembly",
    totalCents: 247432,
  },
  "quiet-creator": {
    name: "Quiet Creator build",
    summary: "Ryzen 7 9800X3D, GeForce RTX 5070 Ti 16GB, 32GB DDR5, 2TB SSD, Fractal North, Windows 11 Home, premium quiet assembly",
    totalCents: 353777,
  },
};

export const DEPOSIT_RATE = 0.3;

export function depositCents(totalCents) {
  return Math.round(totalCents * DEPOSIT_RATE);
}

// Delivery area: West San Fernando Valley + Conejo Valley (see services.html). Outside these ZIPs we quote first.
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
]);

export function formatUSD(cents) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
