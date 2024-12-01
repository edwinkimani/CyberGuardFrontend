const tabUrls = new Map();
const trustedIssuers = [
  "Let's Encrypt Authority X3",
  "DigiCert SHA2 Secure Server CA",
  "Microsoft Azure RSA TLS Issuing CA 04",

  // Add more trusted issuers below (ensure accurate names)

  // DigiCert
  "DigiCert Global Root CA",
  "DigiCert High Assurance EV Root CA",
  "DigiCert SHA2 High Assurance Server CA",

  // Sectigo (formerly Comodo)
  "Sectigo RSA Domain Validation Secure Server CA",
  "Sectigo RSA Organization Validation Secure Server CA",
  "USERTrust RSA Certification Authority",

  // GlobalSign
  "GlobalSign Root CA",
  "GlobalSign Root CA - R2",
  "GlobalSign Root CA - R3",

  // ISRG (Let's Encrypt)
  "ISRG Root X1",
  "ISRG Root X2",

  // Entrust
  "Entrust Root Certification Authority - G2",

  // Amazon
  "Amazon Root CA 1",
  "Amazon Root CA 2",
  "Amazon Root CA 3",
  "Amazon Root CA 4",

  "GTS Root R1",
  "Go Daddy Root Certificate Authority - G2",
  "GeoTrust Global CA",
  "RapidSSL TLS DV RSA Mixed SHA256 2020 CA1",
];

//**this block of code is responsible for blocking sites in the browser
// tabs the tabs URLs are taken and send to the back-end server where 
//it is checked against a large list of URLs to see if it belongs to a porn site */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = tab.url;

    const parsedUrl = new URL(url);
    // Skip if URL is the BlockPage.html or if it's a new tab page
    if (
      url.includes("BlockPage.html") ||
      url === "chrome://newtab/" ||
      url === "edge://newtab/"
    ) {
      return; // Early return if the URL matches the conditions
    }

    // Skip if URL starts with 'chrome://' or 'chrome-extension://' or 'edge://'
    if (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("edge://")
    ) {
      return; // Early return if the URL is a browser internal page
    }

    // Check if the URL exists in IndexedDB
    try {
      const data = await getDataByValue(parsedUrl.origin); // Check if the URL is in IndexedDB
      if (data) {
        tabUrls.set(tabId, parsedUrl.origin);
        console.log("Data found for URL:", data);
        return; // Stop further execution if data is found
      }
    } catch (error) {
      console.log("No data found for the URL in IndexedDB or error:", error);
    }

    // Fetch the URL list from your server to see if it should be blocked
    fetch(
      `http://127.0.0.1:8000/api/adultSites/${encodeURIComponent(
        parsedUrl.origin
      )}`,
      {
        method: "GET",
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok (status ${response.status})`
          );
        }
        return response.json();
      })
      .then((responseData) => {
        if (responseData.item === true) {
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL("/pages/BlockPage.html"),
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching the URL list:", error);
      });

    // Fetch the URL list from your server to see if it should be blocked
    fetch(
      `http://127.0.0.1:8000/api/phishing-checks/${encodeURIComponent(
        parsedUrl.origin
      )}`,
      {
        method: "GET",
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok (status ${response.status})`
          );
        }
        return response.json();
      })
      .then((responseData) => {
        if (responseData.item === true) {
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL("/pages/BlockPagePhissing.html"),
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching the URL list:", error);
      });
  }
});


