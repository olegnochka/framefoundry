// Frame Foundry - "Buy as-is" buttons on builds.html (Stripe Checkout via /api/checkout).
// Hidden unless checkout is configured. While Stripe is in TEST mode they appear only with ?preview=1
// (remembered for this tab), so real visitors never meet a test checkout.
(function () {
  var builds = document.querySelectorAll("section.build[id]");
  if (!builds.length) return;
  var params = new URLSearchParams(location.search);
  try { if (params.get("preview") === "1") sessionStorage.setItem("ff-preview", "1"); } catch (e) {}
  var preview = false;
  try { preview = sessionStorage.getItem("ff-preview") === "1"; } catch (e) {}

  fetch("/api/checkout", { method: "GET" })
    .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
    .then(function (s) { if (s && s.enabled && (s.live || preview)) mount(!s.live); })
    .catch(function () {});

  function money(n) { return n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }

  function mount(testMode) {
    var dialog = document.createElement("dialog");
    dialog.className = "ffb-dialog";
    dialog.innerHTML =
      '<form method="dialog" class="ffb-form" novalidate>' +
      '<h2 class="ffb-title"></h2>' +
      (testMode ? '<p class="ffb-test">TEST MODE - use Stripe test card 4242 4242 4242 4242. No real money moves.</p>' : "") +
      '<p class="ffb-amount"></p>' +
      '<label class="ffb-label" for="ffb-zip">Delivery ZIP code</label>' +
      '<input id="ffb-zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" required>' +
      '<p class="ffb-hint">We deliver in the West San Fernando Valley and Conejo Valley. Outside that area, <a href="quote.html">send a quote request</a>.</p>' +
      '<label class="ffb-check"><input type="checkbox" name="agree" required><span>I agree to the <a href="terms.html" target="_blank" rel="noopener">terms</a> and <a href="warranty.html" target="_blank" rel="noopener">warranty</a>. The price shown is locked once I pay. If a part sells out, Frame Foundry contacts me with options (wait, an equal-or-better part at no extra cost, or a full refund) and never swaps without my OK.</span></label>' +
      '<p class="ffb-error" role="alert" hidden></p>' +
      '<div class="btn-row"><button class="btn ffb-go" value="go">Continue to secure checkout</button>' +
      '<button class="btn ghost" value="cancel" formnovalidate>Cancel</button></div>' +
      '<p class="ffb-hint">Payment is handled by Stripe. Sales tax is added at checkout. Delivery within 10 miles is free; in-home setup is optional and quoted separately.</p>' +
      "</form>";
    document.body.appendChild(dialog);

    var form = dialog.querySelector("form");
    var zip = dialog.querySelector("#ffb-zip");
    var agree = dialog.querySelector('input[name="agree"]');
    var err = dialog.querySelector(".ffb-error");
    var go = dialog.querySelector(".ffb-go");
    var current = null;

    function showError(msg, html) {
      err.hidden = false;
      if (html) err.innerHTML = msg; else err.textContent = msg;
    }

    builds.forEach(function (section) {
      var totalCell = section.querySelector("tr.total .num");
      var name = (section.querySelector("h2") || {}).textContent || "Build";
      if (!totalCell) return;
      var total = parseFloat(totalCell.textContent.replace(/[^0-9.]/g, ""));
      if (!total) return;
      var deposit = Math.round(total * 0.3 * 100) / 100;

      var box = document.createElement("div");
      box.className = "ffb-box";
      box.innerHTML =
        '<div><p class="ffb-box-title">Want this exact build?</p>' +
        '<p class="small muted" style="margin:0">' + money(total) + " before sales tax. Parts are ordered the day you pay; we schedule delivery with you.</p></div>" +
        '<div class="btn-row"><button type="button" class="btn" data-mode="deposit">Reserve with 30% deposit (' + money(deposit) + ")</button>" +
        '<button type="button" class="btn ghost" data-mode="full">Pay in full</button></div>';
      section.appendChild(box);

      box.querySelectorAll("button[data-mode]").forEach(function (b) {
        b.addEventListener("click", function () {
          var mode = b.getAttribute("data-mode");
          current = { build: section.id, mode: mode };
          dialog.querySelector(".ffb-title").textContent = name.trim() + (mode === "full" ? " - pay in full" : " - reserve with deposit");
          dialog.querySelector(".ffb-amount").textContent = mode === "full"
            ? "You pay " + money(total) + " + sales tax now."
            : "You pay " + money(deposit) + " + sales tax now, and the remaining " + money(Math.round((total - deposit) * 100) / 100) + " + tax when the PC is delivered and working.";
          err.hidden = true;
          go.disabled = false;
          go.textContent = "Continue to secure checkout";
          if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
          zip.focus();
        });
      });
    });

    form.addEventListener("submit", function (e) {
      var submitter = e.submitter;
      if (submitter && submitter.value === "cancel") return; // native dialog close
      e.preventDefault();
      err.hidden = true;
      var z = zip.value.trim();
      if (!/^\d{5}$/.test(z)) { showError("Please enter a 5-digit ZIP code."); zip.focus(); return; }
      if (!agree.checked) { showError("Please tick the box to accept the terms."); agree.focus(); return; }
      go.disabled = true;
      go.textContent = "Opening checkout...";
      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ build: current.build, mode: current.mode, zip: z, agreed: true }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.url) { location.href = data.url; return; }
          go.disabled = false;
          go.textContent = "Continue to secure checkout";
          if (data && data.error === "outside_area") {
            showError('That ZIP is outside our usual delivery area. <a href="quote.html">Send a quote request</a> and we\'ll check what\'s possible.', true);
          } else {
            showError((data && (data.error || data.message)) || "Checkout couldn't start. Please try again.");
          }
        })
        .catch(function () {
          go.disabled = false;
          go.textContent = "Continue to secure checkout";
          showError("Couldn't reach the server. Please check your connection and try again.");
        });
    });
  }
})();
