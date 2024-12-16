// Function to update local storage and status
function updateToggleState(event) {
    const name = event.target.id; // Get the id of the checkbox that was changed
    chrome.storage.sync.set({ [name]: event.target.checked }, function() {
        console.log(`${name} updated to ${event.target.checked}`);
    });
}

// Add event listeners to all checkboxes dynamically
document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', updateToggleState);
});

// On page load, set the checkbox states based on chrome storage
window.addEventListener('load', () => {
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        chrome.storage.sync.get(checkbox.id, (result) => {
            const state = result[checkbox.id] || false; // Default to false if not set
            checkbox.checked = state; // Set the checkbox state
        });
    });
});


// Form submission handling
document.getElementById('myForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents the default form submission behavior

    const url = document.getElementById('url').value;

    const toastElement = document.getElementById('liveToast');
    const userDataString = localStorage.getItem('user');
    const messageParagraph = document.querySelector('.message');
    const userData = JSON.parse(userDataString);
    const uid = userData.uid;

    const data = {
        url,
        uid,
    };

    fetch('http://127.0.0.1:8000/api/blockurl', {
        method: "post",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
        messageParagraph.textContent = data.message;
        toastElement.classList.add('bg-success');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
