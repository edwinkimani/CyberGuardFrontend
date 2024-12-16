window.onload = () => {
  const links = Array.from(document.querySelectorAll("[href]"))
    .map((element) => element.href)
    .filter((href) => 
      typeof href === "string" && // Ensure href is a string
      href.trim() !== "" && // Check for non-empty strings
      !href.includes("www.google.com") // Exclude www.google.com links
    );

  console.log("Collected Links:", links); // Debugging line

  // Send the collected links to the background script
  chrome.runtime.sendMessage({ action: 'phishingLink', links }, (response) => {
    console.log("Response from background script:", response); // Debugging line
    // Handle the response from the background script
    if (response.phishingLinks) {
      response.phishingLinks.forEach((phishingLink) => {
        // Highlight the phishing links in red
        const linkElements = document.querySelectorAll(
          `a[href="${phishingLink}"]`
        );
        linkElements.forEach((link) => {
          link.style.color = "red";
          link.style.fontWeight = "bold";
        });
      });
    }
  });
};

// Function to block search and display a warning
function blockSearch(query) {
  alert(
    `The search query "${query}" contains blocked words and has been prevented.`
  );
}

// Listen for changes in the search input field
document.addEventListener("input", (event) => {
  if (event.target.matches('input[type="search"], input[name="q"]')) {
    const searchQuery = event.target.value;

    // Send message to background script to check for blocked words
    chrome.runtime.sendMessage(
      { type: "checkSearch", query: searchQuery },
      (response) => {
        if (response.blocked) {
          blockSearch(searchQuery);
          event.target.value = ""; // Clear the search input
        }
      }
    );
  }
});

if ("sw" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then((reg) => console.log("Service Worker registered:", reg))
    .catch((err) => console.error("Service Worker registration failed:", err));
}

// Function to block an element
function blockElement(element) {
  element.style.display = "none";
}

// Function to display a notification
function displayNotification(message) {
  console.log(message); // For debugging
  // You can use browser.notifications.create() for more advanced notifications
}

// Select all ad elements
const adElements = document.querySelectorAll(".ad, .adsbygoogle, #ad-div");

// Block each ad element
adElements.forEach((adElement) => {
  blockElement(adElement);
});

// Display a notification
displayNotification("Ads blocked successfully!");

