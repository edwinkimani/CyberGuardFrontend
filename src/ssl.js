chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateSSLInfo") {
      console.log(request.sslInfo);
      updateSSLInfo(request.sslInfo);
    }
  });
  
  function updateSSLInfo(sslInfo) {
    const sslInfoDiv = document.getElementById("ssl_info");
    const spinner = sslInfoDiv.querySelector('.spinner-border');
    if (spinner) {
      spinner.style.display = 'none'; // Hide the spinner
    }
  
    if (sslInfo) {
      sslInfoDiv.textContent = "Certificate Information";  // Clear the loading message
      document.getElementById("ssl_domain").textContent = `${sslInfo.issuedTo || 'N/A'}`;
      document.getElementById("issued_to").textContent = sslInfo.issuedTo || "N/A";
      document.getElementById("issued_by").textContent = sslInfo.issuedBy || "N/A";
      document.getElementById("valid_period").textContent = sslInfo.validityPeriod ? `${sslInfo.validityPeriod.validFrom} - ${sslInfo.validityPeriod.validTo}` : "N/A";
      document.getElementById("is_valid").textContent = sslInfo.isValid ? "Valid" : "Invalid";
    } else {
      sslInfoDiv.textContent = "Error retrieving SSL information";  // Handle error case
    }
  }
  
  // Request SSL information on load (optional)
  chrome.runtime.sendMessage({ action: "getSSLInfo" });
  