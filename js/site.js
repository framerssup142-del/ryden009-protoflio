/* ==========================================================
   الصفحة الرئيسية — بتقرا المحتوى والفيديوهات من Firestore
   وتعرضهم لايف، أي تعديل من لوحة التحكم يظهر هنا فورًا
   ========================================================== */

/* ---------- Timeline scrubber (مؤشر التمرير) ---------- */
const scrubberFill = document.getElementById("scrubberFill");
const scrubberHead = document.getElementById("scrubberHead");
const scrubberTC = document.getElementById("scrubberTC");
const TOTAL_FRAMES = 3600; // "شريط" افتراضي بطول الصفحة، مش مدة فيديو حقيقية
const FPS = 24;

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateScrubber() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;

  if (scrubberFill) scrubberFill.style.width = pct * 100 + "%";
  if (scrubberHead) scrubberHead.style.right = pct * 100 + "%";

  if (scrubberTC) {
    const totalFrames = Math.round(pct * TOTAL_FRAMES);
    const totalSeconds = Math.floor(totalFrames / FPS);
    const ff = totalFrames % FPS;
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    scrubberTC.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
  }
}
window.addEventListener("scroll", updateScrubber, { passive: true });
updateScrubber();

/* بيحمّل سكريبت تيك توك الرسمي عشان يحول أي blockquote بتاعه لبلاير شغال */
function loadTiktokEmbedScript() {
  const old = document.getElementById("tiktok-embed-script");
  if (old) old.remove();
  const s = document.createElement("script");
  s.id = "tiktok-embed-script";
  s.async = true;
  s.src = "https://www.tiktok.com/embed.js";
  document.body.appendChild(s);
}

/* ---------- تحميل محتوى الصفحة (الاسم / النبذة / التاجلاين / الصورة) ---------- */
async function loadSiteContent() {
  try {
    const snap = await db.collection("site").doc("content").get();
    if (!snap.exists) return;
    const c = snap.data();

    if (c.photoURL) document.getElementById("heroPhoto").src = c.photoURL;
    if (c.nameAr) document.getElementById("heroName").textContent = c.nameAr;
    if (c.roleAr) document.getElementById("heroRole").textContent = c.roleAr;
    if (c.tagline) document.getElementById("heroTagline").textContent = c.tagline;

    if (c.bio) {
      const bioWrap = document.getElementById("bioBody");
      bioWrap.innerHTML = c.bio
        .split(/\n+/)
        .filter(Boolean)
        .map((p) => `<p class="reveal">${p}</p>`)
        .join("");
      initReveal();
    }
  } catch (e) {
    console.error("تعذّر تحميل محتوى الصفحة:", e);
  }
}

/* ---------- تحميل سكرين شوتات الأثر / النتائج ---------- */
async function loadImpact() {
  const grid = document.getElementById("impactGrid");
  if (!grid) return;
  try {
    const snap = await db.collection("impact").orderBy("createdAt", "desc").get();
    if (snap.empty) {
      grid.innerHTML = `<p class="videos-empty">هتظهر هنا سكرين شوتات النتائج أول ما تتضاف من لوحة التحكم.</p>`;
      return;
    }
    grid.innerHTML = "";
    snap.forEach((doc) => {
      const d = doc.data();
      const hasLink = !!d.videoLink;
      const card = document.createElement(hasLink ? "a" : "div");
      card.className = "impact-card reveal";
      if (hasLink) {
        card.href = d.videoLink;
        card.target = "_blank";
        card.rel = "noopener";
      }
      card.innerHTML = `
        <span class="impact-badge">Proof</span>
        ${hasLink ? `<span class="impact-play">▶</span>` : ""}
        <img src="${d.imageURL}" alt="${d.caption || "نتيجة شغل"}" loading="lazy"/>
        ${d.caption ? `<div class="impact-caption">${d.caption}</div>` : ""}
      `;
      grid.appendChild(card);
    });
    initReveal();
  } catch (e) {
    console.error("تعذّر تحميل سكرين شوتات الأثر:", e);
    grid.innerHTML = `<p class="videos-empty">حصل خطأ في تحميل الصور.</p>`;
  }
}

/* ---------- تحميل الفيديوهات ---------- */
async function loadVideos() {
  const grid = document.getElementById("videosGrid");
  try {
    const snap = await db
      .collection("videos")
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      grid.innerHTML = `<p class="videos-empty">لسه مفيش فيديوهات — هتظهر هنا أول ما تتضاف من لوحة التحكم.</p>`;
      return;
    }

    grid.innerHTML = "";
    let hasTiktok = false;
    snap.forEach((doc) => {
      const v = doc.data();
      const card = document.createElement("div");
      card.className = "vcard";

      let mediaHtml;
      if (v.platform === "tiktok") {
        hasTiktok = true;
        mediaHtml = `<blockquote class="tiktok-embed" cite="${v.permalink}" data-video-id="${v.embedId}" style="max-width:100%;min-width:100%;margin:0;"><section></section></blockquote>`;
      } else {
        mediaHtml = `<iframe src="${v.embedUrl}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      }

      card.innerHTML = `
        <div class="vframe ${v.platform === "tiktok" ? "vframe-tiktok" : ""}">
          ${mediaHtml}
        </div>
        <p class="vtitle">${wrapWords(v.title || "بدون عنوان")}</p>
      `;
      grid.appendChild(card);
    });

    if (hasTiktok) loadTiktokEmbedScript();

    // نفعّل أنيميشن ظهور العناوين كل ما الكارت يدخل الشاشة
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    document.querySelectorAll(".vcard").forEach((el) => io.observe(el));
  } catch (e) {
    console.error("تعذّر تحميل الفيديوهات:", e);
    grid.innerHTML = `<p class="videos-empty">حصل خطأ في تحميل الفيديوهات، جرب تحدّث الصفحة.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSiteContent();
  loadImpact();
  loadVideos();
  initReveal();
});

/* ---------- دخول سري للوحة التحكم ----------
   اكتب "ryden" في أي وقت وانت في الصفحة (من غير ما تكون داخل حقل كتابة)
   وهيودّيك لـ admin.html من غير أي لينك ظاهر للزوار */
(function secretAdminAccess() {
  const SECRET = "ryden";
  let buffer = "";
  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return; // مايشتغلش وانت بتكتب في فورم
    if (e.key.length !== 1) return; // تجاهل Shift, Enter... إلخ
    buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
    if (buffer === SECRET) {
      window.location.href = "admin.html";
    }
  });
})();