//**blocks the sites that http:// and https:// that don't have a valid certificate*/
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Skip if URL belongs to extension itself to prevent looping
    if (tab.url.startsWith(chrome.runtime.getURL(""))) {
      return;
    }
    const url = tab.url;
    try {
      // Check for HTTPS URLs
      if (url.startsWith("https://")) {
        console.log("HTTPS URL detected:", url);
        // Use chrome.tabs.get() to retrieve SSL info if available
        chrome.tabs.get(tabId, (tabInfo) => {
          if (tabInfo) {
            // If certificate information is available
            const cert = tabInfo.ssl ? tabInfo.ssl.cert : null;
            if (cert) {
              // 1. Verify the issuer
              const isValidIssuer = verifyIssuer(cert);
              // 2. Check validity dates
              const now = new Date();
              const validFrom = new Date(cert.validFrom);
              const validTo = new Date(cert.validTo);
              const certificateIsValid = validFrom <= now && validTo >= now;

              // 3. Domain matching
              const isDomainMatch = checkDomainMatch(cert, url);

              if (isValidIssuer && certificateIsValid && isDomainMatch) {
                chrome.action.setIcon({
                  path: "./icons/checked.png",
                  tabId: tabId,
                });
              } else {
                console.warn("Invalid or untrusted SSL certificate for:", url);
                chrome.action.setIcon({
                  path: "./icons/delete.png",
                  tabId: tabId,
                });
                chrome.notifications.create({
                  type: "basic",
                  iconUrl: "./icons/delete.png",
                  title: "SSL Certificate Warning",
                  message:
                    "The website has an invalid or untrusted SSL certificate.",
                });
              }
            } else {
              // Handle cases where certificate information is not available
              console.warn("Certificate information not available for:", url);
              chrome.action.setIcon({
                path: "./icons/delete.png",
                tabId: tabId,
              });
            }
          }
        });
      } else if (url.startsWith("http://")) {
        console.log("HTTP URL detected:", url);
        const parsedUrl = new URL(url);
        const data = await getDataByValue(parsedUrl.origin);
        if (data) {
          tabUrls.set(tabId, parsedUrl.origin);
          console.log("Trusted URL found in IndexedDB:", data);
          return;
        } else {
          console.log("Blocking HTTP URL:", url);
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL("/pages/BlockPage.html"),
          });
        }
      }
    } catch (error) {
      console.error("Error processing URL:", error);
      chrome.action.setIcon({ path: "./icons/delete.png", tabId: tabId });
    }
  }
});
// Function to verify the issuer
function verifyIssuer(cert) {
  let issuer = cert.issuer;
  return trustedIssuers.some((trustedIssuer) => issuer.includes(trustedIssuer));
}
// Function to check domain matching
function checkDomainMatch(cert, url) {
  const hostname = new URL(url).hostname;
  let cn = cert.subject.CN; // Adjust how you extract the CN
  let sans = cert.subject.SANs; // Adjust how you extract SANs (if available)
  // Check if the hostname matches the CN or any of the SANs
  return hostname === cn || (sans && sans.includes(hostname));
}


//function that removes the tab from the map when the tab is closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    // Retrieve the URL from the Map
    const url = tabUrls.get(tabId);
    tabUrls.delete(tabId); // Remove the URL from the Map

    if (url) {
      const parsedUrl = new URL(url);
      // Use your existing removeDataByValue function
      await removeDataByValue(parsedUrl.origin);
      console.log("URL removed from IndexedDB:", url);
    }
  } catch (error) {
    console.error("Error processing removed tab:", error);
  }
});
// Function to remove data from IndexedDB by value
async function removeDataByValue(url) {
  console.log(url);
  const db = await openDatabase();
  const transaction = db.transaction(["myObjectStore"], "readwrite");
  const store = transaction.objectStore("myObjectStore");

  // Get all records from the object store
  const getAllRequest = store.getAll();

  getAllRequest.onsuccess = (event) => {
    const allRecords = event.target.result;

    // Extract the base URL (e.g., "https://x.com/")
    const baseUrl = new URL(url).origin; // Add trailing slash

    // Find records with matching base URLs
    const recordsToDelete = allRecords.filter(
      (record) => record.value === url // Directly compare with baseUrl (including /)
    );

    if (recordsToDelete.length > 0) {
      // Delete the matching records by their IDs
      recordsToDelete.forEach((record) => {
        const deleteRequest = store.delete(record.id);

        deleteRequest.onsuccess = () => {
          console.log("Successfully removed:", record.value);
        };

        deleteRequest.onerror = (event) => {
          console.error("Error removing data:", event);
        };
      });
    } else {
      console.log("No matching URLs found in IndexedDB:", baseUrl);
    }
  };

  getAllRequest.onerror = (event) => {
    console.error("Error getting all data:", event);
  };
}
// Open the IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MyExtensionDatabase", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("myObjectStore")) {
        db.createObjectStore("myObjectStore", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(`Database error: ${event.target.errorCode}`);
    };
  });
}
// Function to get data by value from IndexedDB
function getDataByValue(valueToFind) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(["myObjectStore"], "readonly");
        const store = transaction.objectStore("myObjectStore");

        const request = store.openCursor(); // Open a cursor to iterate over entries
        let found = false;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.value === valueToFind) {
              found = true;
              resolve(cursor.value); // Return the full object if a match is found
              return;
            }
            cursor.continue(); // Move to the next item
          } else {
            // Resolve with null instead of rejecting when no data is found
            if (!found) resolve(null);
          }
        };

        request.onerror = (event) => reject("Error searching data:", event);
      })
      .catch((error) => reject("Database error:", error));
  });
}

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
      var proxies = [${proxyList
        .map((p) => `"PROXY ${p.ip}:${p.port}"`)
        .join(", ")}];
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkPassword") {
    checkPasswordStrength(request.password)
      .then((isBreached) => {
        sendResponse({ passwordStrength, isBreached });
      })
      .catch((error) => {
        console.error(error);
        sendResponse({ error: "Failed to check password" });
      });
    return true; // Keeps the message channel open for async response
  }
});

