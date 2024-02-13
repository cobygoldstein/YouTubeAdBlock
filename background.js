let prevId;

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // read changeInfo data and do something with it
  // like send the new url to contentscripts.js

  if (changeInfo.url) {
    const url = new URL(changeInfo.url);
    const urlParams = new URLSearchParams(url.search);
    const videoId = urlParams.get("v");
    if ((videoId && !prevId) || prevId !== videoId) {
      chrome.tabs.sendMessage(tabId, {
        action: "urlChange",
        url: changeInfo.url,
        prevId,
        urlParams,
      });
      prevId = videoId;
    }
  }
});

// stores message from content for popup to use
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === "Action") {
    // Store the message or handle it as needed
    chrome.storage.local.set({ statusMessage: request.data });
  }
});

// If tab is closed set to Idle
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.local.set({ statusMessage: "Idle" });
});

// If user navigates to new url, change to Idle
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    const url = new URL(changeInfo.url);
    if (!(url.hostname === "www.youtube.com" && url.pathname === "/watch")) {
      chrome.storage.local.set({ statusMessage: "Idle" });
    }
  }
});