(function () {
  // Enable The Undetected Adblocker
  const adblocker = true;

  // Enable The Popup remover (pointless if you have the Undetected Adblocker)
  const removePopup = true;

  // Checks for updates (Removes the popup)
  const updateCheck = true;

  // Enable debug messages into the console
  const debugMessages = true;

  // Enable custom modal
  // Uses SweetAlert2 library (https://cdn.jsdelivr.net/npm/sweetalert2@11) for the update version modal.
  // When set to false, the default window popup will be used. And the library will not be loaded.
  const updateModal = {
    enable: true, // if true, replaces default window popup with a custom modal
    timer: 5000, // timer: number | false
  };

  // Store the initial URL
  let currentUrl = window.location.href;

  // Used for if there is ad found
  let isAdFound = false;

  //used to see how many times we have looped with an ad active
  let adLoop = 0;

  // Initialize ad counter
  let adCounter = 0;

  // Get settings from chrome.storage.sync
  chrome.storage.sync.get(["adblocker", "popupBlocker", "adCounter"], function (data) {
    if (data.adblocker !== undefined) {
      if (data.adblocker) removeAds(); // Remove ads if adblocker is enabled
    }
    if (data.popupBlocker !== undefined) {
      if (data.popupBlocker) popupRemover(); // Remove popups if popupBlocker is enabled
    }
    // Initialize the adCounter if it doesn't exist in storage
    if (data.adCounter !== undefined) {
      adCounter = data.adCounter;
      displayAdCount(); // Display the current count
    }
  });

  // Set everything up here
  log("Script started");

  // Remove Them pesky popups
  function popupRemover() {
    setInterval(() => {
      const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
      const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
      const popupButton = document.getElementById("dismiss-button");
  
      var video = document.querySelector("video");
  
      // Check if the video element exists before proceeding
      if (!video) {
        console.log("No video element found");
        return; // Exit if no video element is found
      }
  
      const bodyStyle = document.body.style;
      bodyStyle.setProperty("overflow-y", "auto", "important");
  
      if (modalOverlay) {
        modalOverlay.removeAttribute("opened");
        modalOverlay.remove();
      }
  
      if (popup) {
        log("Popup detected, removing...");
  
        if (popupButton) popupButton.click();
  
        popup.remove();
        video.play();
  
        setTimeout(() => {
          video.play();
        }, 500);
  
        log("Popup removed");
      }
  
      // Check if the video is paused after removing the popup
      if (!video.paused) return; // If video is already playing, do nothing.
  
      // Unpause the video if it was paused by the popup removal
      video.play();
    }, 1000);
  }

  // Undetected adblocker method
  function removeAds() {
    log("removeAds()");

    var videoPlayback = 1;

    setInterval(() => {
      var video = document.querySelector("video");
      const ad = [...document.querySelectorAll(".ad-showing")][0];

      // Remove page ads
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        removePageAds();
      }

      if (ad) {
        isAdFound = true;
        adLoop = adLoop + 1;

        // If we tried 10 times we can assume it won't work this time (Stops weird pause/freeze on ads)
        if (adLoop < 10) {
          const openAdCenterButton = document.querySelector(
            ".ytp-ad-button-icon"
          );
          openAdCenterButton?.click();

          const blockAdButton = document.querySelector('[label="Block ad"]');
          blockAdButton?.click();

          const blockAdButtonConfirm = document.querySelector(
            '.Eddif [label="CONTINUE"] button'
          );
          blockAdButtonConfirm?.click();

          const closeAdCenterButton = document.querySelector(".zBmRhe-Bz112c");
          closeAdCenterButton?.click();
        } else {
          if (video) video.play();
        }

        // Skip directly to the video content (bypassing the ad)
        if (video) {
          let randomNumber = Math.random() * (0.5 - 0.1) + 0.1;
          video.currentTime = video.duration + randomNumber || 0; // Jump to the end of the ad (or after the ad ends)
          video.play();
        }

        log("Ad skipped directly to video (✔️)");

        // Increment the counter and update storage
        adCounter++;
        chrome.storage.sync.set({ adCounter: adCounter }, function () {
          displayAdCount();
        });
      } else {
        // Check for unreasonable playback speed
        if (video && video?.playbackRate == 10) {
          video.playbackRate = videoPlayback;
        }

        if (isAdFound) {
          isAdFound = false;

          // Reset playback speed to normal after ad is skipped
          if (videoPlayback == 10) videoPlayback = 1;
          if (video && isFinite(videoPlayback))
            video.playbackRate = videoPlayback;

          adLoop = 0;
        } else {
          if (video) videoPlayback = video.playbackRate;
        }
      }
    }, 50);

    removePageAds();
  }

  // Removes ads on the page (not video player ads)
  function removePageAds() {
    const sponsor = document.querySelectorAll(
      "div#player-ads.style-scope.ytd-watch-flexy, div#panels.style-scope.ytd-watch-flexy"
    );
    const style = document.createElement("style");

    style.textContent = ` 
            ytd-action-companion-ad-renderer,
            ytd-display-ad-renderer,
            ytd-video-masthead-ad-advertiser-info-renderer,
            ytd-video-masthead-ad-primary-video-renderer,
            ytd-in-feed-ad-layout-renderer,
            ytd-ad-slot-renderer,
            yt-about-this-ad-renderer,
            yt-mealbar-promo-renderer,
            ytd-statement-banner-renderer,
            ytd-ad-slot-renderer,
            ytd-in-feed-ad-layout-renderer,
            ytd-banner-promo-renderer-background
            statement-banner-style-type-compact,
            .ytd-video-masthead-ad-v3-renderer,
            div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
            div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
            div#main-container.style-scope.ytd-promoted-video-renderer,
            div#player-ads.style-scope.ytd-watch-flexy,
            ad-slot-renderer,
            ytm-promoted-sparkles-web-renderer,
            masthead-ad,
            tp-yt-iron-overlay-backdrop,

            #masthead-ad {
                display: none !important;
            }
        `;

    document.head.appendChild(style);

    sponsor?.forEach((element) => {
      if (element.getAttribute("id") === "rendering-content") {
        element.childNodes?.forEach((childElement) => {
          if (
            childElement?.data.targetId &&
            childElement?.data.targetId !==
              "engagement-panel-macro-markers-description-chapters"
          ) {
            //Skipping the Chapters section
            element.style.display = "none";
          }
        });
      }
    });

    log("Removed page ads (✔️)");
  }

  // Display the current ad block count
  function displayAdCount() {
    // Optionally display this on the webpage or in a console log
    console.log(`Ads Blocked: ${adCounter}`);
  }

  // Used for debug messages
  function log(log, level = "l", ...args) {
    if (!debugMessages) return;

    const prefix = "Remove Adblock Thing:";
    const message = `${prefix} ${log}`;
    switch (level) {
      case "e":
      case "err":
      case "error":
        console.error(message, ...args);
        break;
      case "l":
      case "log":
        console.log(message, ...args);
        break;
      case "w":
      case "warn":
      case "warning":
        console.warn(message, ...args);
        break;
      case "i":
      case "info":
      default:
        console.info(message, ...args);
        break;
    }
  }
})();


