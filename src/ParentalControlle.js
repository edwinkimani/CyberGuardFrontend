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
    const timeOutInput = document.getElementById("timeInput").value.trim();
    const [hours, minutes] = timeOutInput.split(":").map(Number);
  
    // Toast elements
    const toastElement = document.getElementById("liveToast");
    const messageParagraph = document.querySelector(".message");
  
    // Input Validation
    if (
      !urlInput ||
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      minutes < 0 ||
      minutes >= 60
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
      // Extract domain from URL
      const url = new URL(urlInput);
      const domain = url.hostname; // e.g., "example.com"
      console.log(`Adding site: ${domain}`);
  
      // Get the current time
      const currentTime = new Date();
      
      // Calculate the duration to add based on the input
      currentTime.setMinutes(currentTime.getMinutes() + (hours * 60) + minutes); // Add the user input time to current time
  
      // Store the expiration time as the new time
      const expiresAt = currentTime.getTime(); // Get expiration time in milliseconds
  
      // Log values for debugging
      console.log(`Current time: ${new Date()}`);
      console.log(`Expires at: ${new Date(expiresAt)}`);
  
      // Send data to background script
      chrome.runtime.sendMessage(
        {
          type: "add-site",
          domain: domain, // Store domain instead of full URL
          addedAt: Date.now(), // Log when the site was added
          timeout: `${hours}:${minutes}`, // User-provided time as hh:mm format
          expiresAt: expiresAt, // Expiration timestamp
        },
        function (response) {
          if (response.success) {
            messageParagraph.textContent = `Site added: ${domain} with a time limit of ${timeOutInput} (expires at ${new Date(expiresAt).toLocaleTimeString()}).`;
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

// Function to edit a timeout by URL
function editTimeout(domain) {
  const newTimeout = prompt("Enter new timeout (in minutes):");

  if (newTimeout && !isNaN(newTimeout) && newTimeout > 0) {
    // Convert the user input to minutes
    const newTimeoutMinutes = convertToMinutes(newTimeout);

    openDatabaseStoreUrl()
      .then((db) => {
        const transaction = db.transaction(["urlTimeoutStore"], "readwrite");
        const store = transaction.objectStore("urlTimeoutStore");

        const request = store.get(domain); // Use domain (extracted from URL) as key

        request.onsuccess = (event) => {
          const data = request.result;

          if (data) {
            // Calculate the new expiration time based on current time + new timeout
            const currentTime = Date.now();
            const newExpiresAt = currentTime + newTimeoutMinutes * 60 * 1000; // New timeout in ms

            // Update the expiration time
            data.expiresAt = newExpiresAt;

            const updateRequest = store.put(data); // Put the updated data back

            updateRequest.onsuccess = () => {
              console.log(`Timeout for ${domain} updated successfully.`);
              displayTimeouts(); // Refresh the displayed list
            };

            updateRequest.onerror = (event) => {
              console.error("Error updating timeout:", event);
            };
          } else {
            console.log(`No entry found for domain: ${domain}`);
          }
        };

        request.onerror = (event) => {
          console.error("Error retrieving data for edit:", event);
        };
      })
      .catch((error) => {
        console.error("Database error:", error);
      });
  } else {
    alert("Please enter a valid timeout value.");
  }
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
          const timeoutInMinutes = data.timeout;

          // Create the list item with buttons
          timeoutElement.innerHTML = `
              <strong class="mt-4">URL:</strong> ${data.domain} <br>
              <strong>Added at:</strong> ${addedAt} <br>
              <strong>Timeout (minutes):</strong> ${timeoutInMinutes} <br>
              <button class="btn col-4 btn-danger mt-2" data-action="delete">Delete</button>
              <button class="btn col-4 btn-warning mt-2" data-action="edit">Edit</button>
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
