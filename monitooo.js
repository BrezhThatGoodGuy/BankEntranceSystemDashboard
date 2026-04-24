function logDoorStateChange(doorName, newState) {
    const logContainer = document.getElementById('logContainer');
    
    // Remove the "empty log" message if it's the first entry
    const emptyLog = document.querySelector('.empty-log');
    if (emptyLog) {
        emptyLog.remove();
    }

    // Get current time formatted as HH:MM:SS
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour12: false });

    // Create the new log entry div
    const newLog = document.createElement('div');
    newLog.className = 'log-entry';
    
    // Build the log message using your existing CSS classes
    newLog.innerHTML = `
        <span class="log-time">[${timeString}]</span> 
        <span class="log-clicked">${doorName}</span> 
        status changed to <span class="log-client">${newState}</span>
    `;

    // Prepend so the newest log appears at the top
    logContainer.insertBefore(newLog, logContainer.firstChild);

    // Optional: Keep only the last 50 logs so the page doesn't get overloaded
    if (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Function to clear the logs when the refresh button is clicked
function clearLogs() {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '<div class="empty-log">No recent door activity...</div>';
}