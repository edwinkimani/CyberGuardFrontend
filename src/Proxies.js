const proxyButton = document.getElementById("proxyToggle");
const proxyInfo = document.getElementById("proxyInfo");

let isProxyEnabled = false;

function updatePopup(proxyList) {
    proxyInfo.innerHTML = proxyList
        .map(
            (proxy) => `
            <div>
              <img src="https://flagpedia.net/data/flags/icon/72x54/${proxy.location.country.toLowerCase()}.png" alt="${proxy.location.country}" width="20" height="15">
              <strong>${proxy.location.city}, ${proxy.location.region}</strong> - ${proxy.ip}:${proxy.port}
            </div>
          `
        )
        .join("");
}

// Toggle proxy on button click
proxyButton.addEventListener("click", () => {
    isProxyEnabled = !isProxyEnabled; // Toggle the state
    if (isProxyEnabled) {
        chrome.runtime.sendMessage({ action: "startProxy" });
        proxyButton.textContent = "Stop Proxy";
    } else {
        chrome.runtime.sendMessage({ action: "stopProxy" });
        proxyButton.textContent = "Start Proxy";
        proxyInfo.innerHTML = ""; // Clear display when stopping proxy
    }
});

// Listen for updates from the background script
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "updatePopup") {
        updatePopup(request.proxies);
    }
});

// Check if proxies are already set and display them on popup load
chrome.storage.local.get("proxies", (data) => {
    if (data.proxies && data.proxies.length > 0) {
        isProxyEnabled = true;
        proxyButton.textContent = "Stop Proxy";
        updatePopup(data.proxies); // Display stored proxies
    } else {
        proxyButton.textContent = "Start Proxy";
    }
});
