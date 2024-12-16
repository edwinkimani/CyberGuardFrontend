const proxyButton = document.getElementById("proxyToggle");
const proxyInfo = document.getElementById("proxyInfo");
const loading = document.getElementById("loading");

let isProxyEnabled = false;

// Function to update the UI for proxy statistics
function updateStats(proxyId, stats) {
  const proxyElement = document.getElementById(`proxy-${proxyId}`);
  if (proxyElement) {
    proxyElement.querySelector('.download-speed').textContent = `Download: ${stats.downloadSpeed} Mbps`;
    proxyElement.querySelector('.upload-speed').textContent = `Upload: ${stats.uploadSpeed} Mbps`;
    proxyElement.querySelector('.latency').textContent = `Latency: ${stats.latency} ms`;
    proxyElement.querySelector('.time-connected').textContent = `Time Connected: ${stats.timeConnected} s`;
  }
}

// Function to fetch and update proxy stats dynamically
async function fetchAndUpdateStats(proxyId, ip) {
  try {
    const response = await fetch(`/stats?ip=${ip}`);
    if (response.ok) {
      const stats = await response.json();
      updateStats(proxyId, stats);
    }
  } catch (error) {
    console.error(`Error fetching stats for proxy ${proxyId}:`, error);
  }
}

// Function to initialize stats update intervals
function startStatsUpdates(proxyList) {
  proxyList.forEach((proxy, index) => {
    setInterval(() => fetchAndUpdateStats(index, proxy.ip), 5000); // Update stats every 5 seconds
  });
}

// Function to display proxy information and stats
function updatePopup(proxyList) {
  loading.style.display = "none"; // Hide the loader when proxies are loaded
  proxyInfo.innerHTML = proxyList
    .map(
      (proxy, index) => `
        <div id="proxy-${index}" class="proxy-container row rounded-3 mt-4 m-2" style="background-color: #D4EDDA; min-height: 40px; color: black;">
          <img 
            src="https://flagpedia.net/data/flags/icon/72x54/${proxy.location.country.toLowerCase()}.png" 
            alt="${proxy.location.country}" 
            style="width: auto; max-height: 40px; height: auto; object-fit: cover;" 
            class="me-2 m-1"
          >
          <span>
            <strong>${proxy.location.city}, ${proxy.location.region}</strong> - ${proxy.ip}:${proxy.port}
          </span>
          <div class="stats">
            <span class="download-speed">Download: N/A</span><br>
            <span class="upload-speed">Upload: N/A</span><br>
            <span class="latency">Latency: N/A</span><br>
            <span class="time-connected">Time Connected: N/A</span>
          </div>
        </div>
      `
    )
    .join("");

  // Start fetching stats for each proxy
  startStatsUpdates(proxyList);
}

// Toggle proxy on button click
proxyButton.addEventListener("click", () => {
  isProxyEnabled = !isProxyEnabled; // Toggle the state
  if (isProxyEnabled) {
    chrome.runtime.sendMessage({ action: "startProxy" });
    proxyButton.textContent = "Stop";
    proxyButton.style.backgroundColor = "#00B6B6"; // Green when active
    loading.style.display = "block"; // Show the loader when starting
  } else {
    chrome.runtime.sendMessage({ action: "stopProxy" });
    proxyButton.textContent = "Start";
    proxyButton.style.backgroundColor = "#8f8f8f"; // Gray when inactive
    proxyInfo.innerHTML = ""; // Clear display when stopping proxy
  }
});

// Listen for updates from the background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "updatePopup") {
    console.log("Received proxies from background script:", request.proxies);
    updatePopup(request.proxies);
  }
});

// Check if proxies are already set and display them on popup load
chrome.storage.local.get("proxies", (data) => {
  if (data.proxies && data.proxies.length > 0) {
    isProxyEnabled = true;
    proxyButton.textContent = "Stop";
    proxyButton.style.backgroundColor = "#00B6B6"; // Set to green if active on load
    updatePopup(data.proxies); // Display stored proxies
  } else {
    proxyButton.textContent = "Start";
    proxyButton.style.backgroundColor = "#8f8f8f"; // Set to gray if inactive on load
  }
});
