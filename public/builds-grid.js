// Frame Foundry - filter tabs for the build cards on builds.html. Filters the cards and the matching parts-list sections.
(function () {
  var tabs = document.querySelectorAll(".ffg-tab");
  var grid = document.querySelector(".ffg-grid");
  if (!tabs.length || !grid) return;
  var cards = grid.querySelectorAll(".ffg-card");
  var sections = document.querySelectorAll("section.build[id]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var f = tab.getAttribute("data-filter");
      tabs.forEach(function (t) { var on = t === tab; t.classList.toggle("is-on", on); t.setAttribute("aria-pressed", String(on)); });
      cards.forEach(function (c) { c.hidden = f !== "all" && c.getAttribute("data-build") !== f; });
      sections.forEach(function (s) { s.hidden = f !== "all" && s.id !== f; });
      grid.classList.toggle("is-single", f !== "all");
    });
  });
  // "Configure & Buy" on a filtered-out section: show everything again first.
  document.querySelectorAll('.ffg a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (target && target.hidden) tabs[0].click();
    });
  });
})();
