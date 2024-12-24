const passwordInput = document.getElementById("password");
const strengthMeter = document.getElementById("strength-meter");
const strengthText = document.getElementById("strength-text");

passwordInput.addEventListener("input", updateStrengthMeter);

function updateStrengthMeter() {
  const password = passwordInput.value;
  let strength = 0;

  if (password.length > 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;

  // Check for at least two special symbols
  const specialCharMatch = password.match(/[^A-Za-z0-9]/g);
  const specialCharCount = specialCharMatch ? specialCharMatch.length : 0;
  if (specialCharCount >= 2) strength++; // Requires at least 2 symbols

  if (password.length > 12) strength++; // Bonus for longer passwords

  updateUI(strength);
}

function updateUI(strength) {
  strengthMeter.className = "strength-meter";

  if (strength <= 1) {
    strengthMeter.classList.add("weak");
    strengthText.innerText = "Weak";
  } else if (strength <= 3) {
    strengthMeter.classList.add("medium");
    strengthText.innerText = "Medium";
  } else {
    strengthMeter.classList.add("strong");
    strengthText.innerText = "Strong";
  }
}

function checkPassword() {
  // Get the password value from the input field
  const password = document.getElementById("password").value;

  // Show the spinner while the request is in progress
  document.getElementById("spinner").style.display = "inline-block";
  document.getElementById("outcome-message").innerHTML = ""; // Clear previous messages

  // Make the API call to your Node.js server
  fetch("http://127.0.0.1:8000/api/check-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: password }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Hide the spinner after the request completes
      document.getElementById("spinner").style.display = "none";

      // Get the message and similar passwords from the response
      const outcomeMessage = data.message;
      const similarPasswords = data.similarPasswords;

      // Display the outcome message
      const outcomeElement = document.getElementById("outcome-message");
      outcomeElement.innerHTML = `<b>Outcome:</b> ${outcomeMessage}`;

      // If there are similar passwords, display them
      if (similarPasswords && similarPasswords.length > 0) {
        const similarWordsList = similarPasswords
          .map((pwd) => `<li>${pwd.word} (Similarity: ${pwd.similarity}%)</li>`)
          .join("");
        outcomeElement.innerHTML += `<br><b>Similar passwords:</b><ul>${similarWordsList}</ul>`;
      }
    })
    .catch((error) => {
      // Hide the spinner if there's an error
      document.getElementById("spinner").style.display = "none";

      console.error("Error:", error);
      document.getElementById("outcome-message").innerHTML =
        "There was an error checking the password. Please try again later.";
    });
}

document
  .getElementById("check-password-button")
  .addEventListener("click", checkPassword);
