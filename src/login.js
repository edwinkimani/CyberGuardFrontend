// popup.js
// document.addEventListener('DOMContentLoaded', function() {
//     document.getElementById('openPageButton').addEventListener('click', function(event) {
//         event.preventDefault();
//         console.log('Button clicked!');
//         chrome.tabs.create({
//             url: "signup.html"
//           });
//     });
// });
document.getElementById('openPageButton2').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("../pages/signup.html") });
});

function navigate(){
    window.location.href = 'Dashbord.html';
}
// document.addEventListener('DOMContentLoaded', () => {
   
// });

function openNewTab(){
    console.log('button has been clicked')
    const signupUrl = chrome.runtime.getURL('signup.html');
    chrome.tabs.create({ url: signupUrl });
}
document.getElementById('myForm').addEventListener('submit', function(e) {
    e.preventDefault();  // Prevents the default form submission behavior

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const toastElement = document.getElementById('liveToast');
    const messageParagraph = document.querySelector('.message'); // Assuming you have a <p class="message"></p> element

    const data = {
        email,
        password
    };

    fetch('http://127.0.0.1:8000/api/Authentication', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        // Check if the response status is not in the range of 200-299
        if (!response.ok) {
            // Extract the error message from the response body
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Unknown error occurred');
            });
        }
        // Parse the response body as JSON if the response is OK
        return response.json();
    })
    .then(result => {
        // Handle successful response
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Update toast for success
        messageParagraph.textContent = 'Login successful! Redirecting...';
        toastElement.classList.remove('bg-danger');
        toastElement.classList.add('bg-success');
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Redirect after a short delay to let the toast be visible
        setTimeout(() => {
            window.location.href = '../pages/ParentalControlle.html';
        }, 2000); // Adjust delay as needed
    })
    .catch(error => {
        // Handle errors thrown from the fetch or response parsing
        messageParagraph.textContent = error.message;
        toastElement.classList.remove('bg-success');
        toastElement.classList.add('bg-danger');
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    });
});



// document.getElementById('myForm').addEventListener('submit', function(event) {
//     event.preventDefault(); // Prevents the default form submission action

//     // Handle the form submission with JavaScript
//     console.log('Form submission was prevented.');
//     // You can send the form data using fetch, XMLHttpRequest, etc.
// });
