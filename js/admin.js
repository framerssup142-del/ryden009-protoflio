/* ==========================================================
   لوحة التحكم — تسجيل الدخول + تعديل المحتوى + إدارة الفيديوهات
   ========================================================== */

const loginCard = document.getElementById("loginCard");
const panelCard = document.getElementById("panelCard");
const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const logoutBtn = document.getElementById("logoutBtn");

/* ---------- تسجيل الدخول / الخروج ---------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  loginMsg.className = "msg";
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (err) {
    loginMsg.textContent = "بيانات الدخول غلط، جرب تاني.";
    loginMsg.className = "msg err show";
  }
});

logoutBtn.addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged((user) => {
  if (user) {
    loginCard.style.display = "none";
    panelCard.style.display = "block";
    loadContentForm();
    loadImpactList();
    loadVideosList();
  } else {
    loginCard.style.display = "block";
    panelCard.style.display = "none";
  }
});

/* ---------- تعديل محتوى الصفحة ---------- */
const contentForm = document.getElementById("contentForm");
const contentMsg = document.getElementById("contentMsg");
const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
let pendingPhotoDataUrl = null;

async function loadContentForm() {
  try {
    const snap = await db.collection("site").doc("content").get();
    const c = snap.exists ? snap.data() : {};
    document.getElementById("cName").value = c.nameAr || "رياض إبراهيم (رايدن)";
    document.getElementById("cRole").value = c.roleAr || "Video Editor · صانع محتوى · مهتم بالـ AI";
    document.getElementById("cTagline").value = c.tagline || "بساعدك تكون نفسك على السوشيال ميديا";
    document.getElementById("cBio").value = c.bio || "";
    if (c.photoURL) photoPreview.innerHTML = `<img src="${c.photoURL}"/>`;
  } catch (e) {
    console.error(e);
  }
}

/* بيصغّر الصورة ويحوّلها base64 عشان تتخزن في المستند من غير ما نحتاج Firebase Storage */
function compressImage(file, maxW = 700, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;
  pendingPhotoDataUrl = await compressImage(file);
  photoPreview.innerHTML = `<img src="${pendingPhotoDataUrl}"/>`;
});

contentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = contentForm.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const payload = {
      nameAr: document.getElementById("cName").value.trim(),
      roleAr: document.getElementById("cRole").value.trim(),
      tagline: document.getElementById("cTagline").value.trim(),
      bio: document.getElementById("cBio").value.trim(),
    };
    if (pendingPhotoDataUrl) payload.photoURL = pendingPhotoDataUrl;

    await db.collection("site").doc("content").set(payload, { merge: true });
    contentMsg.textContent = "✓ اتحفظ بنجاح";
    contentMsg.className = "msg ok show";
    pendingPhotoDataUrl = null;
    setTimeout(() => contentMsg.classList.remove("show"), 3000);
  } catch (err) {
    console.error(err);
    contentMsg.textContent = "حصل خطأ، جرب تاني";
    contentMsg.className = "msg err show";
  } finally {
    btn.disabled = false;
  }
});

/* ---------- سكرين شوتات الأثر / النتائج ---------- */
const impactForm = document.getElementById("impactForm");
const impactImageInput = document.getElementById("impactImageInput");
const impactCaptionInput = document.getElementById("impactCaptionInput");
const impactMsg = document.getElementById("impactMsg");
const impactList = document.getElementById("impactList");

impactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = impactImageInput.files[0];
  if (!file) return;
  const btn = impactForm.querySelector("button[type=submit]");
  btn.disabled = true;
  impactMsg.className = "msg";
  try {
    const dataUrl = await compressImage(file, 900, 0.82);
    await db.collection("impact").add({
      imageURL: dataUrl,
      caption: impactCaptionInput.value.trim() || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    impactForm.reset();
    impactMsg.textContent = "✓ اتضافت الصورة";
    impactMsg.className = "msg ok show";
    setTimeout(() => impactMsg.classList.remove("show"), 2500);
    loadImpactList();
  } catch (err) {
    console.error(err);
    impactMsg.textContent = "حصل خطأ في الإضافة";
    impactMsg.className = "msg err show";
  } finally {
    btn.disabled = false;
  }
});

async function loadImpactList() {
  impactList.innerHTML = `<p class="admin-sub">جاري التحميل...</p>`;
  try {
    const snap = await db.collection("impact").orderBy("createdAt", "desc").get();
    if (snap.empty) {
      impactList.innerHTML = `<p class="admin-sub">لسه مفيش صور مضافة.</p>`;
      return;
    }
    impactList.innerHTML = "";
    snap.forEach((doc) => {
      const d = doc.data();
      const row = document.createElement("div");
      row.className = "video-row";
      row.innerHTML = `
        <div class="thumb-img"><img src="${d.imageURL}"/></div>
        <div class="vrow-title">
          <input type="text" value="${(d.caption || "").replace(/"/g, "&quot;")}" placeholder="بدون وصف" data-id="${doc.id}"/>
        </div>
        <div class="vrow-actions">
          <button class="icon-btn danger" data-delete-impact="${doc.id}" title="حذف">✕</button>
        </div>
      `;
      impactList.appendChild(row);
    });

    impactList.querySelectorAll(".vrow-title input").forEach((input) => {
      input.addEventListener("blur", async () => {
        const id = input.dataset.id;
        try {
          await db.collection("impact").doc(id).update({ caption: input.value.trim() || null });
        } catch (e) {
          console.error(e);
        }
      });
    });

    impactList.querySelectorAll("[data-delete-impact]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("متأكد إنك عايز تمسح الصورة دي؟")) return;
        try {
          await db.collection("impact").doc(btn.dataset.deleteImpact).delete();
          loadImpactList();
        } catch (e) {
          console.error(e);
        }
      });
    });
  } catch (e) {
    console.error(e);
    impactList.innerHTML = `<p class="admin-sub">حصل خطأ في تحميل الصور.</p>`;
  }
}

