// Frame Foundry - "Order this build" box under each example build on builds.html.
// Ordering (Stripe payment, or an order request while online payment is off) happens on checkout.html.
(function () {
  document.querySelectorAll("section.build[id]").forEach(function (section) {
    var totalCell = section.querySelector("tr.total .num");
    if (!totalCell) return;
    var box = document.createElement("div");
    box.className = "ffb-box";
    box.innerHTML =
      '<div><p class="ffb-box-title">Want this exact build?</p>' +
      '<p class="small muted" style="margin:0">' + totalCell.textContent.trim() + " before sales tax. Reserve with a 30% deposit or pay in full.</p></div>" +
      '<div class="btn-row"><a class="btn" href="checkout.html?build=' + encodeURIComponent(section.id) + '">Order this build</a></div>';
    section.appendChild(box);
  });
})();
