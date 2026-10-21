chrome.runtime.onStartup.addListener(async () => {
  const { urls = [] } = await chrome.storage.sync.get("urls");
  // 旧形式(文字列)との互換
  const items = urls.map((u) => (typeof u === "string" ? { url: u, pinned: false } : u));

  // 固定タブのセッション復元は onStartup より後に走るため、復元を待ってから判定する
  // ponytail: 固定待ち。取りこぼすならタブ数が安定するまでのポーリングに上げる
  await new Promise((r) => setTimeout(r, 2000));

  // 復元済み(読み込み中を含む)URLは二重に開かない
  const tabs = await chrome.tabs.query({});
  const open = new Set(tabs.flatMap((t) => [t.url, t.pendingUrl]).filter(Boolean));
  const missing = items.filter((item) => !open.has(item.url));

  missing.forEach((item, i) => {
    chrome.tabs.create({ url: item.url, active: i === 0, pinned: !!item.pinned });
  });
});
