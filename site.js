/* ==========================================================
   الصفحة الرئيسية
   - بتقرا المحتوى والفيديوهات والنتايج من Firestore
   - بترتّب الشغل حسب المجال وبتشغّل الفيديو في مشغّل جوه الموقع
   - التايم لاين: كل قسم في الصفحة كليب، والـ playhead بيمشي مع السكرول
   ========================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = escapeHtml;
  const DEMO = window.RYDEN_DEMO || null;

  function getDb() {
    try { return db; } catch (e) { return null; } // لو Firebase ماتحمّلش
  }

  async function loadContent() {
    if (DEMO) return DEMO.content || {};
    const d = getDb();
    if (!d) throw new Error("Firestore مش متاح");
    const snap = await d.collection("site").doc("content").get();
    return snap.exists ? snap.data() : {};
  }

  async function loadList(name) {
    if (DEMO) return (DEMO[name] || []).map((x) => ({ ...x }));
    const d = getDb();
    if (!d) throw new Error("Firestore مش متاح");
    const snap = await d.collection(name).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  const uniq = (arr) => Array.from(new Set(arr));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ======================================================
     1) لحظة التلوين في الصورة الرئيسية
     ====================================================== */
  const body = document.body;
  const monitor = $("#monitor");
  let gradeStarted = false;

  function startGrade() {
    if (gradeStarted) return;
    gradeStarted = true;
    const img = $("#heroPhoto");
    const go = () => {
      body.classList.remove("is-loading");
      requestAnimationFrame(() => monitor && monitor.classList.add("play"));
    };
    if (img.complete && img.naturalWidth) go();
    else {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
    }
  }

  function setPhoto(url) {
    if (!url) return;
    $$(".js-photo").forEach((img) => { if (img.getAttribute("src") !== url) img.src = url; });
  }

  /* ======================================================
     2) المحتوى (الاسم، الجملة الرئيسية، النبذة، الخدمات...)
     ====================================================== */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el && typeof val === "string" && val.trim()) el.textContent = val.trim();
  }

  function paragraphs(text) {
    return String(text)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");
  }

  function setMetaRow(key, val) {
    const row = document.getElementById(`${key}Row`);
    const el = document.getElementById(key);
    if (!row || !el) return;
    const v = typeof val === "string" ? val.trim() : "";
    row.hidden = !v;
    if (v) el.textContent = v;
  }

  function applyContent(c) {
    setText("heroName", c.nameAr);
    setText("heroRole", c.roleAr);
    setText("heroHeadline", c.headline);
    setText("heroTagline", c.tagline);
    setText("bioQuote", c.quote);
    if (typeof c.bio === "string" && c.bio.trim()) $("#bioBody").innerHTML = paragraphs(c.bio);

    if (Array.isArray(c.services) && c.services.some((s) => s && s.title)) {
      $("#servicesList").innerHTML = c.services
        .filter((s) => s && s.title)
        .map((s) => `<div class="svc"><h3>${esc(s.title)}</h3>${s.desc ? `<p>${esc(s.desc)}</p>` : ""}</div>`)
        .join("");
    }

    // الحقول الاختيارية: لو اتمسحت من لوحة التحكم بتختفي، ولو عمرها ما اتحفظت بياخد الافتراضي
    const optional = (key) => (typeof c[key] === "string" ? c[key] : RYDEN_DEFAULTS[key] || "").trim();
    setMetaRow("metaExp", optional("experience"));
    setMetaRow("metaTools", optional("tools"));
    setText("metaAvail", c.availability);

    const reelUrl = optional("showreelUrl");
    if (reelUrl) setupReel(reelUrl, c.showreelCover);
  }

  /* ======================================================
     3) الشغل: كروت + فلترة حسب المجال + مشغّل الفيديو
     ====================================================== */
  const grid = $("#worksGrid");
  const filters = $("#filters");
  let allVideos = [];
  let visibleVideos = [];

  function prepVideo(v) {
    const parsed = v.url ? parseVideoUrl(v.url) : null;
    const platform = v.platform || (parsed && parsed.platform) || "";
    const embedId = v.embedId || (parsed && parsed.embedId) || "";
    const orientation = v.orientation || (parsed && parsed.orientation) || "v";
    const title = String(v.title || "").trim();
    const client = String(v.client || "").trim() || deriveClient(title);
    const category = String(v.category || "").trim() || deriveCategory(`${title} ${client}`) || OTHER_CATEGORY;
    return { ...v, platform, embedId, orientation, title, client, category, color: categoryColor(category) };
  }

  const heading = (v) => v.client || v.title || "فيديو";
  const PLATFORM_ICON = { youtube: "i-yt", tiktok: "i-tiktok", instagram: "i-ig" };

  function cardHtml(v, i) {
    const thumbs = thumbCandidates(v);
    const icon = PLATFORM_ICON[v.platform];
    // في المعاينة بس: الفيديو بيفتح في تاب جديدة بدل المشغّل
    const tag = DEMO && DEMO.linkOut ? `a href="${esc(watchUrl(v))}" target="_blank" rel="noopener"` : `button type="button"`;
    const end = DEMO && DEMO.linkOut ? "a" : "button";
    return `
      <${tag} class="work" data-i="${i}" style="--c:${v.color}" aria-label="شغّل فيديو ${esc(heading(v))}، ${esc(v.category)}">
        <span class="work-fallback" aria-hidden="true"></span>
        ${thumbs.length ? `<img class="work-img" src="${esc(thumbs[0])}" data-next="${esc(thumbs.slice(1).join("|"))}" alt="" loading="lazy" decoding="async"/>` : ""}
        ${icon ? `<span class="work-plat" aria-hidden="true"><svg class="ic"><use href="#${icon}"/></svg></span>` : ""}
        <span class="work-play" aria-hidden="true"><svg class="ic"><use href="#i-play"/></svg></span>
        <span class="work-meta">
          <span class="work-client">${esc(heading(v))}</span>
          <span class="work-cat"><i></i>${esc(v.category)}</span>
        </span>
      </${end}>`;
  }

  /* لو الصورة المصغّرة مافتحتش، نجرب اللي بعدها، ولو خلصوا نسيب الخلفية الملونة */
  function wireThumbs(root) {
    $$(".work-img, .reel-img", root).forEach((img) => {
      const tryNext = () => {
        const rest = (img.dataset.next || "").split("|").filter(Boolean);
        if (rest.length) {
          img.dataset.next = rest.slice(1).join("|");
          img.src = rest[0];
        } else {
          const reel = img.closest(".reel");
          if (reel) reel.classList.remove("has-img");
          img.remove();
        }
      };
      img.addEventListener("error", tryNext);
      img.addEventListener("load", () => {
        // يوتيوب بيرجّع صورة رمادي 120px لما الصورة مش موجودة
        if (img.naturalWidth && img.naturalWidth <= 120) tryNext();
      });
    });
  }

  function renderFilters(videos) {
    const counts = new Map();
    videos.forEach((v) => counts.set(v.category, (counts.get(v.category) || 0) + 1));
    const cats = Array.from(counts.entries()).sort(
      (a, b) => (a[0] === OTHER_CATEGORY) - (b[0] === OTHER_CATEGORY) || b[1] - a[1]
    );
    if (cats.length < 2) { filters.hidden = true; return; }
    const chip = (key, label, count, color, on) =>
      `<button class="chip" type="button" data-cat="${esc(key)}" aria-pressed="${on}"${color ? ` style="--c:${color}"` : ""}>${color ? "<i></i>" : ""}${esc(label)}<small>${count}</small></button>`;
    filters.innerHTML =
      chip("*", "الكل", videos.length, null, true) +
      cats.map(([name, n]) => chip(name, name, n, categoryColor(name), false)).join("");
    filters.hidden = false;
  }

  function applyFilter(cat) {
    $$(".chip", filters).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === cat)));
    visibleVideos = [];
    $$(".work", grid).forEach((card) => {
      const v = allVideos[+card.dataset.i];
      const show = cat === "*" || v.category === cat;
      card.hidden = !show;
      if (show) visibleVideos.push(v);
    });
    scheduleMeasure();
  }

  function renderWorks(videos) {
    allVideos = videos;
    visibleVideos = videos.slice();
    if (!videos.length) {
      grid.innerHTML = "";
      $("#worksEmpty").hidden = false;
      return;
    }
    grid.innerHTML = videos.map(cardHtml).join("");
    wireThumbs(grid);
    renderFilters(videos);
  }

  grid.addEventListener("click", (e) => {
    const card = e.target.closest("button.work[data-i]");
    if (!card) return;
    const v = allVideos[+card.dataset.i];
    openPlayer(visibleVideos, visibleVideos.indexOf(v));
  });

  filters.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) applyFilter(chip.dataset.cat);
  });

  /* ---------- الـ Showreel (اختياري) ---------- */
  function setupReel(url, cover) {
    const p = parseVideoUrl(url);
    if (!p) return;
    const v = prepVideo({
      url, platform: p.platform, embedId: p.embedId, embedUrl: p.embedUrl, orientation: p.orientation,
      client: "Showreel", category: "أحسن لقطات من شغلي",
    });
    let reel = $("#reel");
    if (DEMO && DEMO.linkOut) {
      // المعاينة مش بتقدر تشغّل فيديو جواها، فالـ Showreel بيفتح في تاب جديدة
      const a = document.createElement("a");
      a.className = reel.className;
      a.id = "reel";
      a.href = watchUrl(v);
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = reel.innerHTML;
      reel.replaceWith(a);
      reel = a;
    }
    reel.setAttribute("aria-label", "شغّل الـ Showreel");
    const img = $(".reel-img", reel);
    const thumbs = cover ? [cover] : thumbCandidates({ ...v, orientation: "h" });
    if (thumbs.length && img) {
      img.src = thumbs[0];
      img.dataset.next = thumbs.slice(1).join("|");
      reel.classList.add("has-img");
      wireThumbs(reel);
    } else if (img) img.remove();
    reel.hidden = false;
    if (!(DEMO && DEMO.linkOut)) reel.onclick = () => openPlayer([v], 0);
  }

  /* ---------- المشغّل ---------- */
  const player = $("#player");
  const frame = $("#playerFrame");
  let pList = [];
  let pIndex = 0;

  function openPlayer(list, i) {
    if (!list.length || i < 0) return;
    pList = list;
    pIndex = i;
    renderPlayer();
    if (!player.open) {
      if (typeof player.showModal === "function") player.showModal();
      else player.setAttribute("open", "");
    }
  }

  function renderPlayer() {
    const v = pList[pIndex];
    if (!v) return;
    frame.classList.toggle("is-h", v.orientation === "h" && v.platform !== "instagram");
    frame.classList.toggle("is-ig", v.platform === "instagram");
    frame.innerHTML = `<iframe src="${esc(playerUrl(v))}" title="${esc(heading(v))}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>`;
    $("#playerClient").textContent = heading(v);
    $("#playerCat").textContent = v.category;
    $("#playerDot").style.setProperty("--c", v.color);
    const open = $("#playerOpen");
    const w = watchUrl(v);
    open.hidden = !(w && v.platform && v.platform !== "drive");
    if (!open.hidden) {
      open.href = w;
      $("#playerPlat").textContent = PLATFORM_NAMES[v.platform] || "المنصة";
    }
    const single = pList.length < 2;
    $("#playerPrev").hidden = single;
    $("#playerNext").hidden = single;
    $("#playerPrev").disabled = pIndex <= 0;
    $("#playerNext").disabled = pIndex >= pList.length - 1;
  }

  function step(d) {
    const n = pIndex + d;
    if (n < 0 || n >= pList.length) return;
    pIndex = n;
    renderPlayer();
  }

  function closePlayer() {
    if (typeof player.close === "function") player.close();
    else player.removeAttribute("open");
  }

  $("#playerPrev").addEventListener("click", () => step(-1));
  $("#playerNext").addEventListener("click", () => step(1));
  $("#playerClose").addEventListener("click", closePlayer);
  player.addEventListener("close", () => { frame.innerHTML = ""; }); // يوقف الفيديو
  player.addEventListener("click", (e) => {
    if (e.target === player || e.target.classList.contains("player-inner")) closePlayer();
  });
  player.addEventListener("keydown", (e) => {
    // الصفحة عربي: السهم الشمال = اللي بعده
    if (e.key === "ArrowLeft") step(1);
    if (e.key === "ArrowRight") step(-1);
  });

  /* ======================================================
     4) النتايج: الأرقام + سكرين شوتات
     ====================================================== */
  function renderStats(c) {
    const saved = Array.isArray(c.stats) ? c.stats.filter((x) => x && String(x.value || "").trim()) : [];
    const stats = saved.length ? saved : RYDEN_DEFAULTS.stats;
    const box = $("#stats");
    box.dataset.count = String(stats.length);
    box.innerHTML = stats
      .map((x) => `<div class="stat"><b>${esc(x.value)}</b><span>${esc(x.label || "")}</span></div>`)
      .join("");
  }

  function renderShots(items) {
    const box = $("#shots");
    const list = sortByOrder(items).filter((d) => d && d.imageURL);
    $("#resultsBody").classList.toggle("has-shots", list.length > 0);
    if (!list.length) { box.hidden = true; return; }
    box.innerHTML = list
      .map(
        (d) => `
        <figure class="shot">
          <div class="shot-frame"><img src="${esc(d.imageURL)}" alt="${esc(d.caption || "سكرين شوت لنتيجة فيديو")}" loading="lazy" decoding="async"/></div>
          ${d.caption ? `<figcaption class="shot-cap">${esc(d.caption)}</figcaption>` : ""}
          ${d.videoLink ? `<a class="shot-link" href="${esc(d.videoLink)}" target="_blank" rel="noopener">شوف الفيديو<svg class="ic" aria-hidden="true"><use href="#i-ext"/></svg></a>` : ""}
        </figure>`
      )
      .join("");
    box.hidden = false;
  }

  /* اشتغلت مع ... (من أسماء العملاء في الفيديوهات) */
  function renderClients(videos) {
    const clients = uniq(videos.map((v) => v.client).filter(Boolean));
    if (!clients.length) return;
    const shown = clients.slice(0, 4).join("، ") + (clients.length > 4 ? "، وغيرهم" : "");
    $("#heroClientsList").textContent = shown;
    $("#heroClients").hidden = false;

    const niches = uniq(videos.map((v) => v.category).filter((x) => x && x !== OTHER_CATEGORY));
    if (niches.length) setMetaRow("metaNiches", niches.join("، "));
  }

  /* ======================================================
     5) التايم لاين
     ====================================================== */
  const TOTAL_SECONDS = 120;
  const FPS = 25; // PAL زي مصر
  const tlEls = [$("#timeline"), $("#dock")].filter(Boolean);
  let sections = [];
  let starts = [];
  let maxScroll = 1;
  let active = -1;

  const pad = (n) => String(n).padStart(2, "0");
  function timecode(sec) {
    const frames = Math.round(sec * FPS);
    const ff = frames % FPS;
    const s = Math.floor(frames / FPS);
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}:${pad(ff)}`;
  }

  function buildRuler() {
    const box = $(".tl-ruler-labels");
    if (!box) return;
    const marks = [0, 30, 60, 90, 120];
    box.innerHTML = marks
      .map((t) => `<span style="right:${(t / TOTAL_SECONDS) * 100}%">${timecode(t)}</span>`)
      .join("");
  }

  function buildWaveform() {
    const box = $(".tl-a");
    if (!box) return;
    const N = 220;
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let d = "";
    for (let i = 0; i < N; i++) {
      const speech = 0.18 + 0.82 * Math.abs(Math.sin(i * 0.13) * 0.55 + Math.sin(i * 0.041 + 1.3) * 0.45);
      const pause = Math.sin(i * 0.031 + 0.4) > 0.95 ? 0.2 : 1;
      const h = Math.max(1.2, speech * pause * (0.5 + 0.5 * rnd()) * 26);
      d += `M${i + 0.5} ${((30 - h) / 2).toFixed(2)}v${h.toFixed(2)}`;
    }
    box.innerHTML = `<svg viewBox="0 0 ${N} 30" preserveAspectRatio="none"><path d="${d}" stroke="currentColor" stroke-width=".55" fill="none"/></svg>`;
  }

  /* الشريط الثابت بيظهر لما التايم لاين الكبير يطلع فوق الشاشة */
  const dock = $("#dock");
  const bigTl = $("#timeline");
  let tlBottom = Infinity;
  let dockShown = false;
  function setDock(show) {
    dockShown = show;
    dock.classList.toggle("show", show);
    dock.inert = !show;
    dock.setAttribute("aria-hidden", String(!show));
  }

  function buildClips() {
    sections = $$("[data-clip]").filter((s) => !s.hidden);
    const html = sections.map((s) => `<a class="clip" href="#${s.id}">${esc(s.dataset.clip)}</a>`).join("");
    $$(".js-clips").forEach((nav) => (nav.innerHTML = html));
    active = -1;
    measure();
  }

  function measure() {
    if (!sections.length) return;
    const vh = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    tlBottom = bigTl.getBoundingClientRect().bottom + window.scrollY;
    const offset = vh * 0.38;
    const n = sections.length;
    starts = sections.map((s, i) =>
      i === 0 ? 0 : Math.min(Math.max(s.getBoundingClientRect().top + window.scrollY - offset, 0), maxScroll)
    );
    // كل كليب ياخد مساحة كفاية حتى لو القسم قصير
    const gap = maxScroll * 0.045;
    for (let i = n - 1; i >= 1; i--) {
      const lim = (i === n - 1 ? maxScroll : starts[i + 1]) - gap;
      if (starts[i] > lim) starts[i] = lim;
    }
    for (let i = 1; i < n; i++) if (starts[i] < starts[i - 1] + gap) starts[i] = starts[i - 1] + gap;

    $$(".js-clips").forEach((nav) =>
      Array.from(nav.children).forEach((clip, i) => {
        const end = i < n - 1 ? starts[i + 1] : maxScroll;
        clip.style.setProperty("--w", Math.max(0, (end - starts[i]) / maxScroll).toFixed(5));
      })
    );
    // الكليب اللي اسمه مش داخل فيه بيخفي الاسم بدل ما يتقص في نص الكلمة
    $$(".js-clips .clip").forEach((clip) => {
      clip.classList.remove("is-tight");
      clip.classList.toggle("is-tight", clip.scrollWidth > clip.clientWidth + 1);
      clip.title = clip.textContent;
    });
    update();
  }

  function update() {
    const y = window.scrollY;
    const p = Math.min(1, Math.max(0, y / maxScroll));
    tlEls.forEach((el) => el.style.setProperty("--p", p.toFixed(5)));

    const showDock = y > tlBottom;
    if (showDock !== dockShown) setDock(showDock);

    let a = 0;
    for (let i = 0; i < starts.length; i++) if (y >= starts[i] - 1) a = i;
    if (y >= maxScroll - 2) a = starts.length - 1;
    if (a !== active) {
      active = a;
      $$(".js-clips").forEach((nav) =>
        Array.from(nav.children).forEach((c, i) =>
          i === a ? c.setAttribute("aria-current", "true") : c.removeAttribute("aria-current")
        )
      );
    }

    const tc = timecode(p * TOTAL_SECONDS);
    $$(".js-tc").forEach((el) => (el.textContent = tc));
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });

  let measureQueued = false;
  function scheduleMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => { measureQueued = false; measure(); });
  }
  window.addEventListener("resize", scheduleMeasure);
  if ("ResizeObserver" in window) new ResizeObserver(scheduleMeasure).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);

  /* ======================================================
     6) التشغيل
     ====================================================== */
  async function init() {
    $("#year").textContent = new Date().getFullYear();
    buildRuler();
    buildWaveform();
    buildClips();

    const contentP = loadContent().catch((e) => { console.error("تعذّر تحميل المحتوى:", e); return {}; });
    const videosP = loadList("videos").catch((e) => { console.error("تعذّر تحميل الفيديوهات:", e); return null; });
    const impactP = loadList("impact").catch((e) => { console.error("تعذّر تحميل النتايج:", e); return []; });

    // الصورة: نستنى المحتوى شوية عشان لو فيه صورة جديدة متتبدّلش قدام الزائر
    const early = await Promise.race([contentP, wait(1200).then(() => null)]);
    if (early && early.photoURL) setPhoto(early.photoURL);
    startGrade();

    const content = await contentP;
    if (content.photoURL) setPhoto(content.photoURL);
    applyContent(content);

    const raw = await videosP;
    const videos = raw ? sortByOrder(raw).map(prepVideo).filter((v) => v.platform && v.embedId) : [];
    if (raw) renderWorks(videos);
    else { grid.innerHTML = ""; $("#worksEmpty").hidden = false; }
    renderClients(videos);
    renderStats(content);
    renderShots(await impactP);

    buildClips();
  }

  init();

  /* ---------- دخول سري للوحة التحكم ----------
     اكتب "ryden" وانت في الصفحة (من غير ما تكون في خانة كتابة) */
  (function secretAdminAccess() {
    if (DEMO) return;
    const SECRET = "ryden";
    let buffer = "";
    document.addEventListener("keydown", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!e.key || e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) window.location.href = "admin.html";
    });
  })();
})();
