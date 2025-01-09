chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSSLInfo") {
    console.log(request.sslInfo);
    updateSSLInfo(request.sslInfo);
  }
});

function updateSSLInfo(sslInfo) {
  console.log("Received SSL Info:", sslInfo);  // Log to check the SSL info structure

  const sslInfoDiv = document.getElementById("ssl_info");
  const spinner = sslInfoDiv.querySelector(".spinner-border");

  if (spinner) {
    spinner.style.display = "none"; // Hide spinner after data is fetched
  }

  // Check if sslInfo is properly structured
  if (sslInfo) {
    const { isValid, issuedTo, issuedBy, validityPeriod } = sslInfo;  // Directly destructure the response

    let status = "Invalid";
    let statusClass = "text-danger";
    let validPeriod = "N/A - N/A";

    // If validityPeriod is available, format it
    if (validityPeriod) {
      validPeriod = `${validityPeriod.validFrom} - ${validityPeriod.validTo}`;
    }

    // Set status and class based on isValid
    if (isValid) {
      status = "Valid";
      statusClass = "text-success";
    }

    // Update the DOM elements with SSL details
    document.getElementById("issued_to").textContent = issuedTo || "N/A";
    document.getElementById("issued_by").textContent = issuedBy || "N/A";
    document.getElementById("valid_period").textContent = validPeriod;
    document.getElementById("is_valid").textContent = status;

    // Update the status color based on SSL validity
    const statusElement = document.getElementById("is_valid");
    statusElement.classList.remove("text-success", "text-danger");
    statusElement.classList.add(statusClass);

    sslInfoDiv.classList.remove("alert-info");
    sslInfoDiv.classList.add(statusClass === "text-success" ? "alert-success" : "alert-danger");
  } else {
    sslInfoDiv.classList.remove("alert-info");
    sslInfoDiv.classList.add("alert-danger");
    sslInfoDiv.innerHTML = "Error retrieving SSL information";
  }
}

// Trigger SSL check on page load (optional)
chrome.runtime.sendMessage({ action: "getSSLInfo" });

document.addEventListener("DOMContentLoaded", function () {
  const httpToggle = document.getElementById("httpToggle");

  // Load saved settings from chrome.storage when the popup is opened
  chrome.storage.sync.get(["http"], function (data) {
    if (data.http !== undefined) {
      httpToggle.checked = data.http; // Set the toggle based on saved setting
    }
  });

  // Save the adblocker setting when the user toggles the switch
  httpToggle.addEventListener("change", function () {
    const http = httpToggle.checked;
    chrome.storage.sync.set({ http }, function () {
      console.log("http setting saved.");
    });
  });
});
