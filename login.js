document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // Hardcoded user credentials
    const users = {
        'brezhnevndlovu02@gmail.com': '#31May2026',
        'Shyleen': 'supervisor'
    };

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        // Check for hardcoded admin/default users
        if (users[username] && users[username] === password) {
            // Store login status in session storage
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('username', username);
            // Redirect to the main dashboard
            window.location.href = 'monitor.html';
            return;
        }

        // Check for users created through the registration form (from local storage)
        const storedUsers = JSON.parse(localStorage.getItem('users')) || {};
        if (storedUsers[username] && storedUsers[username] === password) {
            // Store login status in session storage
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('username', username);
            // Redirect to the main dashboard
            window.location.href = 'monitor.html';
            return;
        }

        // If credentials don't match
        errorMessage.textContent = 'Invalid username or password.';
    });
});
