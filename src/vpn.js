document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.btns');

  buttons.forEach(button => {
    button.addEventListener('click', function() {
      this.classList.toggle('is-clicked');
    });
  });
});
