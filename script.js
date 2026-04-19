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
                    const clickedmenu = '<img class="navigation-menu" onclick="showSideNavigationBar()" src="images/navigation-menu.png" alt="nav logo">';
                    document.querySelector('.js-navigation-menu').innerHTML = clickedmenu;
}

function showSideNavigationBar(){
                   
                    const shownsidebar = '<div class = "shown-side-navigation-bar"><div>Print Info</div><div>Help</div><div>Settings</div><div>Log Out</div></div>';
                    document.querySelector('.js-side-navigation-bar').innerHTML = shownsidebar;
                    const unclickedmenu = '<img class="navigation-menu" onclick="hideSideNavigationBar()" src="images/navigation-menu.png" alt="nav logo">';
                    document.querySelector('.js-navigation-menu').innerHTML = unclickedmenu;
}


