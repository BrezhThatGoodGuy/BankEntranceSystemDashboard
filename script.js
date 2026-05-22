
function openMonitorPage(){
                    window.location.href = "monitor.html";
                    const pageSelector = document.querySelector('.monitor-link-page');
                    
                }

function openControlPage(){
                    window.location.href = "control.html";
                }
function openFaultsPage(){
                    window.location.href = "faults.html";
                }
function openAiPage(){
                    window.location.href = "aicontrol.html";
                }

function hideSideNavigationBar(){
                   
                    const hiddensidebar = '<div class = "hidden-side-navigation-bar"></div>';
                    document.querySelector('.js-side-navigation-bar').innerHTML = hiddensidebar;
                    const clickedmenu = '<img class="navigation-menu" onclick="showSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
                    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function showThemeSettings(){
                    const currentTheme = localStorage.getItem('systemTheme') || 'dark';
                    const themeCard = `
                        <div class="theme-settings-overlay" onclick="closeThemeSettings(event)">
                            <div class="theme-settings-card" onclick="event.stopPropagation()">
                                <div class="theme-card-header">
                                    <h2>System Theme</h2>
                                    <button class="close-theme-btn" onclick="closeThemeSettings()">✕</button>
                                </div>
                                <div class="theme-card-body">
                                    <p class="theme-description">Choose your preferred theme for the system</p>
                                    <div class="theme-options">
                                        <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" onclick="toggleTheme('dark')">
                                            <div class="theme-preview dark-preview"></div>
                                            <span>Dark Theme</span>
                                        </div>
                                        <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" onclick="toggleTheme('light')">
                                            <div class="theme-preview light-preview"></div>
                                            <span>Light Theme</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    document.querySelector('.js-side-navigation-bar').innerHTML = themeCard;
                    const clickedmenu = '<img class="navigation-menu" onclick="showSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
                    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function closeThemeSettings(event){
                    if(event && event.target.classList.contains('theme-settings-overlay')){
                        const hiddensidebar = '<div class = "hidden-side-navigation-bar"></div>';
                        document.querySelector('.js-side-navigation-bar').innerHTML = hiddensidebar;
                    } else {
                        const hiddensidebar = '<div class = "hidden-side-navigation-bar"></div>';
                        document.querySelector('.js-side-navigation-bar').innerHTML = hiddensidebar;
                    }
}

function toggleTheme(themeName){
                    localStorage.setItem('systemTheme', themeName);
                    applyTheme(themeName);
                    
                    // Update the active state in the card
                    const themeOptions = document.querySelectorAll('.theme-option');
                    themeOptions.forEach(option => {
                        option.classList.remove('active');
                    });
                    event.currentTarget.classList.add('active');
}

function applyTheme(themeName){
                    const htmlElement = document.documentElement;
                    if(themeName === 'light'){
                        htmlElement.setAttribute('data-theme', 'light');
                    } else {
                        htmlElement.setAttribute('data-theme', 'dark');
                    }
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function(){
                    const savedTheme = localStorage.getItem('systemTheme') || 'dark';
                    applyTheme(savedTheme);
});

function showSideNavigationBar(){
                   
                    const shownsidebar = '<div class = "shown-side-navigation-bar"><div><p>Print Info</p>  <svg class="print-icon" onclick="window.print()" aria-label="Print this page" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></div><div><p>Help</p><a href="https://wa.me/263785780324" target="_blank" rel="noopener noreferrer" aria-label="Call Customer Support"><svg class="phone-icon" width="40" height="40" viewBox="0 0 24 24" fill="#25D366" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a></div><div><p>Settings</p><svg class="gear-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div>Log Out</div></div>';
                    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
                    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="navigation-menu.png" alt="nav logo">';
                    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}

const imgElement = document.querySelector('.live-view-template');        
        // 3. Define the base URL of your image (without any parameters)
        
        
        // 4. Create the function to update the source
function refreshImage() {
                    const imgElement = document.querySelector('.live-view-template');
                    const baseUrl = imgElement.src;
                    const timestamp = new Date().getTime();
                    
                    // Set the new src with the timestamp appended as a query string
                    imgElement.src = `${baseUrl}?t=${timestamp}`;
                    console.log("toraa")
}

setInterval(refreshImage, 200);