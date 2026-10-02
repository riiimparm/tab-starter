const input = document.getElementById("url");
const pinnedBox = document.getElementById("pinned");
const list = document.getElementById("list");
const msg = document.getElementById("msg");
const count = document.getElementById("count");
const toast = document.getElementById("toast");

const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const EMPTY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';

let toastTimer;
function showToast(text = "保存しました") {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

async function load() {
  const { urls = [] } = await chrome.storage.sync.get("urls");
  // 旧形式(文字列)との互換
  return urls.map((u) => (typeof u === "string" ? { url: u, pinned: false } : u));
}

async function save(items, toastText) {
  await chrome.storage.sync.set({ urls: items });
  render(items);
  if (toastText !== null) showToast(toastText);
}

function normalize(value) {
  value = value.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = "https://" + value;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

// ファビコン取得: Googleの配信 → サイトの /favicon.ico → 頭文字
function buildIcon(url) {
  const box = document.createElement("div");
  box.className = "icon";
  const fallback = () => {
    box.className = "icon";
    box.textContent = hostOf(url).replace(/^www\./, "").charAt(0) || "?";
  };

  let u;
  try { u = new URL(url); } catch { fallback(); return box; }
  if (!/^https?:$/.test(u.protocol)) { fallback(); return box; }

  const candidates = [
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&size=64&url=${encodeURIComponent(u.origin)}`,
    `${u.origin}/favicon.ico`,
  ];

  const tryNext = (i) => {
    if (i >= candidates.length) return fallback();
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 2) return tryNext(i + 1);
      box.className = "icon has-img";
      box.textContent = "";
      box.appendChild(img);
    };
    img.onerror = () => tryNext(i + 1);
    img.src = candidates[i];
  };
  fallback(); // 取得中は頭文字を表示
  tryNext(0);
  return box;
}

function render(items) {
  list.innerHTML = "";
  count.textContent = items.length;

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.innerHTML = EMPTY_SVG + "<div>登録されているページはありません</div>";
    list.appendChild(li);
    return;
  }

  items.forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "item";

    const icon = buildIcon(item.url);

    const meta = document.createElement("div");
    meta.className = "meta";
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = hostOf(item.url);
    if (item.pinned) {
      const badge = document.createElement("span");
      badge.className = "pin-badge";
      badge.textContent = "固定";
      a.appendChild(badge);
    }
    const small = document.createElement("small");
    small.textContent = item.url;
    meta.append(a, small);

    const sw = document.createElement("label");
    sw.className = "switch";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!item.pinned;
    cb.addEventListener("change", async () => {
      const current = await load();
      current[i].pinned = cb.checked;
      await save(current);
    });
    const track = document.createElement("span");
    track.className = "track";
    const lbl = document.createElement("span");
    lbl.className = "label";
    lbl.textContent = "固定タブ";
    sw.append(cb, track, lbl);

    const del = document.createElement("button");
    del.className = "del";
    del.title = "削除";
    del.innerHTML = TRASH_SVG;
    del.addEventListener("click", async () => {
      const current = await load();
      current.splice(i, 1);
      await save(current, "削除しました");
    });

    li.append(icon, meta, sw, del);
    list.appendChild(li);
  });
}

async function add() {
  msg.textContent = "";
  const url = normalize(input.value);
  if (!url) {
    msg.textContent = "URLの形式が正しくありません";
    return;
  }
  const items = await load();
  if (items.some((it) => it.url === url)) {
    msg.textContent = "すでに登録されています";
    return;
  }
  items.push({ url, pinned: pinnedBox.checked });
  await save(items, "追加しました");
  input.value = "";
  pinnedBox.checked = false;
  input.focus();
}

document.getElementById("addBtn").addEventListener("click", add);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") add();
});

load().then(render);
