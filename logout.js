
function createLogoutButton() {
    const logoutButtonPlacing = document.querySelector('.logout-button-placing');

    if (logoutButtonPlacing) {
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.addEventListener('click', logout);
        logoutButtonPlacing.appendChild(logoutButton);
    }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
}

createLogoutButton();
