chrome.runtime.onStartup.addListener(async () => {
  const { urls = [] } = await chrome.storage.sync.get("urls");
  // 旧形式(文字列)との互換
  const items = urls.map((u) => (typeof u === "string" ? { url: u, pinned: false } : u));
  items.forEach((item, i) => {
    chrome.tabs.create({ url: item.url, active: i === 0, pinned: !!item.pinned });
  });
});
