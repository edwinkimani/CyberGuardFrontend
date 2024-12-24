// Toast elements
const toastElement = document.getElementById("liveToast");
const messageParagraph = document.querySelector(".message");

function updateToggleState(event) {
  const name = event.target.id; // Get the id of the checkbox that was changed
  chrome.storage.sync.set({ [name]: event.target.checked }, function () {
    console.log(`${name} updated to ${event.target.checked}`);
  });
}

// Add event listeners to all checkboxes dynamically
document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener("change", updateToggleState);
});

// On page load, set the checkbox states based on chrome storage
window.addEventListener("load", () => {
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    chrome.storage.sync.get(checkbox.id, (result) => {
      const state = result[checkbox.id] || false; // Default to false if not set
      checkbox.checked = state; // Set the checkbox state
    });
  });
});

// Form submission handling
document.getElementById("myForm").addEventListener("submit", function (e) {
  e.preventDefault(); // Prevents the default form submission behavior

  const url = document.getElementById("url").value;

  const toastElement = document.getElementById("liveToast");
  const userDataString = localStorage.getItem("user");
  const messageParagraph = document.querySelector(".message");
  const userData = JSON.parse(userDataString);
  const uid = userData.uid;

  const data = {
    url,
    uid,
  };

  fetch("http://127.0.0.1:8000/api/blockurl", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      messageParagraph.textContent = data.message;
      toastElement.classList.add("bg-success");
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

// Function to handle the add-site action
function handleAddSite(event) {
  event.preventDefault(); // Prevent form submission

  const urlInput = document.getElementById("timeOutUrl").value.trim();
  const startTimeInput = document.getElementById("start-time-Input").value.trim();
  const endTimeInput = document.getElementById("end-time-Input").value.trim();

  // Parse start and end time inputs into hours and minutes
  const [startHours, startMinutesInput] = startTimeInput.split(":").map(Number);
  const [endHours, endMinutesInput] = endTimeInput.split(":").map(Number);

  // Check if start and end times are valid
  if (
    isNaN(startHours) ||
    isNaN(endHours) ||
    startHours > 23 ||
    endHours > 23 ||
    startMinutesInput > 59 ||
    endMinutesInput > 59
  ) {
    messageParagraph.textContent =
      "Invalid input! Please provide a valid URL and timeout.";
    toastElement.classList.remove("bg-success");
    toastElement.classList.add("bg-danger");

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    return;
  }

  try {
    let urlInputWithProtocol = urlInput;

    // Ensure the URL has a protocol (http:// or https://)
    if (!/^https?:\/\//i.test(urlInput)) {
      urlInputWithProtocol = `https://${urlInput}`; // Add default protocol
    }

    // Try creating the URL object
    const url = new URL(urlInputWithProtocol);
    const domain = url.hostname; // e.g., "example.com"
    console.log(`Adding site: ${domain}`);

    // Calculate the time in minutes for start and end time
    function timeToMinutes(hours, minutes) {
      return hours * 60 + minutes;
    }

    // Calculate start and end times in minutes
    const startMinutes = timeToMinutes(startHours, startMinutesInput);
    const endMinutes = timeToMinutes(endHours, endMinutesInput);

    // Adjust for overnight time range (if the end time is before the start time)
    let adjustedEndMinutes = endMinutes;
    if (endMinutes < startMinutes) {
      adjustedEndMinutes += 24 * 60; // Add 24 hours (in minutes)
    }

    const startAt = startMinutes;
    const expiresAt = adjustedEndMinutes;

    // Send data to background script
    chrome.runtime.sendMessage(
      {
        type: "add-site",
        domain: domain, // Store domain instead of full URL
        addedAt: Date.now(), // Log when the site was added
        startAt: startAt, // Store start time in minutes
        expiresAt: expiresAt, // Store end time in minutes
      },
      function (response) {
        if (response.success) {
          messageParagraph.textContent = `Site added: ${domain} with a time limit from ${startTimeInput} to ${endTimeInput}.`;
          toastElement.classList.remove("bg-danger");
          toastElement.classList.add("bg-success");
        } else {
          messageParagraph.textContent =
            "Failed to add site. Please try again.";
          toastElement.classList.remove("bg-success");
          toastElement.classList.add("bg-danger");
        }

        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Clear form after success
        document.getElementById("timeOutForm").reset();
      }
    );
  } catch (error) {
    console.error("Error parsing URL:", error);
    messageParagraph.textContent = "Invalid URL format.";
    toastElement.classList.remove("bg-success");
    toastElement.classList.add("bg-danger");

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
  }
}


// Bind event listener to form in parentControl.js
document
  .getElementById("timeOutForm")
  .addEventListener("submit", handleAddSite);

// popup.js

// Function to display timeouts in the popup

function openDatabaseStoreUrl() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MyExtensionDatabase", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create the object store with domain as the key path
      if (!db.objectStoreNames.contains("urlTimeoutStore")) {
        const store = db.createObjectStore("urlTimeoutStore", {
          keyPath: "domain", // Using "domain" as the key path
        });
        // Create index on "domain" field (optional since it's the keyPath)
        store.createIndex("url", "domain", { unique: true }); // Creating "url" index on "domain"
        store.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) =>
      reject(`Database error: ${event.target.error}`);
  });
}

