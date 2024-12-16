let proxyList = [];
export async function fetchProxies() {
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

export function clearProxySettings() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      console.log("Proxy settings cleared.");
      if (chrome.runtime.lastError) {
        console.error(
          "Failed to clear proxy settings:",
          chrome.runtime.lastError
        );
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
