document.addEventListener("DOMContentLoaded", function () {
  // Fetch the blocked count from chrome.storage.sync
  const adCountElement = document.getElementById("adCount");
  const blockedCounterElement = document.getElementById("blockedCounter");
  
  // Ensure the element exists before accessing it
  if (!adCountElement) {
    console.error("adCount element not found!");
    return; // Exit if the element is not found
  }

  if (!blockedCounterElement) {
    console.error("blockedCounter element not found!");
    return; // Exit if the element is not found
  }

  // Fetch the count from chrome storage
  chrome.storage.sync.get({ blockedCount: 0 }, (result) => {
    // Ensure that the result is valid and contains the blockedCount
    const blockedCount = result.blockedCount || 0;

    // If there's a counter element, update its text content
    const counterElement = document.getElementById("blockedCounter");
    if (counterElement) {
      blockedCounterElement.textContent = blockedCount; // Display the count
    } else {
      console.error("blockedCounter element not found!");
    }
  });

  chrome.storage.sync.get(["adCounter"], function (data) {
    if (data.adCounter !== undefined) {
      adCountElement.textContent = data.adCounter;  // Display the number of blocked ads
    }
  });
});

function clearTimeoutFunction() {
  window.location.href = "vpn.html";
}
// document.getElementById('navigateToVpn').addEventListener('click', clearTimeoutFunction);

const toastTrigger = document.getElementById("liveToastBtn");
const toastLiveExample = document.getElementById("liveToast");
if (toastTrigger) {
  toastTrigger.addEventListener("click", () => {
    const toast = new bootstrap.Toast(toastLiveExample);

    toast.show();
  });
}
