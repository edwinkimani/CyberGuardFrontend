document.addEventListener("input", (event) => {
  if (
    event.target.tagName.toLowerCase() === "input" &&
    event.target.type === "password"
  ) {
    const password = event.target.value;

    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { action: "checkPassword", password },
        (response) => {
          if (!response.error) {
            console.log(`Password strength: ${response.passwordStrength}`);
            console.log(`Password has been breached: ${response.isBreached}`);
          } else {
            console.error(response.error);
          }
        }
      );
    } else {
      console.error("chrome.runtime.sendMessage is not available.");
    }
  }
});

window.onload = () => {
  const links = Array.from(document.querySelectorAll("[href]"))
    .map((element) => element.href)
    .filter(
      (href) => href && href.trim() !== "" && !href.includes("www.google.com")
    ); // Exclude www.google.com links

  console.log("Collected Links:", links); // Debugging line

  // Send the collected links to the background script
  chrome.runtime.sendMessage({ links }, (response) => {
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
