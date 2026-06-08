
// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function(){
                    const savedTheme = localStorage.getItem('systemTheme') || 'dark';
                    applyTheme(savedTheme);
});