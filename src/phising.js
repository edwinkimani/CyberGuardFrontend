document.addEventListener("DOMContentLoaded", function () {
    const phishingToggle = document.getElementById("phishingToggle");
  
    // Load saved settings from chrome.storage when the popup is opened
    chrome.storage.sync.get(["phishing"], function (data) {
      if (data.phishing !== undefined) {
        phishingToggle.checked = data.phishing;  // Set the toggle based on saved setting
      }
    });
  
    // Save the adblocker setting when the user toggles the switch
    phishingToggle.addEventListener("change", function () {
      const phishing = phishingToggle.checked;
      chrome.storage.sync.set({ phishing }, function () {
        console.log("phishing setting saved.");
      });
    });
  });
  