/* ==========================================================
   لوحة التحكم
   - المحتوى: الصورة، الجملة الكبيرة، النبذة، الخدمات، الـ Showreel
   - الشغل: إضافة فيديو، اسم العميل، المجال، الترتيب، صورة الغلاف
   - النتايج: الأرقام + سكرين شوتات
   ========================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = escapeHtml;

  function getAuth() { try { return auth; } catch (e) { return null; } }
  function getDb() { try { return db; } catch (e) { return null; } }
  const fb = getDb();
  const fbAuth = getAuth();
  const serverTime = () => firebase.firestore.FieldValue.serverTimestamp();

  /* ---------- رسائل ---------- */
  let toastTimer;
  function toast(text, isErr) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.toggle("err", !!isErr);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function setMsg(el, text, kind) {
    el.textContent = text || "";
    el.className = "msg" + (kind ? ` ${kind}` : "");
  }
  const errText = (e) => "حصل خطأ: " + ((e && (e.code || e.message)) || "جرّب تاني");

  /* ======================================================
     تسجيل الدخول
     ====================================================== */
  const loginView = $("#loginView");
  const panelView = $("#panelView");

  if (!fb || !fbAuth) {
    loginView.hidden = false;
    setMsg($("#loginMsg"), "مش قادر يوصل لـ Firebase. اتأكد من النت وحدّث الصفحة.", "err");
    return;
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#loginForm button[type=submit]");
    btn.disabled = true;
    setMsg($("#loginMsg"), "");
    try {
      await fbAuth.signInWithEmailAndPassword($("#loginEmail").value.trim(), $("#loginPass").value);
    } catch (err) {
      setMsg($("#loginMsg"), "الإيميل أو الباسورد غلط. جرّب تاني.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  $("#logoutBtn").addEventListener("click", () => fbAuth.signOut());

  let loaded = false;
  fbAuth.onAuthStateChanged((user) => {
    loginView.hidden = !!user;
    panelView.hidden = !user;
    if (user && !loaded) {
      loaded = true;
      loadContent();
      loadVideos();
      loadImpact();
    }
    if (!user) loaded = false;
  });

  /* أزرار اختيار الصور: بتعرض اسم الملف اللي اخترته */
  $$(".file-btn input[type=file]").forEach((input) => {
    const label = input.parentElement.querySelector(".file-name");
    if (!label) return;
    input.addEventListener("change", () => {
      label.textContent = input.files[0] ? input.files[0].name : label.dataset.empty;
    });
    if (input.form) input.form.addEventListener("reset", () => setTimeout(() => (label.textContent = label.dataset.empty)));
  });

  /* ======================================================
     التابات
     ====================================================== */
  const tabs = $$(".tab");
  function selectTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    try { sessionStorage.setItem("ryden-admin-tab", tab.id); } catch (e) {}
  }
  tabs.forEach((t) => t.addEventListener("click", () => selectTab(t)));
  $(".tabs").addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let n = null;
    if (e.key === "ArrowLeft") n = (i + 1) % tabs.length;
    if (e.key === "ArrowRight") n = (i - 1 + tabs.length) % tabs.length;
    if (n !== null) { e.preventDefault(); tabs[n].focus(); selectTab(tabs[n]); }
  });
  try {
    const saved = sessionStorage.getItem("ryden-admin-tab");
    if (saved && document.getElementById(saved)) selectTab(document.getElementById(saved));
    else selectTab(tabs[0]);
  } catch (e) { selectTab(tabs[0]); }

  /* ======================================================
     المحتوى
     ====================================================== */
  const contentDoc = () => fb.collection("site").doc("content");
  const FIELDS = {
    nameAr: "cName", roleAr: "cRole", headline: "cHeadline", tagline: "cTagline",
    quote: "cQuote", bio: "cBio", experience: "cExp", availability: "cAvail",
    tools: "cTools", showreelUrl: "cReel",
  };
  // الحقول دي لو اتمسحت بتختفي من الموقع، فالقيمة الفاضية بتتحفظ زي ما هي
  const OPTIONAL = new Set(["experience", "tools", "showreelUrl"]);
  let pendingPhoto = null;
  let pendingReelCover; // undefined = مفيش تغيير، null = اتشال، string = غلاف جديد

  function showReelCover(src) {
    $("#reelPreview").innerHTML = src ? `<img src="${esc(src)}" alt=""/>` : "من غير غلاف";
    $("#reelCoverRemove").hidden = !src;
  }

  async function loadContent() {
    try {
      const snap = await contentDoc().get();
      const c = snap.exists ? snap.data() : {};
      for (const [key, id] of Object.entries(FIELDS)) {
        const saved = typeof c[key] === "string" ? c[key] : null;
        const v = OPTIONAL.has(key)
          ? saved !== null ? saved : RYDEN_DEFAULTS[key] || ""
          : saved && saved.trim() ? saved : RYDEN_DEFAULTS[key] || "";
        document.getElementById(id).value = v;
      }
      showReelCover(c.showreelCover || "");
      const services = Array.isArray(c.services) && c.services.length ? c.services : RYDEN_DEFAULTS.services;
      $("#cServices").value = services.map((s) => (s.desc ? `${s.title} | ${s.desc}` : s.title)).join("\n");
      if (c.photoURL) $("#photoPreview").innerHTML = `<img src="${esc(c.photoURL)}" alt=""/>`;
      renderStatsRows(c.stats);
    } catch (e) {
      console.error(e);
      toast(errText(e), true);
    }
  }

  $("#photoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingPhoto = await compressImage(file, 1000, 0.85, 700000);
      $("#photoPreview").innerHTML = `<img src="${pendingPhoto}" alt=""/>`;
      setMsg($("#contentMsg"), "الصورة الجديدة هتتحفظ لما تدوس «احفظ التعديلات».");
    } catch (err) {
      toast("الصورة دي مش بتفتح، جرّب صورة تانية.", true);
    }
  });

  $("#reelCoverInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingReelCover = await compressImage(file, 1280, 0.82, 400000);
      showReelCover(pendingReelCover);
      setMsg($("#contentMsg"), "الغلاف الجديد هيتحفظ لما تدوس «احفظ التعديلات».");
    } catch (err) {
      toast("الصورة دي مش بتفتح، جرّب صورة تانية.", true);
    }
  });
  $("#reelCoverRemove").addEventListener("click", () => {
    pendingReelCover = null;
    showReelCover("");
    setMsg($("#contentMsg"), "الغلاف هيتشال لما تدوس «احفظ التعديلات».");
  });

  function parseServices(text) {
    return text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf("|");
        return i < 0 ? { title: l, desc: "" } : { title: l.slice(0, i).trim(), desc: l.slice(i + 1).trim() };
      })
      .filter((s) => s.title);
  }

  $("#contentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#contentForm button[type=submit]");
    const msg = $("#contentMsg");
    const payload = {};
    for (const [key, id] of Object.entries(FIELDS)) payload[key] = document.getElementById(id).value.trim();
    payload.services = parseServices($("#cServices").value);
    if (payload.showreelUrl && !parseVideoUrl(payload.showreelUrl)) {
      setMsg(msg, "لينك الـ Showreel مش معروف. استخدم لينك يوتيوب أو درايف أو تيك توك أو انستجرام.", "err");
      $("#cReel").focus();
      return;
    }
    if (pendingPhoto) payload.photoURL = pendingPhoto;
    if (pendingReelCover !== undefined) payload.showreelCover = pendingReelCover;
    btn.disabled = true;
    setMsg(msg, "بيحفظ...");
    try {
      await contentDoc().set(payload, { merge: true });
      pendingPhoto = null;
      pendingReelCover = undefined;
      setMsg(msg, "اتحفظ ✓ افتح الموقع وحدّثه عشان تشوف التغيير.", "ok");
      toast("اتحفظ ✓");
    } catch (err) {
      console.error(err);
      setMsg(msg, errText(err), "err");
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- الأرقام ---------- */
  const STAT_HINTS = [
    ...RYDEN_DEFAULTS.stats,
    { value: "مثلًا 5", label: "رقم زيادة لو حابب" },
  ];
  function renderStatsRows(stats) {
    const saved = Array.isArray(stats) ? stats.filter((x) => x && String(x.value || "").trim()) : [];
    const list = saved.length ? saved : RYDEN_DEFAULTS.stats;
    $("#statsRows").innerHTML = STAT_HINTS.map((hint, i) => {
      const s = list[i] || {};
      return `<div class="stat-row">
        <input type="text" class="st-v" dir="ltr" value="${esc(s.value || "")}" placeholder="${esc(hint.value)}" aria-label="الرقم ${i + 1}"/>
        <input type="text" class="st-l" value="${esc(s.label || "")}" placeholder="${esc(hint.label)}" aria-label="وصف الرقم ${i + 1}"/>
      </div>`;
    }).join("");
  }

  $("#statsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#statsForm button[type=submit]");
    const msg = $("#statsMsg");
    const stats = $$(".stat-row")
      .map((r) => ({ value: $(".st-v", r).value.trim(), label: $(".st-l", r).value.trim() }))
      .filter((s) => s.value);
    btn.disabled = true;
    try {
      await contentDoc().set({ stats }, { merge: true });
      setMsg(msg, stats.length ? "اتحفظت الأرقام ✓" : "اتحفظ ✓ الموقع هيعرض الأرقام الأساسية.", "ok");
      toast("اتحفظ ✓");
    } catch (err) {
      setMsg(msg, errText(err), "err");
    } finally {
      btn.disabled = false;
    }
  });

  /* ======================================================
     ترتيب مشترك بين الفيديوهات والصور
     ====================================================== */
  // بيدّي كل العناصر ترتيب 0..n-1 لو محتاجين، وبيرجع رقم ترتيب لعنصر جديد يظهر أول واحد
  function prepareOrder(col, items, batch) {
    const normalized = items.every((v, k) => v.order === k);
    if (!normalized) {
      items.forEach((v, k) => {
        if (v.order !== k) batch.update(fb.collection(col).doc(v.id), { order: k });
        v.order = k;
      });
    }
    return items.length ? items[0].order - 1 : 0;
  }

  async function moveItem(col, items, id, dir, rerender) {
    const i = items.findIndex((v) => v.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    const batch = fb.batch();
    items.forEach((v, k) => {
      if (v.order !== k) batch.update(fb.collection(col).doc(v.id), { order: k });
      v.order = k;
    });
    rerender();
    const btn = $(`.row[data-id="${id}"] [data-move="${dir}"]`);
    if (btn && !btn.disabled) btn.focus();
    else { const other = $(`.row[data-id="${id}"] [data-move="${-dir}"]`); if (other) other.focus(); }
    try {
      await batch.commit();
      toast("اتغيّر الترتيب ✓");
    } catch (err) {
      toast(errText(err), true);
    }
  }

  function flashSaved(row) {
    const s = row && $(".saved", row);
    if (!s) return;
    s.classList.add("show");
    setTimeout(() => s.classList.remove("show"), 1600);
  }

  function wireThumbFallback(root) {
    $$("img[data-next]", root).forEach((img) => {
      const next = () => {
        const rest = (img.dataset.next || "").split("|").filter(Boolean);
        if (rest.length) { img.dataset.next = rest.slice(1).join("|"); img.src = rest[0]; }
        else img.remove();
      };
      img.addEventListener("error", next);
      img.addEventListener("load", () => { if (img.naturalWidth && img.naturalWidth <= 120) next(); });
    });
  }

  /* ======================================================
     الشغل (الفيديوهات)
     ====================================================== */
  const videosList = $("#videosList");
  let videos = [];

  async function loadVideos() {
    videosList.innerHTML = `<p class="empty-row">بيحمّل...</p>`;
    try {
      const snap = await fb.collection("videos").get();
      videos = sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      renderVideos();
    } catch (e) {
      console.error(e);
      videosList.innerHTML = `<p class="empty-row">مش قادر يحمّل الفيديوهات. ${esc(errText(e))}</p>`;
    }
  }

  function derived(v) {
    const dClient = deriveClient(v.title || "");
    const dCat = deriveCategory(`${v.title || ""} ${v.client || dClient}`) || OTHER_CATEGORY;
    const parsed = parseVideoUrl(v.url || "") || {};
    return {
      dClient,
      dCat,
      cat: (v.category || "").trim() || dCat,
      platform: v.platform || parsed.platform,
      embedId: v.embedId || parsed.embedId,
      orientation: v.orientation || parsed.orientation || "v",
    };
  }

  function renderCategoryList() {
    const set = new Set(["فيتنس", "طبي", "عقارات", "موشن جرافيك", "تطوير ذات"]);
    videos.forEach((v) => { const c = derived(v).cat; if (c && c !== OTHER_CATEGORY) set.add(c); });
    $("#catList").innerHTML = Array.from(set).map((c) => `<option value="${esc(c)}"></option>`).join("");
  }

  function videoRow(v, i) {
    const d = derived(v);
    const thumbs = thumbCandidates({ ...v, platform: d.platform, embedId: d.embedId, orientation: d.orientation });
    return `
      <div class="row" data-id="${esc(v.id)}">
        <div class="row-thumb" style="--c:${categoryColor(d.cat)}">${thumbs.length ? `<img src="${esc(thumbs[0])}" data-next="${esc(thumbs.slice(1).join("|"))}" alt="" loading="lazy"/>` : ""}</div>
        <div class="row-fields">
          <label>اسم العميل<input type="text" data-f="client" value="${esc(v.client || "")}" placeholder="${esc(d.dClient ? `${d.dClient} (تلقائي)` : "مثلًا: كابتن يوسف أشرف")}"/></label>
          <label>المجال<input type="text" data-f="category" list="catList" value="${esc(v.category || "")}" placeholder="${esc(`${d.dCat} (تلقائي)`)}"/></label>
          <label class="wide">العنوان<input type="text" data-f="title" value="${esc(v.title || "")}"/></label>
          <div class="row-sub">
            <select data-f="orientation" aria-label="شكل الفيديو">
              <option value="v"${d.orientation === "v" ? " selected" : ""}>طولي 9:16</option>
              <option value="h"${d.orientation === "h" ? " selected" : ""}>عرضي 16:9</option>
            </select>
            <span>${esc(PLATFORM_NAMES[d.platform] || "لينك")}</span>
            <label class="link-btn">${v.thumbURL ? "غيّر الغلاف" : "ضيف صورة غلاف"}<input type="file" accept="image/*" data-cover/></label>
            ${v.thumbURL ? `<button type="button" class="link-btn" data-remove-cover>شيل الغلاف</button>` : ""}
            <span class="saved">اتحفظ ✓</span>
          </div>
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-move="-1" aria-label="طلّعه لفوق"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="icon-btn" data-move="1" aria-label="نزّله لتحت"${i === videos.length - 1 ? " disabled" : ""}>↓</button>
          <a class="icon-btn" href="${esc(v.url || "#")}" target="_blank" rel="noopener" aria-label="افتح الفيديو">↗</a>
          <button type="button" class="icon-btn danger" data-del aria-label="امسح الفيديو">✕</button>
        </div>
      </div>`;
  }

  function renderVideos() {
    $("#videoCount").textContent = videos.length ? `(${videos.length})` : "";
    renderCategoryList();
    if (!videos.length) {
      videosList.innerHTML = `<p class="empty-row">لسه مفيش فيديوهات. ضيف أول فيديو من فوق.</p>`;
      return;
    }
    videosList.innerHTML = videos.map(videoRow).join("");
    wireThumbFallback(videosList);
  }

  async function updateVideo(id, data, row) {
    try {
      await fb.collection("videos").doc(id).update(data);
      const v = videos.find((x) => x.id === id);
      if (v) Object.assign(v, data);
      flashSaved(row);
      return true;
    } catch (err) {
      console.error(err);
      toast(errText(err), true);
      return false;
    }
  }

  videosList.addEventListener("change", async (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.dataset.f) {
      const key = e.target.dataset.f;
      const val = e.target.value.trim();
      await updateVideo(id, { [key]: val }, row);
      if (key === "category" || key === "client" || key === "title") {
        const v = videos.find((x) => x.id === id);
        $(".row-thumb", row).style.setProperty("--c", categoryColor(derived(v).cat));
        renderCategoryList();
      }
      return;
    }
    if (e.target.hasAttribute("data-cover")) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const thumbURL = await compressImage(file, 540, 0.8, 250000);
        if (await updateVideo(id, { thumbURL }, row)) { renderVideos(); toast("اتحطت صورة الغلاف ✓"); }
      } catch (err) {
        toast("الصورة دي مش بتفتح، جرّب صورة تانية.", true);
      }
    }
  });

  videosList.addEventListener("click", async (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    const id = row.dataset.id;
    const move = e.target.closest("[data-move]");
    if (move) return moveItem("videos", videos, id, +move.dataset.move, renderVideos);
    if (e.target.closest("[data-remove-cover]")) {
      if (await updateVideo(id, { thumbURL: null }, row)) renderVideos();
      return;
    }
    if (e.target.closest("[data-del]")) {
      const v = videos.find((x) => x.id === id);
      const name = (v && (v.client || deriveClient(v.title) || v.title)) || "الفيديو ده";
      if (!confirm(`متأكد إنك عايز تمسح «${name}»؟`)) return;
      try {
        await fb.collection("videos").doc(id).delete();
        videos = videos.filter((x) => x.id !== id);
        renderVideos();
        toast("اتمسح ✓");
      } catch (err) {
        toast(errText(err), true);
      }
    }
  });

  /* إضافة فيديو */
  const vUrl = $("#vUrl");
  const vTitle = $("#vTitle");
  vUrl.addEventListener("change", async () => {
    const parsed = parseVideoUrl(vUrl.value);
    if (!parsed) return;
    $("#vOrientation").value = parsed.orientation || "v";
    if (vTitle.value.trim()) return;
    const fetcher = parsed.platform === "youtube" ? fetchYoutubeTitle : parsed.platform === "tiktok" ? fetchTiktokTitle : null;
    if (!fetcher) return;
    vTitle.placeholder = "بيجيب العنوان...";
    const title = await fetcher(parsed.watchUrl);
    if (title && !vTitle.value.trim()) vTitle.value = title;
    vTitle.placeholder = "";
  });

  $("#videoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#videoMsg");
    const btn = $("#videoForm button[type=submit]");
    const url = vUrl.value.trim();
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      setMsg(msg, "اللينك ده مش معروف. استخدم لينك يوتيوب أو تيك توك أو انستجرام أو جوجل درايف.", "err");
      vUrl.focus();
      return;
    }
    if (videos.some((v) => v.embedId === parsed.embedId) && !confirm("الفيديو ده موجود قبل كده. تضيفه تاني؟")) return;
    btn.disabled = true;
    setMsg(msg, "بيضيف...");
    try {
      const coverFile = $("#vCover").files[0];
      const thumbURL = coverFile ? await compressImage(coverFile, 540, 0.8, 250000) : null;
      const batch = fb.batch();
      const order = prepareOrder("videos", videos, batch);
      batch.set(fb.collection("videos").doc(), {
        url,
        platform: parsed.platform,
        embedId: parsed.embedId,
        embedUrl: parsed.embedUrl || null,
        permalink: parsed.permalink || null,
        title: vTitle.value.trim(),
        client: $("#vClient").value.trim(),
        category: $("#vCategory").value.trim(),
        orientation: $("#vOrientation").value,
        thumbURL,
        order,
        createdAt: serverTime(),
      });
      await batch.commit();
      $("#videoForm").reset();
      setMsg(msg, "اتضاف الفيديو ✓ وبقى أول واحد في الشغل.", "ok");
      toast("اتضاف ✓");
      loadVideos();
    } catch (err) {
      console.error(err);
      setMsg(msg, errText(err), "err");
    } finally {
      btn.disabled = false;
    }
  });

  /* ======================================================
     النتايج (سكرين شوتات)
     ====================================================== */
  const impactList = $("#impactList");
  let shots = [];

  async function loadImpact() {
    impactList.innerHTML = `<p class="empty-row">بيحمّل...</p>`;
    try {
      const snap = await fb.collection("impact").get();
      shots = sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      renderImpact();
    } catch (e) {
      console.error(e);
      impactList.innerHTML = `<p class="empty-row">مش قادر يحمّل الصور. ${esc(errText(e))}</p>`;
    }
  }

  function renderImpact() {
    $("#impactCount").textContent = shots.length ? `(${shots.length})` : "";
    if (!shots.length) {
      impactList.innerHTML = `<p class="empty-row">لسه مفيش صور. ضيف سكرين شوت لنتيجة فيديو من فوق.</p>`;
      return;
    }
    impactList.innerHTML = shots
      .map(
        (d, i) => `
      <div class="row" data-id="${esc(d.id)}">
        <div class="row-thumb is-shot"><img src="${esc(d.imageURL)}" alt=""/></div>
        <div class="row-fields">
          <label class="wide">الوصف<input type="text" data-f="caption" value="${esc(d.caption || "")}" placeholder="بدون وصف"/></label>
          <label class="wide">لينك الفيديو<input type="url" data-f="videoLink" value="${esc(d.videoLink || "")}" placeholder="اختياري"/></label>
          <div class="row-sub"><span class="saved">اتحفظ ✓</span></div>
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-move="-1" aria-label="طلّعها لفوق"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="icon-btn" data-move="1" aria-label="نزّلها لتحت"${i === shots.length - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="icon-btn danger" data-del aria-label="امسح الصورة">✕</button>
        </div>
      </div>`
      )
      .join("");
  }

  impactList.addEventListener("change", async (e) => {
    const row = e.target.closest(".row");
    if (!row || !e.target.dataset.f) return;
    const key = e.target.dataset.f;
    const val = e.target.value.trim() || null;
    try {
      await fb.collection("impact").doc(row.dataset.id).update({ [key]: val });
      const d = shots.find((x) => x.id === row.dataset.id);
      if (d) d[key] = val;
      flashSaved(row);
    } catch (err) {
      toast(errText(err), true);
    }
  });

  impactList.addEventListener("click", async (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    const id = row.dataset.id;
    const move = e.target.closest("[data-move]");
    if (move) return moveItem("impact", shots, id, +move.dataset.move, renderImpact);
    if (e.target.closest("[data-del]")) {
      if (!confirm("متأكد إنك عايز تمسح الصورة دي؟")) return;
      try {
        await fb.collection("impact").doc(id).delete();
        shots = shots.filter((x) => x.id !== id);
        renderImpact();
        toast("اتمسحت ✓");
      } catch (err) {
        toast(errText(err), true);
      }
    }
  });

  $("#impactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#impactMsg");
    const btn = $("#impactForm button[type=submit]");
    const file = $("#iImage").files[0];
    if (!file) { setMsg(msg, "اختار صورة الأول.", "err"); return; }
    btn.disabled = true;
    setMsg(msg, "بيضيف...");
    try {
      const imageURL = await compressImage(file, 900, 0.82, 700000);
      const batch = fb.batch();
      const order = prepareOrder("impact", shots, batch);
      batch.set(fb.collection("impact").doc(), {
        imageURL,
        caption: $("#iCaption").value.trim() || null,
        videoLink: $("#iLink").value.trim() || null,
        order,
        createdAt: serverTime(),
      });
      await batch.commit();
      $("#impactForm").reset();
      setMsg(msg, "اتضافت الصورة ✓", "ok");
      toast("اتضافت ✓");
      loadImpact();
    } catch (err) {
      console.error(err);
      setMsg(msg, errText(err), "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
