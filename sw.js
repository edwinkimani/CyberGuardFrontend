import { fetchProxies, clearProxySettings } from "./utilities/storage.js";
import { setProxyChaining } from "./utilities/proxy.js";

let block18SitesEnabled = false;

// Initialize block18Sites state from chrome storage
chrome.storage.sync.get("block18sites", (result) => {
  block18SitesEnabled = result.block18sites || false; // Default to false if not set
  console.log("block18SitesEnabled:", block18SitesEnabled);
});

// Listen for changes to the block18Sites state
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync" && changes.block18sites) {
    block18SitesEnabled = changes.block18sites.newValue;
    console.log("block18SitesEnabled updated to:", block18SitesEnabled);
  }
});

const tabUrls = new Map();
//**this block of code is responsible for blocking sites in the browser
// tabs the tabs URLs are taken and send to the back-end server where
//it is checked against a large list of URLs to see if it belongs to a porn site */
//start
//**********
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!block18SitesEnabled) return; // Skip if block18Sites is disabled
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
          // Block the site and redirect to BlockPage.html
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL("/pages/BlockPage.html"),
          });

          // Update the blocked sites counter in chrome.storage.sync
          chrome.storage.sync.get({ blockedCount: 0 }, (result) => {
            const updatedCount = result.blockedCount + 1;
            chrome.storage.sync.set({ blockedCount: updatedCount }, () => {
              console.log(`Blocked sites counter updated to: ${updatedCount}`);
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching the URL list:", error);
      });
  }
});
//**********
//end


//**this block of code is responsible for blocking phishing sites that the user
// visits in the browser */
//start
//**********
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
//**********
//end

//**blocks the sites that http://
//start
//**********
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Skip if URL belongs to extension itself to prevent looping
    if (tab.url.startsWith(chrome.runtime.getURL(""))) {
      return;
    }
    const url = tab.url;
    try {
      // Check for HTTPS URLs
      if (url.startsWith("http://")) {
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
//**********
//end
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
    console.log("All records:", allRecords);  // Log all records to check the data
  
    if (!Array.isArray(allRecords)) {
      console.error("Expected an array but got:", allRecords);
      return;
    }
  
    const baseUrl = new URL(url).origin;
  
    const recordsToDelete = allRecords.filter(
      (record) => record.value === url
    );
  
    if (recordsToDelete.length > 0) {
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
let proxyList;
let isProxyEnabled = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "startProxy") {
    startProxyChaining()
      .then(() => console.log("Proxy chaining started."))
      .catch((error) =>
        console.error("Failed to start proxy chaining:", error)
      );
  } else if (request.action === "stopProxy") {
    clearProxySettings()
      .then(() => {
        chrome.runtime.sendMessage({ action: "updatePopup", proxies: [] });
        console.log("Proxy chaining stopped.");
      })
      .catch((error) => console.error("Failed to stop proxy chaining:", error));
  }
});

// Start proxy chaining function
async function startProxyChaining() {
  try {
    proxyList = await fetchProxies();
    console.log("Proxy list after fetching:", proxyList); // Log the proxy list

    if (proxyList.length > 0) {
      await setProxyChaining(proxyList);
      console.log(
        `${proxyList.length} proxies fetched and set up successfully.`
      );
      // Notify popup to update display
      chrome.runtime.sendMessage({ action: "updatePopup", proxies: proxyList });
    } else {
      console.warn("No proxies fetched, skipping proxy setup.");
    }
  } catch (error) {
    console.error("Error during proxy setup:", error);
  }
}

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
  if (request.links) {
    const phishingLinks = request.links.filter((link) =>
      phishingUrls.includes(link)
    );
     // Send back the phishing links to the content script
    validateLinksWithBackend({ phishingLinks });
  }
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_PASSWORD") {
    const password = message.password;

    // Check if the password exists in the breached list
    fetch("http://localhost:8000/api/check-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);

        // Prepare the message for the content script
        let alertMessage = data.message || "An error occurred.";
        let similarPasswordsInfo = "";

        // Check if similarPasswords exists and is not empty
        if (data.similarPasswords && data.similarPasswords.length > 0) {
          similarPasswordsInfo = data.similarPasswords
            .map((password) => {
              return `Similar password: ${password.word} (Similarity: ${password.similarity}%)`;
            })
            .join("\n");
        }

        // Combine the message and similar passwords info
        if (similarPasswordsInfo) {
          alertMessage += `\n\n${similarPasswordsInfo}`;
        }

        // Send a message to the content script to display the alert
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "SHOW_ALERT",
            message: alertMessage, // Send the combined message
          });
        });
      })
      .catch((error) => {
        console.error("Error checking password:", error);
        sendResponse({ error: "Failed to check password" });
      });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "storePassword") {
    // Retrieve the user data from Chrome storage
    chrome.storage.sync.get("user", (result) => {
      if (result.user) {
        const data = {
          url: message.url,
          password: message.password,
          uid: result.user.uid, // Assuming `uid` uniquely identifies the user
        };

        // Replace with your backend API URL
        const backendUrl = "http://localhost:8000/api/store-password";

        // Send the data to the backend
        fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
          .then((response) => {
            if (response.ok) {
              sendResponse({ success: true });
            } else {
              return response.json().then((error) => {
                sendResponse({ success: false, error });
              });
            }
          })
          .catch((error) => {
            console.error("Error sending data to backend:", error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        console.log("No user data found.");
        sendResponse({ success: false, error: "User not logged in." });
      }
    });

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});


chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  if (!tabId) return;

  try {
    // Attach to the tab for debugging
    await chrome.debugger.attach({ tabId }, "1.3");

    // Enable Network domain to capture SSL details
    await chrome.debugger.sendCommand({ tabId }, "Network.enable");

    // Listen for Security state changes
    await chrome.debugger.sendCommand({ tabId }, "Security.enable");
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (method === "Security.securityStateChanged") {
        const { securityState, explanations } = params;
        chrome.runtime.sendMessage({
          securityState,
          explanations,
        });

        // Detach the debugger after receiving data
        chrome.debugger.detach({ tabId });
      }
    });
  } catch (error) {
    console.error("Error attaching debugger:", error);
    if (tabId) chrome.debugger.detach({ tabId });
  }
});

//get ssl infomation from the content script and send it to the popup page
//*********** 
//start
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSSLInfo") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const url = tabs[0].url;
        const baseUrl = getBaseUrl(url);

       await getSSLCertificateInfo(baseUrl)
          .then((sslInfo) => {
            chrome.runtime.sendMessage({
              action: "updateSSLInfo",
              sslInfo: sslInfo
            });
          })
          .catch((error) => {
            console.error("Error fetching SSL data:", error);
            chrome.runtime.sendMessage({
              action: "updateSSLInfo",
              sslInfo: null
            });
          });
      } else {
        chrome.runtime.sendMessage({
          action: "updateSSLInfo",
          sslInfo: null
        });
      }
    });
  }
});

function getBaseUrl(url) {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
}

async function getSSLCertificateInfo(baseUrl) {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/sslCertificate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain: baseUrl })
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching SSL data:", error);
    return null;
  }
}
//***********
// end

//implement safe search in the background script. this script is used to send the message to the content script
//**********
//start

//**********
//end