// Function to delete a timeout by URL
function deleteTimeout(domain) {
  openDatabaseStoreUrl()
    .then((db) => {
      const transaction = db.transaction(["urlTimeoutStore"], "readwrite");
      const store = transaction.objectStore("urlTimeoutStore");

      const request = store.delete(domain); // Delete by domain key

      request.onsuccess = () => {
        console.log(`Timeout for ${domain} deleted successfully.`);
        displayTimeouts(); // Refresh the displayed list
      };

      request.onerror = (event) => {
        console.error("Error deleting timeout:", event);
      };
    })
    .catch((error) => {
      console.error("Database error:", error);
    });
}

// Function to get all timeouts from IndexedDB
function getAllTimeouts() {
  return new Promise((resolve, reject) => {
    openDatabaseStoreUrl()
      .then((db) => {
        const transaction = db.transaction(["urlTimeoutStore"], "readonly");
        const store = transaction.objectStore("urlTimeoutStore");

        const request = store.getAll(); // Get all entries from the store

        request.onsuccess = (event) => {
          resolve(request.result); // Return all data found
        };

        request.onerror = (event) => {
          reject("Error retrieving data:", event);
        };
      })
      .catch((error) => reject("Database error:", error));
  });
}

// Function to delete a timeout by URL
function displayTimeouts() {
  getAllTimeouts()
    .then((timeouts) => {
      const listContainer = document.getElementById("timeoutList");

      // Clear the list before adding new items
      listContainer.innerHTML = "";

      // Check if there are no timeouts
      if (timeouts.length === 0) {
        const noTimeoutMessage = document.createElement("p");
        noTimeoutMessage.textContent = "No timeouts available.";
        listContainer.appendChild(noTimeoutMessage);
      } else {
        // Display timeouts
        timeouts.forEach((data) => {
          const timeoutElement = document.createElement("li");

          // Format the addedAt and timeout for display
          const addedAt = new Date(data.addedAt).toLocaleString();
          const startAt = data.startAt;
          const expiresAt = data.expiresAt;
          
          // Create the list item with buttons
          timeoutElement.innerHTML = `
              <strong class="mt-4">URL:</strong> ${data.domain} <br>
              <strong>Added at:</strong> ${addedAt} <br>
              <strong>Start At (minutes):</strong> ${startAt} <br>
              <strong>Expires At (minutes):</strong> ${expiresAt} <br>
              <button class="btn col-4 btn-danger mt-2" data-action="delete">Delete</button>
            `;

          // Append the created list item to the container
          listContainer.appendChild(timeoutElement);

          // Attach event listeners for all buttons
          timeoutElement.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", (event) => {
              const action = event.target.getAttribute("data-action");

              // Handle different button actions
              if (action === "delete") {
                deleteTimeout(data.domain);
              } else if (action === "edit") {
                editTimeout(data.domain);
              } else if (action === "view") {
                viewTimeout(data.domain);
              }
            });
          });
        });
      }
    })
    .catch((error) => {
      console.error("Error displaying timeouts:", error);
    });
}

// When the popup is opened, display the timeouts
document.addEventListener("DOMContentLoaded", function () {
  displayTimeouts();
});
