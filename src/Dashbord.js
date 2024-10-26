document.addEventListener('DOMContentLoaded', function () {
    // Add options page logic here
  });

function clearTimeoutFunction() {
  window.location.href = 'vpn.html';
}
document.getElementById('navigateToVpn').addEventListener('click', clearTimeoutFunction);

const toastTrigger = document.getElementById('liveToastBtn')
const toastLiveExample = document.getElementById('liveToast')
if (toastTrigger) {
  toastTrigger.addEventListener('click', () => {
    const toast = new bootstrap.Toast(toastLiveExample)

    toast.show()
  })
}


