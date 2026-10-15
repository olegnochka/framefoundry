// Frame Foundry - "Book a tune-up" and "Join Frame Foundry Care" buttons on services.html (Stripe Checkout via /api/care).
// Same rules as buy.js: hidden unless Stripe is configured; in TEST mode only with ?preview=1.
(function () {
  var slots = document.querySelectorAll(".ffcare-slot[data-plan]");
  var manage = document.getElementById("care-manage");
  if (!slots.length) return;
  var params = new URLSearchParams(location.search);
  try { if (params.get("preview") === "1") sessionStorage.setItem("ff-preview", "1"); } catch (e) {}
  var preview = false;
  try { preview = sessionStorage.getItem("ff-preview") === "1"; } catch (e) {}

  var PLANS = {
    tuneup: {
      button: "Book a tune-up - $79",
      title: "Book a tune-up",
      amount: "You pay $79 + any sales tax now. We email you within one business day to pick a visit time. Cancel before the visit for a full refund.",
      renew: false,
    },
    care: {
      button: "Join Frame Foundry Care - $99/year",
      title: "Join Frame Foundry Care",
      amount: "You pay $99 + any sales tax now for your first year.",
      renew: true,
    },
  };

  fetch("/api/care", { method: "GET" })
    .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
    .then(function (s) {
      if (!s || !s.enabled || !(s.live || preview)) return;
      mount(!s.live);
      if (manage && s.portal) {
        manage.textContent = "";
        manage.appendChild(document.createTextNode("Already a Care member? "));
        var a = document.createElement("a");
        a.href = s.portal; a.target = "_blank"; a.rel = "noopener";
        a.textContent = "Manage or cancel your plan online";
        manage.appendChild(a);
        manage.appendChild(document.createTextNode(" (you get a sign-in code by email), or email hello@framefoundrypc.com."));
      }
    })
    .catch(function () {});

  function mount(testMode) {
    var dialog = document.createElement("dialog");
    dialog.className = "ffb-dialog";
    dialog.innerHTML =
      '<form method="dialog" class="ffb-form" novalidate>' +
      '<h2 class="ffb-title"></h2>' +
      (testMode ? '<p class="ffb-test">TEST MODE - use Stripe test card 4242 4242 4242 4242. No real money moves.</p>' : "") +
      '<p class="ffb-amount"></p>' +
      '<label class="ffb-label" for="ffc-zip">ZIP code where the PC is</label>' +
      '<input id="ffc-zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" required>' +
      '<p class="ffb-hint">Visits are in the West San Fernando Valley and Conejo Valley. Elsewhere, <a href="quote.html">send a quote request</a>.</p>' +
      '<label class="ffb-check ffc-renew"><input type="checkbox" name="autorenew"><span><strong>Automatic renewal:</strong> I understand Frame Foundry Care renews every year and my card is charged the yearly price (now $99 + any sales tax) on each renewal date until I cancel. I can cancel online or by email any time; I get a reminder email before each renewal.</span></label>' +
      '<label class="ffb-check"><input type="checkbox" name="agree"><span>I agree to the <a href="terms.html#care" target="_blank" rel="noopener">terms</a>.</span></label>' +
      '<p class="ffb-error" role="alert" hidden></p>' +
      '<div class="btn-row"><button class="btn ffb-go" value="go">Continue to secure checkout</button>' +
      '<button class="btn ghost" value="cancel" formnovalidate>Cancel</button></div>' +
      '<p class="ffb-hint">Payment is handled by Stripe.</p>' +
      "</form>";
    document.body.appendChild(dialog);

    var form = dialog.querySelector("form");
    var zip = dialog.querySelector("#ffc-zip");
    var agree = dialog.querySelector('input[name="agree"]');
    var renewRow = dialog.querySelector(".ffc-renew");
    var renew = dialog.querySelector('input[name="autorenew"]');
    var err = dialog.querySelector(".ffb-error");
    var go = dialog.querySelector(".ffb-go");
    var current = null;

    function showError(msg, html) { err.hidden = false; if (html) err.innerHTML = msg; else err.textContent = msg; }
    function reset() { go.disabled = false; go.textContent = "Continue to secure checkout"; }

    slots.forEach(function (slot) {
      var id = slot.getAttribute("data-plan");
      var p = PLANS[id];
      if (!p) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = id === "care" ? "btn" : "btn ghost";
      b.textContent = p.button;
      slot.appendChild(b);
      b.addEventListener("click", function () {
        current = id;
        dialog.querySelector(".ffb-title").textContent = p.title;
        dialog.querySelector(".ffb-amount").textContent = p.amount;
        renewRow.hidden = !p.renew;
        renew.checked = false;
        agree.checked = false;
        err.hidden = true;
        reset();
        if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
        zip.focus();
      });
    });

    form.addEventListener("submit", function (e) {
      if (e.submitter && e.submitter.value === "cancel") return;
      e.preventDefault();
      err.hidden = true;
      var z = zip.value.trim();
      if (!/^\d{5}$/.test(z)) { showError("Please enter a 5-digit ZIP code."); zip.focus(); return; }
      if (PLANS[current].renew && !renew.checked) { showError("Please tick the box to confirm the automatic yearly renewal."); renew.focus(); return; }
      if (!agree.checked) { showError("Please tick the box to accept the terms."); agree.focus(); return; }
      go.disabled = true;
      go.textContent = "Opening checkout...";
      fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: current, zip: z, agreed: true, autorenew: renew.checked }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.url) { location.href = data.url; return; }
          reset();
          if (data && data.error === "outside_area") {
            showError('That ZIP is outside our usual service area. <a href="quote.html">Send a quote request</a> and we\'ll check what\'s possible.', true);
          } else {
            showError((data && (data.error || data.message)) || "Checkout couldn't start. Please try again.");
          }
        })
        .catch(function () { reset(); showError("Couldn't reach the server. Please check your connection and try again."); });
    });
  }
})();
