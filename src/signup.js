document.getElementById('myForm').addEventListener('submit', function(e) {
    e.preventDefault();  // Prevents the default form submission behavior

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

    const toastElement = document.getElementById('liveToast');

    const data = {
        name,
        email,
        password,
        passwordConfirm
    };

    fetch('http://127.0.0.1:8000/api/Registration', {
        method: "post",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        localStorage.setItem('user', JSON.stringify(data));
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        window.location.href = '../pages/success.html';
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});