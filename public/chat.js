// Frame Foundry - AI chat bubble. Shows only when /api/chat reports it is set up.
// The conversation lives in this browser tab only (sessionStorage) and is sent to /api/chat each turn.
(function () {
  var KEY = "ff-chat-v1";
  var GREETING = "Hi! I'm Frame Foundry's AI assistant. Ask me about our builds, prices, delivery or warranty - or tell me what you play and your budget.";
  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) { history = []; }

  fetch("/api/chat", { method: "GET" })
    .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
    .then(function (s) { if (s && s.enabled) mount(); })
    .catch(function () {});

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // Minimal, safe formatting for assistant replies: **bold**, [text](url) links, bare URLs and the email address.
  // Everything is built with DOM nodes (never innerHTML), so a reply can't inject HTML.
  var TOKEN = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s)]+|hello@framefoundrypc\.com)/g;
  function link(text, href) {
    var a = el("a", null, text);
    a.href = href;
    if (!/^https:\/\/framefoundrypc\.com\//.test(href) && !/^mailto:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function renderText(node, text) {
    String(text).split(TOKEN).forEach(function (p) {
      if (!p) return;
      var m;
      if (/^\*\*[^*]+\*\*$/.test(p)) {
        node.appendChild(el("strong", null, p.slice(2, -2)));
      } else if ((m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/))) {
        node.appendChild(link(m[1], m[2]));
      } else if (/^https?:\/\//.test(p)) {
        node.appendChild(link(p.replace(/^https:\/\/framefoundrypc\.com\//, "").replace(/\.html$/, "") || p, p));
      } else if (p === "hello@framefoundrypc.com") {
        node.appendChild(link(p, "mailto:" + p));
      } else {
        node.appendChild(document.createTextNode(p));
      }
    });
  }

  function mount() {
    var btn = el("button", "ffc-bubble");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "ffc-panel");
    btn.innerHTML = '<span aria-hidden="true">&#128172;</span><span class="ffc-bubble-label">Ask us</span>';

    var panel = el("section", "ffc-panel");
    panel.id = "ffc-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Chat with Frame Foundry's AI assistant");

    var head = el("div", "ffc-head");
    var title = el("div", "ffc-title");
    title.appendChild(el("strong", null, "Frame Foundry"));
    title.appendChild(el("span", null, "AI assistant - Oleg reads every lead"));
    var close = el("button", "ffc-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close chat");
    head.appendChild(title);
    head.appendChild(close);

    var log = el("div", "ffc-log");
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");

    var form = el("form", "ffc-form");
    var input = el("textarea");
    input.rows = 1;
    input.maxLength = 2000;
    input.placeholder = "Type your question...";
    input.setAttribute("aria-label", "Your message");
    var send = el("button", "ffc-send", "Send");
    send.type = "submit";
    form.appendChild(input);
    form.appendChild(send);

    var note = el("p", "ffc-note");
    note.innerHTML = 'AI answers can be wrong - prices are confirmed in your quote. Don\'t share card numbers here. <a href="privacy.html">Privacy</a>';

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(form);
    panel.appendChild(note);
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function add(role, text) {
      var row = el("div", "ffc-msg ffc-" + role);
      renderText(row, text);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }

    add("assistant", GREETING);
    history.forEach(function (m) { add(m.role, m.content); });

    function open(state) {
      panel.hidden = !state;
      btn.setAttribute("aria-expanded", String(state));
      btn.classList.toggle("ffc-open", state);
      btn.querySelector(".ffc-bubble-label").textContent = state ? "Close" : "Ask us";
      if (state) setTimeout(function () { input.focus(); }, 30);
    }
    btn.addEventListener("click", function () { open(panel.hidden); });
    close.addEventListener("click", function () { open(false); btn.focus(); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { open(false); btn.focus(); } });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });

    var busy = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      send.disabled = true;
      input.value = "";
      add("user", text);
      history.push({ role: "user", content: text });
      var typing = add("assistant", "...");
      typing.classList.add("ffc-typing");

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-16), page: location.pathname }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          var reply = (data && data.reply) || "Sorry, something went wrong. Please use the quote form or email hello@framefoundrypc.com.";
          typing.remove();
          add("assistant", reply);
          if (data && data.reply) history.push({ role: "assistant", content: reply });
          else history.pop(); // keep user/assistant turns alternating for the next request
          try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-16))); } catch (err) {}
        })
        .catch(function () {
          typing.remove();
          history.pop();
          add("assistant", "I couldn't reach the server. Please check your connection, or use the quote form.");
        })
        .then(function () { busy = false; send.disabled = false; input.focus(); });
    });
  }
})();
