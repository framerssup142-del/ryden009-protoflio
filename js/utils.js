/* ==========================================================
   Video link helpers
   بياخد أي لينك يوتيوب شورتس أو جوجل درايف ويطلع منه
   نوع المنصة + ID الفيديو + رابط الـ embed الجاهز للعرض
   ========================================================== */

function parseVideoUrl(rawUrl) {
  const url = (rawUrl || "").trim();

  // ---- YouTube (shorts / watch / youtu.be / already-embed) ----
  const ytPatterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const re of ytPatterns) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      return {
        platform: "youtube",
        embedId: id,
        embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
      };
    }
  }

  // ---- TikTok (official oEmbed support) ----
  const tkPatterns = [
    /tiktok\.com\/@([\w.-]+)\/video\/(\d+)/,
  ];
  for (const re of tkPatterns) {
    const m = url.match(re);
    if (m) {
      const [, username, videoId] = m;
      const permalink = `https://www.tiktok.com/@${username}/video/${videoId}`;
      return {
        platform: "tiktok",
        embedId: videoId,
        embedUrl: null,
        permalink,
        watchUrl: permalink,
      };
    }
  }

  // ---- Google Drive ----
  const drivePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of drivePatterns) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      return {
        platform: "drive",
        embedId: id,
        embedUrl: `https://drive.google.com/file/d/${id}/preview`,
        watchUrl: `https://drive.google.com/file/d/${id}/view`,
      };
    }
  }

  return null; // لينك مش معروف
}

/* بيجيب عنوان فيديو اليوتيوب تلقائيًا من عنوانه الحقيقي على المنصة (oEmbed) */
async function fetchYoutubeTitle(watchUrl) {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (e) {
    return null;
  }
}

/* بيجيب عنوان فيديو التيك توك تلقائيًا من عنوانه الحقيقي على المنصة (oEmbed رسمي من تيك توك) */
async function fetchTiktokTitle(watchUrl) {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(watchUrl)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (e) {
    return null;
  }
}

/* IntersectionObserver عام لتفعيل أنيميشن الظهور */
function initReveal(selector = ".reveal", options = {}) {
  const els = document.querySelectorAll(selector);
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, ...options }
  );
  els.forEach((el) => io.observe(el));
}

/* بيلف كل كلمة في نص لوحدها جوه span عشان الأنيميشن يظهرها كلمة كلمة */
function wrapWords(text) {
  return (text || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => `<span class="w" style="animation-delay:${i * 45}ms">${w}</span>`)
    .join(" ");
}
