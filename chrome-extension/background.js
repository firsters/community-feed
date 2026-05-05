// 현재는 popup-driven 동기화만 사용하므로 background 는 keepalive 외 역할 없음
chrome.runtime.onInstalled.addListener(() => {
  console.log("Community Feed Cookie Sync installed");
});
