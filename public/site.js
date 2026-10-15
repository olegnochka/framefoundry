// Frame Foundry - scroll reveals and a gentle hero parallax. No libraries.
// Does nothing under prefers-reduced-motion; without this file every element is simply visible.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var targets = document.querySelectorAll(
    "main h2, main .card, main .steps li, main .notice, main .build-head, main .table-scroll, " +
    "main .form-panel, main .narrow > p, main .narrow > ul, main .narrow > ol, main .narrow > img"
  );
  var fold = window.innerHeight;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  targets.forEach(function (el) {
    // Anything already on screen at load stays put - no flash of hidden content.
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add("reveal");
    // The parts list on builds.html slides in from the side.
    if (el.classList.contains("table-scroll")) el.classList.add("reveal-x");
    // Short stagger for siblings in a grid.
    var parent = el.parentElement;
    if (parent && (parent.classList.contains("grid") || parent.classList.contains("steps"))) {
      var i = Array.prototype.indexOf.call(parent.children, el);
      el.style.setProperty("--d", Math.min(i, 4) * 0.07 + "s");
    }
    io.observe(el);
  });

  // Hero parallax: the photo drifts slower than the page.
  var img = document.querySelector(".hero-media img");
  if (!img) return;
  var ticking = false;
  function update() {
    var y = Math.min(window.scrollY, window.innerHeight);
    img.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0) scale(1.06)";
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
})();
