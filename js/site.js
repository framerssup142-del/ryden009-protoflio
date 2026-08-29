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
    snap.forEach((doc) => {
      const v = doc.data();
      const card = document.createElement("div");
      card.className = "vcard";
      card.innerHTML = `
        <div class="vframe">
          <iframe src="${v.embedUrl}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
        <p class="vtitle">${wrapWords(v.title || "بدون عنوان")}</p>
      `;
      grid.appendChild(card);
    });

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
  loadVideos();
  initReveal();
});
