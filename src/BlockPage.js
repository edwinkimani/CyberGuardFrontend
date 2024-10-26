import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

document.getElementById('toggleButton').addEventListener('click', function() {
    var collapseElement = document.getElementById('collapseExample');

    if (collapseElement.classList.contains('show')) {
        collapseElement.classList.remove('show');
        collapseElement.style.display = 'none';
    } else {
        collapseElement.classList.add('show');
        collapseElement.style.display = 'block';
    }
});