async function checkPasswordStrength(password) {
  const zxcvbn = await import("./src/zxcvbn.js");
  const score = zxcvbn(password).score;
  return (score / 4) * 100; // Convert to percentage
}

async function checkPasswordBreach(password) {
  try {
    const response = await fetch("http://localhost:8000/api/check-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error("Failed to check password breach");
    }

    const data = await response.json();
    return data.isBreached;
  } catch (error) {
    console.error("Error fetching password breach status:", error);
    throw error;
  }
}

async function sha1(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log(`this is the link to the ${message}`);
  if (message.links) {
    try {
      // Send links to the backend for phishing validation
      const phishingResults = await validateLinksWithBackend(message.links);

      if (phishingResults && phishingResults.length > 0) {
        console.warn("Phishing links found:", phishingResults);
        // Send phishing links to the popup or notify the user
      } else {
        console.log("No phishing links detected.");
      }
    } catch (error) {
      console.error("Error validating links with backend:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const phishingUrls = []; // Example list

  const phishingLinks = request.links.filter((link) =>
    phishingUrls.includes(link)
  );
  // Send back the phishing links to the content script
  validateLinksWithBackend({ phishingLinks });
});

// Function to send collected links to the backend for validation
const validateLinksWithBackend = async (links) => {
  console.log("Collected Links:", links); // Add this line to check the links array
  try {
    const response = await fetch("http://127.0.0.1:8000/api/phishing-checks/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: links }),
    });

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   console.error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
    //   throw new Error(`HTTP error! Status: ${response.status}`);
    // }

    const data = await response.json();
    console.log("Backend Response:", data);
    return data;
  } catch (error) {
    console.error("Error contacting backend:", error);
    throw error;
  }
};

// Fetch the blocked word list from the provided URL
fetch(
  "https://raw.githubusercontent.com/edwinkimani/safe-search-word-list/refs/heads/master/BlockedWordList.txt"
)
  .then((response) => response.text())
  .then((data) => {
    // Split the text into an array of blocked words
    const blockedWords = data.trim().split("\n");

    // Function to check if a search query contains any blocked words
    function containsBlockedWords(query) {
      const lowercaseQuery = query.toLowerCase();
      for (const word of blockedWords) {
        if (lowercaseQuery.includes(word.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    // Listen for message from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "checkSearch") {
        const containsBlocked = containsBlockedWords(request.query);
        sendResponse({ blocked: containsBlocked });
      }
    });
  })
  .catch((error) => {
    console.error("Error fetching blocked word list:", error);
  });
