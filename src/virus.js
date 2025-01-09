document.getElementById("scanURL").addEventListener("click", async () => { 
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const currentURL = tabs[0].url;
      const urlElement = document.getElementById("url");
      const maliciousElement = document.getElementById("malicious");
      const harmlessElement = document.getElementById("harmless");
      const suspiciousElement = document.getElementById("suspicious");
      const undetectedElement = document.getElementById("undetected");
      const resultDiv = document.getElementById("finalMessage");

      if (
          currentURL.startsWith("chrome://") || 
          currentURL.startsWith("chrome-extension://") || 
          currentURL.startsWith("edge://")
      ) {
          alert("Scanning internal pages is not allowed.");
          return;
      }

      const response = await fetch('http://127.0.0.1:8000/api/scan-URL', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: currentURL })
      });

      const result = await response.json();

      console.log(result);

      // Update HTML elements with scan results
      urlElement.innerText = result.url || currentURL;
      maliciousElement.innerText = result.malicious || 0;
      harmlessElement.innerText = result.harmless || 0;
      suspiciousElement.innerText = result.suspicious || 0;
      undetectedElement.innerText = result.undetected || 0;

      // Final decision message
      if (result.malicious > 0) {
          resultDiv.innerText = "This URL is malicious!";
          resultDiv.className = "malicious";
      } else if (result.suspicious > 0) {
          resultDiv.innerText = "This URL is suspicious.";
          resultDiv.className = "suspicious";
      } else if (result.harmless > 0 && result.undetected === 0) {
          resultDiv.innerText = "This URL is safe.";
          resultDiv.className = "safe";
      } else {
          resultDiv.innerText = "URL analysis incomplete or undetected.";
          resultDiv.className = "neutral";
      }
  });
});
