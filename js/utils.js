/* ==========================================================
   أدوات مشتركة بين الموقع ولوحة التحكم
   - قراءة لينكات الفيديو (يوتيوب / تيك توك / انستجرام / جوجل درايف)
   - الصور المصغّرة ولينكات التشغيل
   - استنتاج اسم العميل والمجال من عنوان الفيديو القديم
   - المحتوى الافتراضي للموقع
   ========================================================== */

/* ---------- المحتوى الافتراضي ----------
   ده اللي بيظهر لو الحقل فاضي في لوحة التحكم */
const RYDEN_DEFAULTS = {
  nameAr: "رياض إبراهيم (رايدن)",
  roleAr: "Video Editor وصانع محتوى مهتم بالـ AI",
  headline: "مونتاج يوقّف السكرول.",
  tagline: "بساعدك تكون نفسك على السوشيال ميديا، بفيديوهات فيها Hook وقصة وإيقاع يخلّوا الناس تتفرج للآخر.",
  quote: "المونتاج عندي مش قص ولزق. هو السبب اللي يخلّي حد يوقف السكرول ويتفرج.",
  bio: [
    "أنا رياض إبراهيم، والناس تعرفني باسم «رايدن». Video Editor وصانع محتوى، وشغلي إني آخد الفيديو الخام وأطلع منه حاجة الناس تكمّلها للآخر.",
    "من أكتر من 4 سنين وأنا بعمل مونتاج لأكتر من 36 عميل في مجالات مختلفة: فيتنس، طب، عقارات، تطوير ذات، وبراندات. والفيديوهات اللي اشتغلت عليها عدّت 6 مليون مشاهدة. ومع الوقت فهمت إن المونتاج الحلو لوحده مش كفاية؛ لازم تفهم الفيديو بينجح ليه، من الـ Hook في أول ثانية، للـ Storytelling، لحد إمتى وإزاي ينزل.",
    "النهارده بدمج المونتاج مع الـ AI، وببني workflows تخلّي صناع المحتوى والبراندات ينتجوا أسرع وأذكى من غير ما الجودة تقل.",
    "هدفي بسيط: محتوى ميبقاش شكله حلو وبس، يبقى عنده سبب حقيقي يخلّي الناس توقف وتتفرج وتتفاعل.",
  ].join("\n"),
  services: [
    { title: "مونتاج Reels و Shorts", desc: "Hook في أول تلات ثواني، إيقاع سريع، كابشنز وساوند ديزاين يخلّوا الفيديو يتشاف للآخر." },
    { title: "موشن جرافيك", desc: "عناوين متحركة وشرح بصري وأنيميشن بسيط يدّي البراند بتاعك شكل احترافي." },
    { title: "Hook و Storytelling", desc: "قبل المونتاج بفكر معاك في الفكرة وأول جملة وترتيب القصة، عشان الفيديو يبدأ قوي ويفضل ماسك المتفرج." },
    { title: "AI Workflows", desc: "بستخدم أدوات الذكاء الاصطناعي عشان أنتج أسرع وأطلّع محتوى أكتر بنفس الجودة." },
  ],
  availability: "متاح لمشاريع جديدة",
  experience: "أكتر من 4 سنين",
  tools: "Premiere Pro، After Effects، CapCut",
  showreelUrl: "https://www.instagram.com/p/Dd4zrH3OxfT/",
  stats: [
    { value: "+6M", label: "مشاهدة على فيديوهات من مونتاجي" },
    { value: "+36", label: "عميل وبراند اشتغلت معاهم" },
    { value: "+4", label: "سنين خبرة في المونتاج" },
  ],
};

const OTHER_CATEGORY = "متنوع";

/* ---------- الألوان الخاصة بكل مجال (زي ألوان الكليبات في برامج المونتاج) ---------- */
const CATEGORY_COLORS = {
  "فيتنس": "#E3708C",
  "طبي": "#6F9BE8",
  "عقارات": "#3DB59E",
  "موشن جرافيك": "#A98BE6",
  "تطوير ذات": "#8DB85A",
  [OTHER_CATEGORY]: "#B5AC9C",
};
const EXTRA_COLORS = ["#5FB7D4", "#D47AD0", "#E08A6B", "#7FA7A0"];

function categoryColor(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return EXTRA_COLORS[h % EXTRA_COLORS.length];
}

/* ---------- استنتاج المجال واسم العميل من العنوان (للفيديوهات القديمة) ---------- */
const CATEGORY_RULES = [
  { name: "موشن جرافيك", re: /موشن|motion|أنيميشن|انيميشن|animation/i },
  { name: "فيتنس", re: /كابتن|جيم|فيت|fitness|gym|تمارين/i },
  { name: "طبي", re: /طب|دكتور|دكتورة|عياد|clinic|medical/i },
  { name: "عقارات", re: /عقار|real\s*estate|كمبوند/i },
  { name: "تطوير ذات", re: /تطوير ذات|لايف|استشار|نصايح|نصائح|كوتش|coach/i },
];

function deriveCategory(text) {
  const t = String(text || "");
  for (const r of CATEGORY_RULES) if (r.re.test(t)) return r.name;
  return "";
}

