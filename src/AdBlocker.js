// Request the current URL from the background script
chrome.runtime.sendMessage({ request: "getUrl" }, (response) => {
    document.getElementById('url').textContent = response.url || 'Unable to fetch URL';
    console.log('sending messages');
});

