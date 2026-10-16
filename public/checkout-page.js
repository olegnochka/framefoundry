// Frame Foundry - checkout page for the three example builds (checkout.html?build=<id>).
// Builds and prices come from GET /api/checkout (lib/catalog.mjs), never from this file.
// With Stripe on: pay a 30% deposit or in full through Stripe Checkout (/api/checkout).
// Test-mode Stripe is shown on the live site too, with a TEST MODE note (Oleg, 2026-10-16).
// Without Stripe: the order is sent as a request through the
// Netlify "quote" form (email + Slack #leads) and we arrange payment by email.
(function () {
  var root = document.getElementById("co");
  if (!root) return;
  var params = new URLSearchParams(location.search);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function money(c) { return (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }); }

  fetch("/api/checkout")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) {
      var builds = data.builds || [];
      var build = builds.filter(function (b) { return b.id === params.get("build"); })[0];
      if (!build) return chooser(builds);
      render(build, data.enabled, data.enabled && !data.live, (data.care && data.care.priceCents) || 9900);
    })
    .catch(function () {
      root.innerHTML = '<p class="muted">Checkout could not load. Please refresh, or email <a href="mailto:hello@framefoundrypc.com">hello@framefoundrypc.com</a>.</p>';
    });

  function chooser(builds) {
    root.textContent = "";
    root.appendChild(el("h2", null, "Which build would you like?"));
    var row = el("div", "btn-row");
    builds.forEach(function (b) {
      var a = el("a", "btn ghost", b.name.replace(" build", "") + " - " + money(b.totalCents));
      a.href = "checkout.html?build=" + encodeURIComponent(b.id);
      row.appendChild(a);
    });
    root.appendChild(row);
  }

  function render(b, payOnline, testMode, carePrice) {
    root.textContent = "";
    var grid = el("div", "co-grid");

    // Left: what you're buying.
    var card = el("section", "co-build");
    var img = el("img");
    img.src = "img/build-" + b.id + ".webp";
    img.alt = b.name;
    img.width = 1000; img.height = 914;
    card.appendChild(img);
    card.appendChild(el("h2", null, b.name));
    card.appendChild(el("p", "muted", b.summary));
    var more = el("a", null, "See every part and price");
    more.href = "builds.html#" + b.id;
    card.appendChild(more);
    var lines = el("dl", "co-lines");
    function line(k, v, cls) { var d = el("div", cls); d.appendChild(el("dt", null, k)); d.appendChild(el("dd", null, v)); lines.appendChild(d); }
    line("Build price", money(b.totalCents));
    var careLine = el("div"); careLine.appendChild(el("dt", null, "Frame Foundry Care (first year)")); careLine.appendChild(el("dd", null, money(carePrice))); careLine.hidden = true; lines.appendChild(careLine);
    line("Sales tax", payOnline ? "Added at checkout" : "Added to your invoice");
    line("Delivery", "Free within 10 miles, otherwise see services");
    line("Total before sales tax", money(b.totalCents), "is-total");
    var totalDd = lines.querySelector(".is-total dd");
    card.appendChild(lines);
    grid.appendChild(card);

    // Right: how to pay.
    var form = el("form", "co-form form-panel");
    form.noValidate = true;
    form.appendChild(el("h2", null, payOnline ? "Pay securely" : "Order this build"));
    if (payOnline && testMode) form.appendChild(el("p", "ffb-test", "TEST MODE - use Stripe test card 4242 4242 4242 4242. No real money moves."));

    var opts = el("fieldset", "co-opts");
    opts.appendChild(el("legend", null, "Payment"));
    [["deposit", "Reserve with a 30% deposit", money(b.depositCents) + " now, " + money(b.totalCents - b.depositCents) + " when the PC is delivered and working"],
     ["full", "Pay in full", money(b.totalCents) + " now"]].forEach(function (o, i) {
      var l = el("label", "co-opt");
      var r = el("input"); r.type = "radio"; r.name = "mode"; r.value = o[0]; r.checked = i === 0;
      var t = el("span"); t.appendChild(el("strong", null, o[1])); t.appendChild(el("span", "small muted", o[2] + " (+ sales tax)"));
      l.appendChild(r); l.appendChild(t); opts.appendChild(l);
    });
    form.appendChild(opts);

    // Optional Frame Foundry Care add-on (auto-renewing yearly plan) with its own renewal consent.
    var careBox = el("fieldset", "co-opts co-care");
    careBox.appendChild(el("legend", null, "Add-on"));
    var careLabel = el("label", "co-opt");
    var careCb = el("input"); careCb.type = "checkbox"; careCb.name = "care";
    var careTxt = el("span");
    careTxt.appendChild(el("strong", null, "Add Frame Foundry Care - " + money(carePrice) + " a year"));
    careTxt.appendChild(el("span", "small muted", "A yearly tune-up, free repair labor for as long as you stay on the plan, priority replies and remote help. The first year is charged together with your payment; it renews automatically, cancel any time."));
    var careMore = el("a", "small", "What's included"); careMore.href = "services.html#care-plan"; careMore.target = "_blank"; careMore.rel = "noopener";
    careTxt.appendChild(careMore);
    careLabel.appendChild(careCb); careLabel.appendChild(careTxt); careBox.appendChild(careLabel);
    var renewLabel = el("label", "ffb-check"); renewLabel.hidden = true;
    var renewCb = el("input"); renewCb.type = "checkbox";
    var renewTxt = el("span");
    renewTxt.innerHTML = "<strong>Automatic renewal:</strong> I understand Frame Foundry Care renews every year and my card is charged the yearly price (now " + money(carePrice) + " + any sales tax) on each renewal date until I cancel. I can cancel online or by email any time; I get a reminder email before each renewal. <a href=\"terms.html#care\" target=\"_blank\" rel=\"noopener\">Plan terms</a>.";
    renewLabel.appendChild(renewCb); renewLabel.appendChild(renewTxt); careBox.appendChild(renewLabel);
    form.appendChild(careBox);
    careCb.addEventListener("change", function () {
      renewLabel.hidden = !careCb.checked;
      if (!careCb.checked) renewCb.checked = false;
      careLine.hidden = !careCb.checked;
      totalDd.textContent = money(b.totalCents + (careCb.checked ? carePrice : 0));
    });

    function input(label, name, type, attrs) {
      var f = el("div", "field");
      var l = el("label", null, label); l.htmlFor = "co-" + name;
      var i = el(type === "textarea" ? "textarea" : "input"); if (type !== "textarea") i.type = type;
      i.id = "co-" + name; i.name = name;
      Object.keys(attrs || {}).forEach(function (k) { i[k] = attrs[k]; });
      f.appendChild(l); f.appendChild(i); form.appendChild(f);
      return i;
    }
    var name, email, phone, notes;
    if (!payOnline) {
      name = input("Your name", "name", "text", { autocomplete: "name" });
      email = input("Email", "email", "email", { autocomplete: "email" });
      phone = input("Phone (optional)", "phone", "tel", { autocomplete: "tel" });
    }
    var zip = input("Delivery ZIP code", "zip", "text", { inputMode: "numeric", maxLength: 5, autocomplete: "postal-code" });
    form.appendChild(el("p", "small muted", "We deliver across the San Fernando Valley, Conejo Valley, Simi Valley, Camarillo, Malibu and the Westside. Delivery is by hand, by appointment."));
    if (!payOnline) notes = input("Anything we should know? (optional)", "notes", "textarea");

    var agree = el("label", "ffb-check");
    var cb = el("input"); cb.type = "checkbox";
    var txt = el("span");
    txt.innerHTML = 'I agree to the <a href="terms.html" target="_blank" rel="noopener">terms</a> and <a href="warranty.html" target="_blank" rel="noopener">warranty</a>. The price shown is locked once I pay. If a part sells out, Frame Foundry contacts me with options (wait, an equal-or-better part at no extra cost, or a full refund) and never swaps without my OK.';
    agree.appendChild(cb); agree.appendChild(txt); form.appendChild(agree);

    var err = el("p", "ffb-error"); err.setAttribute("role", "alert"); err.hidden = true; form.appendChild(err);
    var go = el("button", "btn co-go", payOnline ? "Continue to secure payment" : "Send my order");
    go.type = "submit";
    form.appendChild(go);
    form.appendChild(el("p", "small muted", payOnline
      ? "Payment is handled by Stripe. You'll get a receipt by email, and we contact you within 24 hours to schedule delivery."
      : "No payment now. We confirm the parts are in stock and email you within 24 hours to arrange payment and delivery."));
    grid.appendChild(form);
    root.appendChild(grid);

    function fail(msg, html) { err.hidden = false; if (html) err.innerHTML = msg; else err.textContent = msg; go.disabled = false; go.textContent = payOnline ? "Continue to secure payment" : "Send my order"; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true;
      var mode = form.querySelector('input[name="mode"]:checked').value;
      var z = zip.value.trim();
      if (!payOnline && (!name.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim()))) return fail("Please enter your name and a valid email.");
      if (!/^\d{5}$/.test(z)) return fail("Please enter a 5-digit ZIP code.");
      if (careCb.checked && !renewCb.checked) return fail("Please tick the box to confirm the automatic yearly renewal for Frame Foundry Care.");
      if (!cb.checked) return fail("Please tick the box to accept the terms.");
      go.disabled = true;
      go.textContent = payOnline ? "Opening secure payment..." : "Sending...";

      if (payOnline) {
        fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ build: b.id, mode: mode, zip: z, agreed: true, care: careCb.checked, autorenew: renewCb.checked }) })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (data) {
            if (data.url) { location.href = data.url; return; }
            if (data.error === "outside_area") return fail('That ZIP is outside our usual delivery area. <a href="quote.html">Send a quote request</a> and we\'ll check what\'s possible.', true);
            fail(data.message || data.error || "Checkout couldn't start. Please try again.");
          })
          .catch(function () { fail("Couldn't reach the server. Please try again."); });
        return;
      }
      var body = new URLSearchParams({
        "form-name": "quote",
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        delivery_zip: z,
        request_type: "Order as-is: " + b.name + (careCb.checked ? " + Frame Foundry Care" : ""),
        budget: (mode === "full" ? "Pay in full " : "30% deposit ") + "- build price " + money(b.totalCents),
        games: "-",
        notes: (notes.value.trim() ? notes.value.trim() + "\n\n" : "") + "Order from the checkout page: " + b.name + " (" + money(b.totalCents) + " before tax), " + (mode === "full" ? "pay in full" : "30% deposit " + money(b.depositCents)) + ". " + (careCb.checked ? "ADD Frame Foundry Care (" + money(carePrice) + "/year, auto-renews; customer confirmed the automatic renewal). " : "No Care plan. ") + "Agreed to terms.",
      });
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          root.textContent = "";
          var done = el("div", "notice");
          done.appendChild(el("h2", null, "Order received - thank you!"));
          done.appendChild(el("p", null, "We'll email you within 24 hours to confirm the parts and arrange payment and delivery for your " + b.name + "."));
          root.appendChild(done);
        })
        .catch(function () { fail("Sending failed. Please try again or email hello@framefoundrypc.com."); });
    });
  }
})();
