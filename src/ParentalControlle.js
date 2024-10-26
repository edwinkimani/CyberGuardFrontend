// Get the checkbox and status elements
const block18Sites = document.getElementById('block18sites');
const safeSearch = document.getElementById('safeSearch');
const worldFiltering = document.getElementById('worldFiltering');

// Function to update local storage and status
function updateToggleState(event) {
    const name = event.target.id; // Get the id of the checkbox that was changed
    localStorage.setItem(name, event.target.checked); // Store the checkbox state in local storage
}

// Add event listener for checkbox changes
block18Sites.addEventListener('change', updateToggleState);
safeSearch.addEventListener('change', updateToggleState);
worldFiltering.addEventListener('change', updateToggleState);

// On page load, set the checkbox state based on local storage
window.addEventListener('load', () => {
    const blockSitesState = localStorage.getItem('block18sites') === 'true';
    const safeSearchState = localStorage.getItem('safeSearch') === 'true';
    const worldFilteringState = localStorage.getItem('worldFiltering') === 'true';
    block18Sites.checked = blockSitesState;
    safeSearch.checked = safeSearchState;
    worldFiltering.checked = worldFilteringState;
});

document.getElementById('myForm').addEventListener('submit', function(e) {
    e.preventDefault();  // Prevents the default form submission behavior

    const url = document.getElementById('url').value;

    const toastElement = document.getElementById('liveToast');
    const userDataString = localStorage.getItem('user');
    const messageParagraph = document.querySelector('.message');
    const userData = JSON.parse(userDataString);
    const uid = userData.uid

    const data = {
        url,
        uid,
    };

    fetch('http://127.0.0.1:8000/api/blockurl', {
        method: "post",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        messageParagraph.textContent = data.message;
        toastElement.classList.add('bg-success');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
