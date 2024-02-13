// Updates status in popup.html with stored status from background,js
document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(["statusMessage"], function (result) {
    document.getElementById("statusMessage").textContent = result.statusMessage;
  });
});

// Trigger for manually aborting from popup. Recieved in content.js
document.addEventListener("DOMContentLoaded", function () {
  var deactivateButton = document.getElementById("deactivateButton");
  if (deactivateButton) {
    deactivateButton.addEventListener("click", function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "abort" });
      });
      document.getElementById("statusMessage").textContent =
        "Deactivated Manually";
      window.close();
    });
  }
});
