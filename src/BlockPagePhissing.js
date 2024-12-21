document.getElementById("back").addEventListener("click", function (e) {
    e.preventDefault();
  
    // Check the browser and navigate to the appropriate new tab page
    const isChrome = navigator.userAgent.includes("Chrome");
    const isEdge = navigator.userAgent.includes("Edg");
  
    if (typeof isChrome !== 'undefined' && isChrome.tabs) {
      if (isChrome) {
        window.chrome.tabs.update({ url: "chrome://newtab/" });
      } else if (isEdge) {
        window.chrome.tabs.update({ url: "edge://newtab/" });
      } else {
        window.chrome.tabs.update({ url: "https://www.google.com" });
      }
    } else {
      console.error('chrome object is not defined or does not have the tabs property');
    }
  });