// Watch for form submissions
document.addEventListener("submit", (event) => {
  const form = event.target;

  // Find all password fields in the submitted form
  const passwordFields = form.querySelectorAll('input[type="password"]');

  passwordFields.forEach((passwordField) => {
    const password = passwordField.value;

    // Send the password to the background script for checking
    chrome.runtime.sendMessage({ type: "CHECK_PASSWORD", password });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_ALERT") {
    showCustomAlert(message.message); // Show the alert with the message received
  }
});

function showCustomAlert(message) {
  // Create the modal container
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.backgroundColor = "#004369"; // Set the background color to match the extension
  modal.style.border = "2px solid #ccc";
  modal.style.borderRadius = "8px";
  modal.style.padding = "20px";
  modal.style.zIndex = "9999";
  modal.style.maxWidth = "400px";
  modal.style.width = "100%";

  // Create the icon container
  const iconContainer = document.createElement("div");
  iconContainer.style.display = "flex";
  iconContainer.style.alignItems = "center";
  iconContainer.style.marginBottom = "15px";

  // Add the extension's icon
  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("/icons/favicon/android-chrome-192x192.png"); // Ensure you have icon.png in your extension's root folder
  icon.alt = "CyberGurd Extension Icon"; // Add alt text for accessibility
  icon.style.width = "30px";
  icon.style.height = "30px";
  icon.style.marginRight = "10px";

  // Add the extension's name
  const title = document.createElement("span");
  title.innerText = "CyberGuard";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";
  title.style.color = "#00F5FF"; // Set the text color to match the extension

  iconContainer.appendChild(icon);
  iconContainer.appendChild(title);

  // Create the message text container
  const messageText = document.createElement("div");
  messageText.innerText = message;
  messageText.style.marginBottom = "15px";
  messageText.style.color = "#00F5FF"; // Set the message text color to match the extension

  // Highlight similarities in the message
  messageText.innerHTML = messageText.innerHTML.replace(
    /(\d+(\.\d{1,2})?)%/g,
    (match, p1) => {
      if (parseFloat(p1) >= 90) {
        // Highlight high similarity percentages in red for bad password
        return `<span style="color: red; font-weight: bold;">${match}</span>`;
      }
      return match;
    }
  );

  // Create the close button
  const closeButton = document.createElement("button");
  closeButton.type = "button"; // Set the type to 'button' to prevent form submission if inside a form
  closeButton.innerText = "Close";
  closeButton.style.backgroundColor = "#00F5FF"; // Set the button color to match the extension
  closeButton.style.color = "black"; // Contrast text color for the button
  closeButton.style.border = "none";
  closeButton.style.padding = "10px 20px";
  closeButton.style.cursor = "pointer";
  closeButton.style.borderRadius = "5px";
  closeButton.style.fontSize = "16px";

  // Close button logic
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  // Append all elements to the modal
  modal.appendChild(iconContainer);
  modal.appendChild(messageText);
  modal.appendChild(closeButton);

  // Append the modal to the body
  document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.querySelector('input[type="password"]');
  if (passwordInput) {
      passwordInput.addEventListener('input', function() {
          const password = passwordInput.value;
          // Send password to the background script or directly to the backend for encryption and storage
          chrome.runtime.sendMessage({
              action: 'storePassword',
              url: window.location.href,
              password: password
          });
      });
  }
});

//this is the function that we are using to get the user input in the search bar
//it is constantly listening for the enter key
//******************
//start
const badWords = ["badword1", "badword2"];
const inputElements = document.querySelectorAll('input[type="text"], textarea');
inputElements.forEach(input => {
  input.addEventListener('input', () => {
    const inputValue = input.value.toLowerCase();
    badWords.forEach(badWord => {
      if (inputValue.includes(badWord)) {
        // You can choose to:
        // 1. Clear the input:
        input.value = '';
        // 2. Display a warning message:
        alert('Bad word detected. Please remove it.');
        // 3. Modify the input value (e.g., replace bad words with asterisks)
      }
    });
  });
});
//******************
//end

