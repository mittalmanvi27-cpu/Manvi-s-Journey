(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- Theme (dark by default) ---------- */
  const root = document.documentElement;
  root.dataset.theme = store.get("theme", "dark");
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    store.set("theme", root.dataset.theme);
  });

  /* ---------- Intro ---------- */
  const ready = () => document.body.classList.add("is-ready");
  (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(ready, 80));
  setTimeout(ready, 1200);
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Local time in India ---------- */
  const clock = $("#clock");
  const tickClock = () => {
    clock.textContent = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }) + " IST";
  };
  tickClock(); setInterval(tickClock, 30000);

  /* ---------- Count-up numbers (run when visible) ---------- */
  function countUp(el) {
    const end = +el.dataset.count, dur = 1500, t0 = performance.now();
    if (reduceMotion) { el.textContent = end; return; }
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const countIO = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { countUp(en.target); countIO.unobserve(en.target); }
  }), { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Slideshows (hero + Ramaya case) ---------- */
  function slideshow({ view, urlEl, urls, tabs, phone, phoneMap, interval = 4000 }) {
    const imgs = $$("img", view);
    let i = 0, timer = null, visible = false, hovered = false;
    const phoneImgs = phone ? $$("img", phone) : [];
    function show(n) {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
      if (urlEl) urlEl.textContent = urls[i];
      if (tabs) $$("button", tabs).forEach((b, k) => {
        b.classList.toggle("is-active", k === i);
        if (k === i) { b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; }
      });
      if (phoneImgs.length && phoneMap[i] !== undefined) phoneImgs.forEach((im, k) => im.classList.toggle("is-on", k === phoneMap[i]));
    }
    const run = () => { clearInterval(timer); if (visible && !hovered && !reduceMotion) timer = setInterval(() => show(i + 1), interval); };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; run(); }, { threshold: 0.3 }).observe(view);
    const hoverZone = view.closest(".lab__stage, .compact__media");
    hoverZone.addEventListener("pointerenter", () => { hovered = true; tabs?.classList.add("is-paused"); run(); });
    hoverZone.addEventListener("pointerleave", () => { hovered = false; tabs?.classList.remove("is-paused"); run(); });
    if (tabs) {
      tabs.style.setProperty("--dur", interval + "ms");
      $$("button", tabs).forEach((b, k) => b.addEventListener("click", () => { show(k); run(); }));
    }
    return { show };
  }
  slideshow({
    view: $("#labView"), urlEl: $("#labUrl"), tabs: $("#labTabs"), interval: 4200,
    urls: ["127.0.0.1:8000", "127.0.0.1:8000", "127.0.0.1:8000/docs", "127.0.0.1:8000"],
  });
  slideshow({
    view: $("#ramayaView"), urlEl: $("#ramayaUrl"), interval: 3600,
    urls: ["ramaya-ten.vercel.app", "ramaya-ten.vercel.app/venues", "ramaya-ten.vercel.app/gastronomy"],
  });

  /* ---------- Pinboard ---------- */
  const board = $("#masonry");
  const starred = new Set(store.get("savedPins", []));
  const starCount = $("#starCount");
  const updateCount = () => { starCount.textContent = starred.size; };
  const starBtn = (id) => `<button class="pin__star ${starred.has(id) ? "is-starred" : ""}" aria-label="Save pin">${starred.has(id) ? "★ saved" : "☆ save"}</button>`;

  function pinHTML(p) {
    if (p.type === "shot") {
      return `<article class="pin ${p.tall ? "pin--tall" : ""}" data-id="${p.id}" data-cat="${p.cat}" tabindex="0" aria-label="${p.title} — open screenshot">
        <div class="pin__media" data-view>
          <img src="${p.img}" alt="${p.title}" loading="lazy" width="${p.w}" height="${p.h}" />
          ${starBtn(p.id)}
          <span class="pin__url">${p.url}</span>
        </div>
        <div class="pin__meta"><h3>${p.title}</h3><span>${p.tall ? "mobile" : "desktop"}</span></div>
      </article>`;
    }
    const body = p.items ? `<div class="tags">${p.items.map((t) => `<span>${t}</span>`).join("")}</div>`
      : p.list ? `<ul>${p.list.map((t) => { const [a, b] = t.split(" — "); return `<li>${a}<span>${b || ""}</span></li>`; }).join("")}</ul>`
      : `<p>${p.text}</p>`;
    return `<article class="pin pin--note" data-id="${p.id}" data-cat="${p.cat}">
      <div class="note">${starBtn(p.id)}<p class="note__kicker">${p.kicker}</p><h3>${p.title}</h3>${body}</div>
    </article>`;
  }
  board.innerHTML = PINS.map(pinHTML).join("");
  updateCount();

  let currentFilter = "all";
  board.addEventListener("click", (e) => {
    const btn = e.target.closest(".pin__star");
    if (btn) {
      e.stopPropagation();
      const id = btn.closest(".pin").dataset.id;
      starred.has(id) ? starred.delete(id) : starred.add(id);
      btn.classList.toggle("is-starred", starred.has(id));
      btn.textContent = starred.has(id) ? "★ saved" : "☆ save";
      btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
      store.set("savedPins", [...starred]);
      updateCount();
      if (currentFilter === "saved") applyFilter("saved");
      return;
    }
    const pin = e.target.closest(".pin");
    if (pin && pin.querySelector("[data-view]")) openPin(pin.dataset.id);
  });
  board.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList.contains("pin") && e.target.querySelector("[data-view]")) openPin(e.target.dataset.id);
  });
  document.addEventListener("pointermove", (e) => {
    const note = e.target.closest(".note, .tile");
    if (!note) return;
    const r = note.getBoundingClientRect();
    note.style.setProperty("--x", e.clientX - r.left + "px");
    note.style.setProperty("--y", e.clientY - r.top + "px");
  });

  function applyFilter(f) {
    currentFilter = f;
    let n = 0;
    $$(".pin", board).forEach((c) => {
      const show = f === "all" || (f === "saved" ? starred.has(c.dataset.id) : c.dataset.cat === f);
      c.classList.toggle("is-hidden", !show);
      if (show) { c.classList.remove("is-in"); const k = n++; setTimeout(() => c.classList.add("is-in"), 30 + k * 45); }
    });
  }
  $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
    $$(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
    applyFilter(chip.dataset.filter);
  }));

  /* ---------- Lightbox ---------- */
  const modal = $("#modal"), mCard = $(".modal__card"), mMedia = $("#modalMedia");
  let lastFocus = null, openId = null;
  const shots = () => PINS.filter((p) => p.type === "shot");
  function openPin(id) {
    const p = PINS.find((x) => x.id === id);
    if (!p) return;
    if (!modal.classList.contains("is-open")) lastFocus = document.activeElement;
    openId = id;
    const isShot = p.type === "shot";
    mCard.classList.toggle("is-note", !isShot);
    mMedia.className = "modal__media" + (p.tall ? " is-tall" : "");
    mMedia.innerHTML = isShot ? `<img src="${p.img}" alt="${p.title}" />` : "";
    $("#modalKicker").textContent = isShot ? p.project + " · " + (p.tall ? "mobile" : "desktop") : p.kicker;
    $("#modalTitle").textContent = p.title;
    if (isShot) {
      const list = shots(), idx = list.indexOf(p);
      $("#modalContent").innerHTML = `
        ${p.note ? `<p>${p.note}</p>` : ""}
        <div class="modal__url">${p.url}</div>
        ${p.live ? `<a class="btn btn--accent btn--sm" href="https://${p.url}" target="_blank" rel="noopener">Open live page ↗</a>` : `<span class="mono dim" style="font-size:12px">running locally · FastAPI</span>`}
        <div class="modal__nav"><button data-step="-1">← prev</button><button data-step="1">next →</button><span class="mono dim" style="margin-left:auto;font-size:12px;align-self:center">${idx + 1} / ${list.length}</span></div>`;
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal__close").focus({ preventScroll: true });
  }
  function openImage(src, title) {
    lastFocus = document.activeElement; openId = null;
    mCard.classList.remove("is-note");
    mMedia.className = "modal__media";
    mMedia.innerHTML = `<img src="${src}" alt="${title}" style="background:#fff" />`;
    $("#modalKicker").textContent = "newslens · evaluation";
    $("#modalTitle").textContent = title;
    $("#modalContent").innerHTML = `<p>Rows are the true topic, columns the predicted one — the bright diagonal is correct predictions on 2,282 held-out documents.</p>`;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal__close").focus({ preventScroll: true });
  }
  $$("[data-lightbox]").forEach((b) => b.addEventListener("click", () => openImage(b.dataset.lightbox, b.dataset.title)));

  function step(d) {
    if (!openId) return;
    const list = shots(), idx = list.findIndex((p) => p.id === openId);
    if (idx > -1) openPin(list[(idx + d + list.length) % list.length].id);
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus?.focus({ preventScroll: true });
  }
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
    const s = e.target.closest("[data-step]");
    if (s) step(+s.dataset.step);
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const pins = el.classList.contains("pin") ? $$(".pin:not(.is-hidden)", board) : [];
      const delay = pins.length ? (pins.indexOf(el) % 3) * 90 : 0;
      setTimeout(() => el.classList.add("is-in"), delay);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal, .pin").forEach((el) => io.observe(el));

  /* ---------- Scroll: progress, nav, active link, FAB ---------- */
  const nav = $("#nav"), fab = $(".fab"), aiSec = $("#ai"), progress = $("#progress");
  const sections = $$("main section[id]");
  let lastY = 0, ticking = false;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? y / max : 0);
    nav.classList.toggle("is-hidden", y > lastY && y > 500 && !modal.classList.contains("is-open"));
    lastY = y;
    const a = aiSec.getBoundingClientRect();
    fab.classList.toggle("is-shown", y > 800 && (a.top > innerHeight || a.bottom < 0));
    let current = "";
    sections.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id; });
    $$(".nav__links a").forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + current));
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Pointer effects (desktop) ---------- */
  if (finePointer && !reduceMotion) {
    const spot = $(".spot"), label = $("#cursorLabel");
    addEventListener("pointermove", (e) => {
      spot.style.setProperty("--mx", e.clientX + "px");
      spot.style.setProperty("--my", e.clientY + "px");
      label.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      const onShot = e.target.closest("[data-view]") && !e.target.closest(".pin__star");
      label.classList.toggle("is-on", !!onShot);
    });

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Copy email ---------- */
  $("#copyBtn").addEventListener("click", async () => {
    const btn = $("#copyBtn"), label = $("#copyLabel");
    try { await navigator.clipboard.writeText(PROFILE.email); label.textContent = "copied ✓"; }
    catch { label.textContent = PROFILE.email; }
    btn.classList.add("is-copied");
    setTimeout(() => { label.textContent = "copy"; btn.classList.remove("is-copied"); }, 1800);
  });

  /* ---------- AI chat ---------- */
  const log = $("#chatLog"), form = $("#chatForm"), input = $("#chatInput"), status = $("#chatStatus");
  const history = [];
  const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function addMsg(html, who) {
    const div = document.createElement("div");
    div.className = `msg msg--${who}`;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function localAnswer(q) {
    const text = q.toLowerCase();
    const hit = (k) => {
      const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // short keys must be whole words; longer keys can be stems ("educat" → education)
      return new RegExp(k.length <= 3 ? `\\b${esc}\\b` : `\\b${esc}`).test(text);
    };
    let best = null, score = 0;
    for (const item of KB) {
      const s = item.k.reduce((acc, k) => acc + (hit(k) ? k.length : 0), 0);
      if (s > score) { score = s; best = item; }
    }
    return best ? best.a
      : "Good question — that one isn't in my résumé notes. Manvi would be happy to answer directly: <a href='mailto:manviamittal7@gmail.com'>manviamittal7@gmail.com</a>. You can also ask about her skills, projects, experience or education.";
  }

  // Tries the Gemini-powered serverless endpoint (api/chat.js on Vercel); falls back to local answers.
  async function remoteAnswer(q) {
    if (location.protocol === "file:") return null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history: history.slice(-8) }), signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      return data.reply ? escapeHTML(data.reply).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br/>") : null;
    } catch { return null; }
  }

  async function typeInto(el, html) {
    if (reduceMotion) { el.innerHTML = html; return; }
    const tokens = html.match(/<[^>]+>|[^<\s]+|\s+/g) || [];
    let out = "";
    for (const t of tokens) {
      out += t;
      if (t.startsWith("<") || /^\s+$/.test(t)) continue;
      el.innerHTML = out;
      log.scrollTop = log.scrollHeight;
      await sleep(22);
    }
    el.innerHTML = html;
  }

  let busy = false;
  async function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    addMsg(escapeHTML(q), "user");
    input.value = "";
    const bubble = addMsg(`<span class="typing"><i></i><i></i><i></i></span>`, "ai");
    status.textContent = "● thinking…";
    const [remote] = await Promise.all([remoteAnswer(q), sleep(550)]);
    const answer = remote || localAnswer(q);
    history.push({ role: "user", text: q }, { role: "model", text: answer.replace(/<[^>]+>/g, "") });
    await typeInto(bubble, answer);
    status.textContent = "● ready";
    busy = false;
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
  $$("#suggest button").forEach((b) => b.addEventListener("click", () => ask(b.textContent.replace(/^›/, ""))));

  let greeted = false;
  new IntersectionObserver(([en], obs) => {
    if (en.isIntersecting && !greeted) {
      greeted = true; obs.disconnect();
      const b = addMsg(`<span class="typing"><i></i><i></i><i></i></span>`, "ai");
      setTimeout(() => typeInto(b, "Hi 👋 Ask me about Manvi's <b>stack</b>, <b>projects</b>, <b>experience</b> — or whether she's <b>open to work</b>."), 600);
    }
  }, { threshold: 0.4 }).observe($("#chat"));
})();
