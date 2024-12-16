document.addEventListener("DOMContentLoaded", function () {
    const adblockerToggle = document.getElementById("adblocker");
    const popupBlockerToggle = document.getElementById("popupBlocker");
    const adCountElement = document.getElementById("adCount");
    const currentDomainElement = document.getElementById("currentDomain");

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const url = new URL(tabs[0].url); // Get the URL of the active tab
      const domain = url.hostname; // Extract the domain (e.g., "www.example.com")
      currentDomainElement.textContent = domain;
    });
    
  
    // Load saved settings from chrome.storage when the popup is opened
    chrome.storage.sync.get(["adblocker", "popupBlocker", "adCounter"], function (data) {
      if (data.adblocker !== undefined) {
        adblockerToggle.checked = data.adblocker;  // Set the toggle based on saved setting
      }
      if (data.popupBlocker !== undefined) {
        popupBlockerToggle.checked = data.popupBlocker;  // Set the toggle based on saved setting
      }
      if (data.adCounter !== undefined) {
        adCountElement.textContent = data.adCounter;  // Display the number of blocked ads
      }
    });
  
    // Save the adblocker setting when the user toggles the switch
    adblockerToggle.addEventListener("change", function () {
      const adblocker = adblockerToggle.checked;
      chrome.storage.sync.set({ adblocker }, function () {
        console.log("Adblocker setting saved.");
      });
    });
  
    // Save the popupBlocker setting when the user toggles the switch
    popupBlockerToggle.addEventListener("change", function () {
      const popupBlocker = popupBlockerToggle.checked;
      chrome.storage.sync.set({ popupBlocker }, function () {
        console.log("Popup Blocker setting saved.");
      });
    });
  });
  