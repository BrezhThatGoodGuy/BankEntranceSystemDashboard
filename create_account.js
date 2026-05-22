document.addEventListener('DOMContentLoaded', () => {
    const createAccountForm = document.getElementById('create-account-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    createAccountForm.addEventListener('submit', (event) => {
        event.preventDefault();
        errorMessage.textContent = '';
        successMessage.textContent = '';

        const username = createAccountForm['new-username'].value;
        const password = createAccountForm['new-password'].value;
        const confirmPassword = createAccountForm['confirm-password'].value;

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match.';
            return;
        }

        const storedUsers = JSON.parse(localStorage.getItem('users')) || {};

        if (storedUsers[username]) {
            errorMessage.textContent = 'Username already exists.';
            return;
        }

        // Add the new user to the stored users
        storedUsers[username] = password;
        localStorage.setItem('users', JSON.stringify(storedUsers));

        successMessage.textContent = 'Account created successfully! You can now log in.';
        createAccountForm.reset();
    });
});
