chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Ensure the page is fully loaded
  if (changeInfo.status === "complete" && tab.url) {
    const url = tab.url;

    // Skip if URL is the BlockPage.html or if it's a new tab page
    if (url.includes("BlockPage.html") || url === "chrome://newtab/") {
      return;
    }

    // Skip if URL starts with 'chrome://' or any other specific conditions you want to set
    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
      return;
    }

    console.log("Checking URL:", url);

    // Fetch the URL list from your server to see if it should be blocked
    fetch(`http://127.0.0.1:8000/api/adultSites/${encodeURIComponent(url)}`, {
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok (status ${response.status})`);
        }
        return response.json();
      })
      .then((responseData) => {
        // Check if the URL is in the database (assuming `responseData.item` exists for blocked URLs)
        if (responseData.item === true) {
          console.log("Blocking URL:", url);
          // Redirect to the custom BlockPage.html
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL("/pages/BlockPage.html") });
        }
      })
      .catch((error) => {
        console.error("Error fetching the URL list:", error);
      });
  }
});



// Background script (sw.js)
let proxyList = [];
let isProxyEnabled = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

// Fetch proxies from the API
async function fetchProxies() {
  return await fetch("http://127.0.0.1:8000/api/proxyChains")
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch proxies");
      return response.json();
    })
    .then((data) => {
      proxyList = data.reachableIPs || [];
      console.log("Fetched proxies:", proxyList);
      // Store the proxy list in Chrome storage
      chrome.storage.local.set({ proxies: proxyList });
      return proxyList;
    })
    .catch((error) => console.error("Error fetching proxies:", error));
}

// Set the proxy chaining
function setProxyChaining() {
  if (!proxyList.length) return;

  const pacScript = `
    function FindProxyForURL(url, host) {
      var proxies = [${proxyList.map((p) => `"PROXY ${p.ip}:${p.port}"`).join(", ")}];
      return proxies.join("; ");
    }
  `;

  const config = {
    mode: "pacScript",
    pacScript: { data: pacScript },
  };

  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Proxy setup failed:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log("Proxy chaining enabled.");
        isProxyEnabled = true;
        resolve();
      }
    });
  });
}

// Clear the proxy settings
function clearProxySettings() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      console.log("Proxy settings cleared.");
      isProxyEnabled = false;
      if (chrome.runtime.lastError) {
        console.error("Failed to clear proxy settings:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Start proxy chaining
function startProxyChaining() {
  fetchProxies().then(() => setProxyChaining());
    // Notify popup to update display
    chrome.runtime.sendMessage({ action: "updatePopup", proxies: proxyList });
}

// Check if proxies are already set when the popup opens
function checkProxyStatus() {
  chrome.storage.local.get("proxies", (data) => {
    if (data.proxies && data.proxies.length > 0) {
      proxyList = data.proxies;
      setProxyChaining();
    }
  });
}

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "startProxy") {
      startProxyChaining();
  } else if (request.action === "stopProxy") {
      clearProxySettings();
      chrome.runtime.sendMessage({ action: "updatePopup", proxies: [] }); // Clear proxies in popup
  }
});
// Automatically check for proxy status
checkProxyStatus();

chrome.webRequest.onCompleted.addListener(
  (details) => {
      console.log("Request completed:", details);
  },
  { urls: ["<all_urls>"] }
);