/* ---------- إدارة الفيديوهات ---------- */
const videoForm = document.getElementById("videoForm");
const videoUrlInput = document.getElementById("videoUrlInput");
const videoTitleInput = document.getElementById("videoTitleInput");
const videoMsg = document.getElementById("videoMsg");
const videosList = document.getElementById("videosList");

/* لما يلزق اللينك، نحاول نجيب العنوان تلقائي لو يوتيوب أو تيك توك */
videoUrlInput.addEventListener("blur", async () => {
  const parsed = parseVideoUrl(videoUrlInput.value);
  if (!parsed) return;
  if (videoTitleInput.value.trim()) return;

  if (parsed.platform === "youtube") {
    videoTitleInput.placeholder = "بيجيب العنوان...";
    const title = await fetchYoutubeTitle(parsed.watchUrl);
    if (title) videoTitleInput.value = title;
    videoTitleInput.placeholder = "عنوان الفيديو";
  } else if (parsed.platform === "tiktok") {
    videoTitleInput.placeholder = "بيجيب العنوان...";
    const title = await fetchTiktokTitle(parsed.watchUrl);
    if (title) videoTitleInput.value = title;
    videoTitleInput.placeholder = "عنوان الفيديو";
  }
});

videoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  videoMsg.className = "msg";
  const parsed = parseVideoUrl(videoUrlInput.value);
  if (!parsed) {
    videoMsg.textContent = "اللينك ده مش لينك يوتيوب شورتس أو جوجل درايف معروف.";
    videoMsg.className = "msg err show";
    return;
  }
  const btn = videoForm.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await db.collection("videos").add({
      url: videoUrlInput.value.trim(),
      platform: parsed.platform,
      embedId: parsed.embedId,
      embedUrl: parsed.embedUrl || null,
      permalink: parsed.permalink || null,
      title: videoTitleInput.value.trim() || "بدون عنوان",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    videoForm.reset();
    videoMsg.textContent = "✓ اتضاف الفيديو";
    videoMsg.className = "msg ok show";
    setTimeout(() => videoMsg.classList.remove("show"), 2500);
    loadVideosList();
  } catch (err) {
    console.error(err);
    videoMsg.textContent = "حصل خطأ في الإضافة";
    videoMsg.className = "msg err show";
  } finally {
    btn.disabled = false;
  }
});

async function loadVideosList() {
  videosList.innerHTML = `<p class="admin-sub">جاري التحميل...</p>`;
  try {
    const snap = await db.collection("videos").orderBy("createdAt", "desc").get();
    if (snap.empty) {
      videosList.innerHTML = `<p class="admin-sub">لسه مفيش فيديوهات مضافة.</p>`;
      return;
    }
    videosList.innerHTML = "";
    snap.forEach((doc) => {
      const v = doc.data();
      const row = document.createElement("div");
      row.className = "video-row";
      row.innerHTML = `
        <div class="thumb">${v.platform === "youtube" ? "YT" : v.platform === "tiktok" ? "TikTok" : "Drive"}</div>
        <div class="vrow-title">
          <input type="text" value="${(v.title || "").replace(/"/g, "&quot;")}" data-id="${doc.id}"/>
          <span class="platform-tag">${v.platform}</span>
        </div>
        <div class="vrow-actions">
          <a class="icon-btn" href="${v.url}" target="_blank" rel="noopener" title="فتح اللينك">↗</a>
          <button class="icon-btn danger" data-delete="${doc.id}" title="حذف">✕</button>
        </div>
      `;
      videosList.appendChild(row);
    });

    // تعديل العنوان لحظيًا لما يخرج من الحقل
    videosList.querySelectorAll(".vrow-title input").forEach((input) => {
      input.addEventListener("blur", async () => {
        const id = input.dataset.id;
        try {
          await db.collection("videos").doc(id).update({ title: input.value.trim() });
        } catch (e) {
          console.error(e);
        }
      });
    });

    // الحذف
    videosList.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("متأكد إنك عايز تمسح الفيديو ده؟")) return;
        try {
          await db.collection("videos").doc(btn.dataset.delete).delete();
          loadVideosList();
        } catch (e) {
          console.error(e);
        }
      });
    });
  } catch (e) {
    console.error(e);
    videosList.innerHTML = `<p class="admin-sub">حصل خطأ في تحميل الفيديوهات.</p>`;
  }
}
