export async function setProxyChaining(proxyList) {
    if (proxyList.length > 0) {
      const pacScript = `
        function FindProxyForURL(url, host) {
          var proxies = [${proxyList
            .map((p) => `"PROXY ${p.ip}:${p.port}"`)
            .join(", ")}];
          if (proxies.length === 0) {
            return "DIRECT";
          }
          return proxies.join("; ");
        }
      `;
  
      const config = {
        mode: "pac_script",
        pacScript: {
          data: pacScript,
        },
      };
  
      console.log("Setting proxy configuration:", config);
  
      try {
        await new Promise((resolve, reject) => {
          chrome.proxy.settings.set({ value: config, scope: "regular" }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Proxy setup failed: ${chrome.runtime.lastError.message}`));
            } else {
              console.log("Proxy chaining enabled.");
              // Notify popup to update display
              chrome.runtime.sendMessage({ action: "updatePopup", proxies: proxyList });
              resolve();
            }
          });
        });
      } catch (error) {
        console.error("Proxy setup failed:", error);
      }
    } else {
      console.log("No proxies to set.");
    }
  }