function deriveClient(title) {
  const m = String(title || "").match(/(?:^|\s|\()مع\s+(.+)$/);
  if (!m) return "";
  let c = m[1].trim();
  const opens = (c.match(/\(/g) || []).length;
  const closes = (c.match(/\)/g) || []).length;
  if (closes > opens) c = c.replace(/\s*\)\s*$/, ""); // قوس زيادة من "(مع فلان)"
  return c
    .replace(/\s+في\s+.*$/, "")
    .replace(/^شركة\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- قراءة لينك الفيديو ---------- */
function parseVideoUrl(rawUrl) {
  const url = (rawUrl || "").trim();

  // YouTube (shorts / watch / youtu.be / embed)
  const yt = [
    [/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/, "v"],
    [/youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{6,})/, "h"],
    [/youtu\.be\/([a-zA-Z0-9_-]{6,})/, "h"],
    [/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/, "h"],
  ];
  for (const [re, orientation] of yt) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      return {
        platform: "youtube",
        embedId: id,
        orientation,
        embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
        watchUrl: orientation === "v" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      };
    }
  }

  // TikTok
  const tk = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/);
  if (tk) {
    const permalink = `https://www.tiktok.com/@${tk[1]}/video/${tk[2]}`;
    return { platform: "tiktok", embedId: tk[2], orientation: "v", embedUrl: null, permalink, watchUrl: permalink };
  }

  // Instagram (reel / post)
  const ig = url.match(/instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) {
    const kind = ig[1] === "reels" ? "reel" : ig[1];
    return {
      platform: "instagram",
      embedId: ig[2],
      orientation: "v",
      embedUrl: `https://www.instagram.com/${kind}/${ig[2]}/embed/`,
      watchUrl: `https://www.instagram.com/${kind}/${ig[2]}/`,
    };
  }

  // Google Drive
  const drive = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of drive) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      return {
        platform: "drive",
        embedId: id,
        orientation: "v",
        embedUrl: `https://drive.google.com/file/d/${id}/preview`,
        watchUrl: `https://drive.google.com/file/d/${id}/view`,
      };
    }
  }

  return null;
}

const PLATFORM_NAMES = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", drive: "Google Drive" };

/* لينك التشغيل جوه الموقع */
function playerUrl(v) {
  const id = v.embedId;
  switch (v.platform) {
    case "youtube": return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    case "tiktok": return `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0&description=0`;
    case "instagram": return v.embedUrl || `https://www.instagram.com/reel/${id}/embed/`;
    case "drive": return `https://drive.google.com/file/d/${id}/preview`;
    default: return v.embedUrl || v.url || "";
  }
}

/* لينك الفيديو على المنصة نفسها */
function watchUrl(v) {
  if (v.permalink) return v.permalink;
  const parsed = parseVideoUrl(v.url || "");
  return (parsed && parsed.watchUrl) || v.url || "";
}

/* الصور المصغّرة: صورة الغلاف المرفوعة أولًا، وبعدها صورة المنصة */
function thumbCandidates(v) {
  const list = [];
  if (v.thumbURL) list.push(v.thumbURL);
  if (v.platform === "youtube") {
    if ((v.orientation || "v") === "v") list.push(`https://i.ytimg.com/vi/${v.embedId}/oar2.jpg`);
    list.push(`https://i.ytimg.com/vi/${v.embedId}/hqdefault.jpg`);
  }
  if (v.platform === "drive") list.push(`https://drive.google.com/thumbnail?id=${v.embedId}&sz=w720`);
  return list;
}

/* ---------- أدوات عامة ---------- */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toMillis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v === "number") return v;
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}

/* الترتيب: حسب الترتيب اللي اخترته من لوحة التحكم، وبعدها الأحدث */
function sortByOrder(list) {
  return list.sort((a, b) => {
    const ao = Number.isFinite(a.order), bo = Number.isFinite(b.order);
    if (ao && bo && a.order !== b.order) return a.order - b.order;
    if (ao !== bo) return ao ? -1 : 1;
    return toMillis(b.createdAt) - toMillis(a.createdAt);
  });
}

/* بيجيب عنوان فيديو اليوتيوب تلقائيًا (oEmbed) */
async function fetchYoutubeTitle(url) {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (e) {
    return null;
  }
}

/* بيجيب عنوان فيديو التيك توك تلقائيًا (oEmbed رسمي من تيك توك) */
async function fetchTiktokTitle(url) {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (e) {
    return null;
  }
}

/* بيصغّر الصورة ويحوّلها base64 عشان تتخزن في Firestore من غير Firebase Storage.
   بيقلل الجودة تلقائيًا لحد ما الصورة تبقى أصغر من الحد المسموح. */
function compressImage(file, maxW = 800, quality = 0.82, maxChars = 700000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = maxW;
        let q = quality;
        const render = () => {
          const scale = Math.min(1, w / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/jpeg", q);
        };
        let dataUrl = render();
        let guard = 0;
        while (dataUrl.length > maxChars && guard < 8) {
          if (q > 0.45) q -= 0.08;
          else w = Math.round(w * 0.82);
          dataUrl = render();
          guard++;
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
