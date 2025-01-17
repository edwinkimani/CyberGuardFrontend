document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("DOMContentLoaded", function () {
    const collapseElement = document.getElementById("multiCollapseExample2");
    const toggleButton = document.getElementById("toggleButton");
  
    toggleButton.addEventListener("click", function () {
      const bsCollapse = new bootstrap.Collapse(collapseElement, {
        toggle: false, // Prevent automatic toggle on initialization
      });
  
      if (collapseElement.classList.contains("show")) {
        bsCollapse.hide(); // Collapse the element
      } else {
        bsCollapse.show(); // Expand the element
      }
    });
  });  

  function storeMostRecentUrl() {
    chrome.history.search({ text: "", maxResults: 2 }, function (data) {
      if (data.length > 0) {
        // The first item in the data array is the most recent URL
        const mostRecentPage = data[1];
        const parsedUrl = new URL(mostRecentPage.url);
        console.log("Most Recent URL:", parsedUrl.origin); // Log the most recent URL

        // Store the URL in IndexedDB
        addData({value: parsedUrl.origin });
      } else {
        console.log("No history found.");
      }
    });
  }

  document.getElementById("myForm").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevents the default form submission behavior

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const toastElement = document.getElementById("liveToast");
    const messageParagraph = document.querySelector(".message");

    const data = {
      email,
      password,
    };

    fetch("http://127.0.0.1:8000/api/Authentication", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.validation) {
          storeMostRecentUrl();
          messageParagraph.textContent =
            "Authentication successful. Redirecting...";
          toastElement.classList.remove("bg-danger");
          toastElement.classList.add("bg-success");

          const toast = new bootstrap.Toast(toastElement);
          toast.show();

          // Redirect after showing toast
          setTimeout(() => {
            window.history.back();
          }, 2000);
        } else {
          messageParagraph.textContent = "Authentication failed.";
          toastElement.classList.remove("bg-success");
          toastElement.classList.add("bg-danger");

          const toast = new bootstrap.Toast(toastElement);
          toast.show();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });

  document.getElementById("back").addEventListener("click", function (e) {
    e.preventDefault();
    window.open("edge://new", "_blank");
  });

  document
    .getElementById("toggleButtonClear")
    .addEventListener("click", function () {
      document.getElementById("myForm").reset(); // Reset form fields
    });
});

function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AllowedSites", 1);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("allowedSitesURL")) {
          db.createObjectStore("allowedSitesURL", { keyPath: "id", autoIncrement: true });
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

function addData(data) {
    openDatabase().then((db) => {
      const transaction = db.transaction(["allowedSitesURL"], "readwrite");
      const store = transaction.objectStore("allowedSitesURL");
  
      const request = store.add(data);
      request.onsuccess = () => console.log("Data added successfully.");
      request.onerror = (event) => console.error("Error adding data:", event);
    });
  }