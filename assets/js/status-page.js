/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// assets/js/status-page.js

/**
 * Manages dynamic content, WebSocket communication, and UI interactions 
 * specifically for the server status page (status.html).
 */
document.addEventListener("DOMContentLoaded", () => {
    let wsStatusPage;
    let statusPageReconnectAttempts = 0;
    let forceShowStatusPageMaintenance = false; // Flag for maintenance precedence
    let statusPageConnectionTimeoutTimer = null; // Timer for status page connection timeout
    // Configuration mapping server keys to their respective HTML elements for status display.
    // - statusEl: The HTML element (usually a <span>) to display the server's online count/status text.
    // - dotEl: The HTML element (usually a <span> or <svg>) acting as a status indicator dot/icon.
    // - keys: An array of server identifiers from the WebSocket 'full' message payload
    //         that this display entry represents (can be a single server or an aggregate).
    // - name: A descriptive name for this server entry (used for logging/debugging).
    // Build server configuration dynamically from sharedConfig
    const serverStatusListConfig = window.VOIDIX_SHARED_CONFIG.buildServerStatusConfig();
    // Ensure survival and lobby1 dots have IDs for robust selection
    const survivalDot = document.querySelector("#server-status-list div:nth-child(5) .status-dot"); // Example, adjust if HTML order changes
    if (survivalDot && !survivalDot.id) survivalDot.id = "survival-dot";
    const lobbyDot = document.querySelector("#server-status-list div:nth-child(6) .status-dot"); // Example
    if (lobbyDot && !lobbyDot.id) lobbyDot.id = "lobby-dot";
    // Re-acquire dot elements with new IDs if they were just set
    if (serverStatusListConfig.survival.dotEl.id !== "survival-dot" && document.getElementById("survival-dot")) {
        serverStatusListConfig.survival.dotEl = document.getElementById("survival-dot");
    }
    if (serverStatusListConfig.lobby1.dotEl.id !== "lobby-dot" && document.getElementById("lobby-dot")) { // Check if querySelector was used initially
        const actualLobbyDot = document.querySelector("#server-status-list > div:nth-last-child(1) .status-dot"); // Assuming lobby1 is last
        if(actualLobbyDot && !actualLobbyDot.id) actualLobbyDot.id = "lobby-dot";
        serverStatusListConfig.lobby1.dotEl = document.getElementById("lobby-dot") || actualLobbyDot;
    }
    let currentServerData = {
        servers: {},
        players: { currentPlayers: {} }, // To track player's current server for decrementing on remove
        runningTime: undefined,
        totalRunningTime: undefined,
        isMaintenance: false,
        maintenanceStartTime: null
    };
    // Variables for real-time uptime tracking on status page
    let initialRunningTimeSeconds_status = null;
    let initialTotalRunningTimeSeconds_status = null;
    let lastUptimeUpdateTimestamp_status = null;
    let uptimeIntervalId_status = null;
    const statusPageUptimeEl = document.getElementById('status-page-uptime');
    const statusPageTotalUptimeEl = document.getElementById('status-page-total-uptime');
    const maintenanceInfoContainerEl = document.getElementById('maintenance-info-container');
    const maintenanceInfoTextEl = document.getElementById('maintenance-info-text');
    /**
     * Sets the initial display text of server statuses and uptime fields to a 'loading' state on the status page.
     * Also clears and resets real-time uptime tracking variables for this page.
     */
    function setInitialLoadingStatusOnStatusPage() {
        if (currentServerData.isMaintenance) {
            displayMaintenanceInfoOnStatusPage();
            return; // Already displaying maintenance info
        }
        Object.values(serverStatusListConfig).forEach(s => {
            if (s.statusEl) s.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.loading;
            if (s.dotEl) s.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotMaintenance;
        });
        if (statusPageUptimeEl) statusPageUptimeEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.loading;
        if (statusPageTotalUptimeEl) statusPageTotalUptimeEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.loading;
        // Clear any existing uptime interval and reset tracking variables for status page
        clearInterval(uptimeIntervalId_status);
        initialRunningTimeSeconds_status = null;
        initialTotalRunningTimeSeconds_status = null;
        lastUptimeUpdateTimestamp_status = null;
    }
    setInitialLoadingStatusOnStatusPage(); // Set on page load
    /**
     * Updates the display (status text and dot) for a single server entry on the status page
     * based on currentServerData. Handles maintenance, online, offline, and partial/unknown states.
     * Includes a specific re-fetch mechanism for 'knockioffa' status element if initially not found.
     * @param {string} serverKey - The key of the server in serverStatusListConfig.
     */
    function updateServerDisplay(serverKey) {
        const serverInfo = serverStatusListConfig[serverKey];
        // For knockioffa, if its statusEl reference seems lost, try to re-acquire it.
        // This can handle cases where the initial reference might have become invalid.
        if (serverKey === 'knockioffa' && serverInfo && !serverInfo.statusEl) {
            serverInfo.statusEl = document.getElementById("knockioffa-live-status");
            if (!serverInfo.statusEl) {
                // If still not found after re-fetch, log a more critical error, as the element might genuinely be missing from the DOM.
                console.error('[Status Page] Critical: Could not find statusEl for knockioffa even after re-fetch attempt.');
            }
        }
        // If (after a potential re-fetch for knockioffa) statusEl is still missing,
        // log a warning and return to prevent subsequent errors.
        if (!serverInfo || !serverInfo.statusEl) {
            return;
        }
        if (currentServerData.isMaintenance) {
            serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.maintenance;
            serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textYellow;
            if (serverInfo.dotEl) {
                serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotMaintenance;
            }
            return;
        }
        let onlineCount = 0;
        let isEffectivelyOnline = false;
        let allKeysPresent = true;

        if (!currentServerData.servers || Object.keys(currentServerData.servers).length === 0) {
            if (wsStatusPage?.readyState !== WebSocket.OPEN) {
                serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.loading;
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotMaintenance;
                }
            }
            return;
        }
        serverInfo.keys.forEach(subKey => {
            if (currentServerData.servers[subKey]) {
                if (currentServerData.servers[subKey].isOnline) {
                    isEffectivelyOnline = true;
                    onlineCount += currentServerData.servers[subKey].online;
                }
            } else {
                allKeysPresent = false;
            }
        });

        if (!allKeysPresent && serverInfo.keys.length > 0) {
            serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.partialUnknown;
            serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textYellow;
            if (serverInfo.dotEl) {
                serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotMaintenance;
            }
        } else if (isEffectivelyOnline) {
            serverInfo.statusEl.textContent = `${onlineCount} ${window.VOIDIX_SHARED_CONFIG.statusTexts.online}`;
            serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textGreen;
            if (serverInfo.dotEl) {
                serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotOnline;
            }
        } else { 
            let allKeysOffline = true;
            if (serverInfo.keys.length > 0) {
                allKeysOffline = serverInfo.keys.every(subKey =>
                    currentServerData.servers[subKey] && currentServerData.servers[subKey].isOnline === false
                );
            }
            if(allKeysPresent && allKeysOffline && onlineCount === 0){
                serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.offline;
                serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textRed;
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotOffline;
                }
            } else if (!allKeysPresent && Object.keys(currentServerData.servers).length > 0) {
                serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.unknown; 
                serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textYellow;
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotMaintenance;
                }
            } else { 
                if (onlineCount > 0 && allKeysPresent) { 
                    // This case implies server data reports online players, but the server itself is marked offline.
                    // Displaying as offline is safer and more consistent with the server's reported state.
                    serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.offline;
                    serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textRed;
                } else {
                    serverInfo.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.offline;
                    serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textRed;
                }
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotOffline;
                }
            }
        }
    }

    /**
     * Updates the 'Running Time' and 'Total Running Time' display elements on the status page.
     * Uses formatDuration from sharedConfig for consistent time formatting.
     * @param {number} currentRunningTime - Current server running time in seconds.
     * @param {number} currentTotalRunningTime - Total server running time in seconds.
     */
    function updateStatusPageUptimeDisplays(currentRunningTime, currentTotalRunningTime) {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG; // Alias for brevity

        if (statusPageUptimeEl) {
            statusPageUptimeEl.innerHTML = SHARED_CONFIG.formatDuration(currentRunningTime, 'default'); // Use innerHTML for <1min
        }
        // The original 'else if' was redundant if currentRunningTime is undefined, formatDuration handles it.
        // However, to be safe, if the element exists but formatDuration might not be called due to null/undefined,
        // explicitly set loading. formatDuration already returns loading text for undefined/null.

        if (statusPageTotalUptimeEl) {
            statusPageTotalUptimeEl.innerHTML = SHARED_CONFIG.formatDuration(currentTotalRunningTime, 'totalUptime'); // Use innerHTML
        }
    }

    /**
     * Starts or restarts the real-time uptime counter specifically for the status page.
     * Updates uptime displays every second.
     */
    function startStatusPageRealtimeUptimeUpdates() {
        clearInterval(uptimeIntervalId_status);

        if (currentServerData.runningTime !== undefined && currentServerData.runningTime !== null) {
            initialRunningTimeSeconds_status = parseInt(currentServerData.runningTime, 10) || 0;
        } else {
            initialRunningTimeSeconds_status = 0;
        }

        if (currentServerData.totalRunningTime !== undefined && currentServerData.totalRunningTime !== null) {
            initialTotalRunningTimeSeconds_status = parseInt(currentServerData.totalRunningTime, 10) || 0;
        } else {
            initialTotalRunningTimeSeconds_status = 0;
        }

        lastUptimeUpdateTimestamp_status = Date.now();

        updateStatusPageUptimeDisplays(initialRunningTimeSeconds_status, initialTotalRunningTimeSeconds_status);

        uptimeIntervalId_status = setInterval(() => {
            if (initialRunningTimeSeconds_status === null || lastUptimeUpdateTimestamp_status === null) {
                clearInterval(uptimeIntervalId_status);
                return;
            }
            const elapsedSeconds = Math.floor((Date.now() - lastUptimeUpdateTimestamp_status) / 1000);
            const currentRunningTime = initialRunningTimeSeconds_status + elapsedSeconds;
            const currentTotalRunningTime = initialTotalRunningTimeSeconds_status + elapsedSeconds;
            updateStatusPageUptimeDisplays(currentRunningTime, currentTotalRunningTime);
        }, 1000);
    }

    /**
     * Handles 'full' WebSocket messages for the status page.
     * Updates all server data (servers, players, runningTime, totalRunningTime, maintenance status)
     * and refreshes the UI accordingly.
     * @param {object} data - The parsed data object from the WebSocket message.
     */
    function handleFullMessage(data) {
        currentServerData.servers = data.servers || {};
        currentServerData.players = data.players || { currentPlayers: {} };
        currentServerData.runningTime = data.runningTime;
        currentServerData.totalRunningTime = data.totalRunningTime;
        
        if (typeof data.isMaintenance === 'boolean') {
            currentServerData.isMaintenance = data.isMaintenance;
            currentServerData.maintenanceStartTime = data.maintenanceStartTime || null;
        } else {
            if (!currentServerData.isMaintenance) { 
                currentServerData.isMaintenance = false;
                currentServerData.maintenanceStartTime = null;
            }
        }

        if (currentServerData.isMaintenance) {
            displayMaintenanceInfoOnStatusPage();
        } else {
            if (maintenanceInfoContainerEl) maintenanceInfoContainerEl.classList.add('hidden');
            Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
            startStatusPageRealtimeUptimeUpdates();
        }
    }

    /**
     * Handles 'maintenance_status_update' WebSocket messages for the status page.
     * Updates the maintenance state and refreshes the UI.
     * @param {object} data - The parsed data object from the WebSocket message, expecting 'status' and 'maintenanceStartTime'.
     */
    function handleMaintenanceUpdate(data) {
        const isEnteringMaintenance = (data.status === true || data.status === 'true');

        currentServerData.maintenanceStartTime = data.maintenanceStartTime || null;
        
        // Update currentServerData.isMaintenance state based on the message
        currentServerData.isMaintenance = isEnteringMaintenance;

        if (isEnteringMaintenance) {
            displayMaintenanceInfoOnStatusPage();
        } else { 
            if (maintenanceInfoContainerEl) maintenanceInfoContainerEl.classList.add('hidden');
            Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
            startStatusPageRealtimeUptimeUpdates();
        }
    }

    /**
     * Handles 'players_update_add' WebSocket messages for the status page.
     * Adds player to local cache; UI refresh is handled by general update calls.
     * Note: This message type might not directly alter aggregated counts displayed but contributes to the player list tooltip.
     * @param {object} data - The parsed data object, expecting player details.
     */
    function handleAddPlayerUpdate(data) {
        if (data.player && data.player.username) {
            if (!currentServerData.players.currentPlayers) currentServerData.players.currentPlayers = {};
            currentServerData.players.currentPlayers[data.player.username] = {
                uuid: data.player.uuid,
                currentServer: 'unknown' 
            };
        }
        // Player additions might not immediately change aggregated server counts shown to user,
        // but a general UI refresh is performed to keep things consistent.
        Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
        startStatusPageRealtimeUptimeUpdates();
    }

    /**
     * Handles 'players_update_remove' WebSocket messages for the status page.
     * Removes player from local cache and attempts to decrement relevant server count if known.
     * @param {object} data - The parsed data object, expecting player UUID.
     */
    function handleRemovePlayerUpdate(data) {
        if (data.player && data.player.uuid) {
            let playerUsernameToRemove = null;
            let serverToDecrement = null;

            for (const usernameInCache in currentServerData.players.currentPlayers) {
                if (currentServerData.players.currentPlayers[usernameInCache].uuid === data.player.uuid) {
                    playerUsernameToRemove = usernameInCache;
                    serverToDecrement = currentServerData.players.currentPlayers[usernameInCache].currentServer;
                    break;
                }
            }
            if (playerUsernameToRemove) {
                if (serverToDecrement && serverToDecrement !== 'unknown' && currentServerData.servers[serverToDecrement]) {
                    currentServerData.servers[serverToDecrement].online = Math.max(0, currentServerData.servers[serverToDecrement].online - 1);
                }
                delete currentServerData.players.currentPlayers[playerUsernameToRemove];
            }
        }
        Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
        startStatusPageRealtimeUptimeUpdates();
    }

    /**
     * Handles 'server_update' WebSocket messages for the status page.
     * Typically updates player count on a specific server or a player's current server.
     * @param {object} data - The parsed data object, can contain player info and/or server online counts.
     */
    function handleServerUpdate(data) {
        if (data.player && data.player.username) { // This part seems to update player's current server
            if (!currentServerData.players.currentPlayers) currentServerData.players.currentPlayers = {};
            currentServerData.players.currentPlayers[data.player.username] = {
                uuid: data.player.uuid,
                currentServer: data.player.newServer
            };
        }
        if (data.servers) { // This part updates server online counts
            for (const serverName in data.servers) {
                if (currentServerData.servers[serverName]) {
                    currentServerData.servers[serverName].online = data.servers[serverName];
                } else {
                    // If server was not in currentServerData, initialize it. Assume isOnline if we get an update.
                    currentServerData.servers[serverName] = { online: data.servers[serverName], isOnline: true };
                }
            }
        }
        Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
        startStatusPageRealtimeUptimeUpdates();
    }

    /**
     * Establishes and manages the WebSocket connection for the status page.
     * Includes connection timeout, message handling, error handling, and a reconnection strategy.
     */
    function connectStatusPageWebSocket() {
        // Clear any existing timeout timer
        if (statusPageConnectionTimeoutTimer) clearTimeout(statusPageConnectionTimeoutTimer);

        wsStatusPage = new WebSocket(window.VOIDIX_SHARED_CONFIG.websocket.url);

        // Initial status is typically loading, handled by setInitialLoadingStatusOnStatusPage unless connection is instant
        // or an immediate error/close occurs triggering setDisconnectedStatusOnStatusPage.

        statusPageConnectionTimeoutTimer = setTimeout(() => {
            if (wsStatusPage.readyState !== WebSocket.OPEN) {

                wsStatusPage.close(); // Triggers onclose for reconnect
            }
        }, 5000);

        wsStatusPage.onopen = () => {
            clearTimeout(statusPageConnectionTimeoutTimer); // Connection successful

            statusPageReconnectAttempts = 0; // Reset on successful connection
        };
        wsStatusPage.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'full':
                        handleFullMessage(data);
                        break;
                    case 'maintenance_status_update':
                        handleMaintenanceUpdate(data);
                        break;
                    case 'players_update_add':
                        handleAddPlayerUpdate(data);
                        break;
                    case 'players_update_remove':
                        handleRemovePlayerUpdate(data);
                        break;
                    case 'server_update':
                        handleServerUpdate(data);
                        break;
                }
            } catch (error) {
                console.error('[Status Page] Error processing WebSocket message:', error, 'Raw data:', event.data);
            }
        };

        wsStatusPage.onerror = (error) => {
            clearTimeout(statusPageConnectionTimeoutTimer); // Clear timeout on error
            console.error('[Status Page] WebSocket Error:', error);
            // Call setDisconnectedStatusOnStatusPage directly on error, as no reconnection attempt is initiated by onerror itself.
            // onclose will likely follow and handle reconnection if applicable, or confirm disconnected state.
            setDisconnectedStatusOnStatusPage(); 
        };

        wsStatusPage.onclose = (event) => {
            clearTimeout(statusPageConnectionTimeoutTimer); // Clear timeout on close

            // setDisconnectedStatusOnStatusPage(); // Old logic: Update UI (Replaced by conditional logic below)
            
            const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
            const maxAttempts = SHARED_CONFIG.websocket.maxReconnectAttempts;
            const intervalSequence = SHARED_CONFIG.websocket.reconnectIntervalSequence || [5000]; // Fallback

            if (statusPageReconnectAttempts < maxAttempts) {
                setReconnectingStatusOnStatusPage(); // Show "Reconnecting..."
                const nextInterval = intervalSequence[statusPageReconnectAttempts] !== undefined
                                   ? intervalSequence[statusPageReconnectAttempts]
                                   : intervalSequence[intervalSequence.length - 1];

                statusPageReconnectAttempts++;

                setTimeout(connectStatusPageWebSocket, nextInterval);
            } else {

                setDisconnectedStatusOnStatusPage(); // Show permanent "Disconnected"
            }
        };
    }

    /**
     * Sets UI elements on the status page to a "Reconnecting..." state.
     * Handles maintenance mode appropriately.
     */
    function setReconnectingStatusOnStatusPage() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        const reconnectingText = SHARED_CONFIG.statusTexts.reconnecting || 'Reconnecting...'; // Fallback just in case
        const yellowTextClass = SHARED_CONFIG.statusClasses.textYellow; // e.g., 'text-yellow-400'
        // For individual server dots (w-3 h-3)
        const yellowDotClass = SHARED_CONFIG.statusClasses.statusPage.dotMaintenance; // Already yellow, includes flex-shrink-0 mr-2
        const pulseAnimationClass = SHARED_CONFIG.statusClasses.indexPage.animatePulse;

        if (currentServerData.isMaintenance) {
            displayMaintenanceInfoOnStatusPage(); // Keep maintenance UI dominant
            if (maintenanceInfoTextEl && maintenanceInfoTextEl.textContent.includes(SHARED_CONFIG.statusTexts.maintenanceStartTimePrefix)) {
                if (!maintenanceInfoTextEl.textContent.includes(reconnectingText)) { // Avoid appending multiple times
                    maintenanceInfoTextEl.textContent += ` (${reconnectingText})`;
                }
            }
            // Most elements are already yellow/dashed by displayMaintenanceInfoOnStatusPage
            return;
        }

        Object.values(serverStatusListConfig).forEach(s => {
            if (s.statusEl) {
                s.statusEl.textContent = reconnectingText;
                s.statusEl.className = yellowTextClass;
            }
            if (s.dotEl) {
                s.dotEl.className = `${yellowDotClass} ${pulseAnimationClass}`;
            }
        });

        if (statusPageUptimeEl) statusPageUptimeEl.textContent = reconnectingText;
        if (statusPageTotalUptimeEl) statusPageTotalUptimeEl.textContent = reconnectingText;

        const overallStatusTextEl = document.getElementById('overall-status-text');
        const overallStatusDotEl = document.getElementById('overall-status-dot');
        const totalOnlinePlayersEl = document.getElementById('total-online-players'); // Summary

        if (overallStatusTextEl) {
            overallStatusTextEl.textContent = reconnectingText;
            overallStatusTextEl.className = `text-lg font-semibold ${yellowTextClass}`;
        }
        if (overallStatusDotEl) {
            // Uses w-4 h-4, like index page dots
            overallStatusDotEl.className = `w-4 h-4 rounded-full ${SHARED_CONFIG.statusClasses.indexPage.colorYellow} ${pulseAnimationClass}`;
        }

        if (totalOnlinePlayersEl) {
            totalOnlinePlayersEl.textContent = reconnectingText;
            totalOnlinePlayersEl.className = `text-2xl font-bold ${yellowTextClass}`;
        }
        
        const playerListOnlineCountEl = document.getElementById('player-list-online-count');
        const playerListContainerEl = document.getElementById('player-list-container');
        if (playerListOnlineCountEl) playerListOnlineCountEl.textContent = reconnectingText;
        if (playerListContainerEl) playerListContainerEl.innerHTML = `<div class="text-center ${yellowTextClass}">${reconnectingText}</div>`;

        clearInterval(uptimeIntervalId_status);
        initialRunningTimeSeconds_status = null;
        initialTotalRunningTimeSeconds_status = null;
        lastUptimeUpdateTimestamp_status = null;
        // Do NOT reset currentServerData here.
    }

    /**
     * Sets all server status displays and uptime fields on the status page to a 'disconnected' state.
     * Clears existing server data to prevent showing stale information.
     * Handles maintenance mode display if active during disconnection.
     */
    function setDisconnectedStatusOnStatusPage() {
        if (currentServerData.isMaintenance) {
            // If in maintenance, keep showing maintenance info.
            // displayMaintenanceInfoOnStatusPage already handles this.
            displayMaintenanceInfoOnStatusPage();
            // Optionally, add a note about connection being lost during maintenance.
            if (maintenanceInfoTextEl) {
                let text = window.VOIDIX_SHARED_CONFIG.statusTexts.maintenanceStartTimePrefix;
                if (currentServerData.maintenanceStartTime) {
                    text += formatMaintenanceStartTime(currentServerData.maintenanceStartTime);
                } else {
                    text = window.VOIDIX_SHARED_CONFIG.statusTexts.maintenance;
                }
                // Ensure the disconnected text is from shared config if possible
                const disconnectedText = window.VOIDIX_SHARED_CONFIG.statusTexts.disconnected || 'Disconnected';
                maintenanceInfoTextEl.textContent = `${text} (${disconnectedText})`;
            }
            return;
        }

        Object.values(serverStatusListConfig).forEach(s => {
            if (s.statusEl) {
                s.statusEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.disconnected;
                s.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textRed;
            }
            if (s.dotEl) s.dotEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.statusPage.dotOffline;
        });
        if (statusPageUptimeEl) statusPageUptimeEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.unknown;
        if (statusPageTotalUptimeEl) statusPageTotalUptimeEl.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.unknown;

        // Clear any existing uptime interval and reset tracking variables for status page
        clearInterval(uptimeIntervalId_status);
        initialRunningTimeSeconds_status = null;
        initialTotalRunningTimeSeconds_status = null;
        lastUptimeUpdateTimestamp_status = null;

        // Reset server data to avoid showing stale info on reconnect attempt
        currentServerData = {
            servers: {},
            players: { currentPlayers: {} },
            runningTime: undefined,
            totalRunningTime: undefined
        };
    }

    /**
     * Displays maintenance information on the status page, including start time if available.
     * Updates various UI elements (overall status, server cards, player list, uptime) to reflect maintenance mode.
     * Clears the uptime interval.
     */
    function displayMaintenanceInfoOnStatusPage() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        if (maintenanceInfoContainerEl && maintenanceInfoTextEl) {
            maintenanceInfoContainerEl.classList.remove('hidden');
            let startTimeText = 'N/A'; // Default if no start time
            if (currentServerData.maintenanceStartTime) {
                try {
                    startTimeText = formatMaintenanceStartTime(currentServerData.maintenanceStartTime);
                } catch (e) { 
                    startTimeText = 'Invalid time format'; // English fallback
                }
            }
            
            let baseText = `${SHARED_CONFIG.statusTexts.maintenanceStartTimePrefix}${startTimeText}`;
            const disconnectedText = SHARED_CONFIG.statusTexts.disconnected || 'Disconnected';
            const disconnectedSuffix = ` (${disconnectedText})`;
            const reconnectingText = SHARED_CONFIG.statusTexts.reconnecting || 'Reconnecting...';
            const reconnectingSuffixPattern = new RegExp(` \\(${reconnectingText.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\)$`); // Escape regex special chars

            // Current text in the element
            let currentText = maintenanceInfoTextEl.textContent;

            // Remove reconnecting suffix if present
            if (currentText.match(reconnectingSuffixPattern)) {
                currentText = currentText.replace(reconnectingSuffixPattern, '');
            }
            
            // Set the base maintenance message (start time or general maintenance text)
            maintenanceInfoTextEl.textContent = baseText;

            // Add disconnected suffix if WebSocket is not open and the suffix isn't already there
            if (wsStatusPage?.readyState !== WebSocket.OPEN && !baseText.endsWith(disconnectedSuffix)) {
                 maintenanceInfoTextEl.textContent += disconnectedSuffix;
            }
        }

        // Ensure these elements exist before trying to update them
        const overallStatusTextEl = document.getElementById('overall-status-text');
        const overallStatusDotEl = document.getElementById('overall-status-dot');
        const totalOnlinePlayersEl = document.getElementById('total-online-players'); // Assuming this is the ID for the summary

        // Update overall status text and dot
        if (overallStatusTextEl) {
            overallStatusTextEl.textContent = SHARED_CONFIG.statusTexts.maintenance;
            overallStatusTextEl.className = `text-lg font-semibold ${SHARED_CONFIG.statusClasses.textYellow.split(' ')[0]}`;
        }
        if (overallStatusDotEl) {
            overallStatusDotEl.className = `w-4 h-4 rounded-full ${SHARED_CONFIG.statusClasses.colorYellow}`;
        }

        // Update individual server cards
        const serverCardContainer = document.getElementById('server-cards-container');
        if (serverCardContainer) {
            const serverCards = serverCardContainer.querySelectorAll('.status-card'); // More robust selector
            serverCards.forEach(card => {
                const statusTextEl = card.querySelector('.status-text');
                const statusDotEl = card.querySelector('.status-dot');
                const playerCountEl = card.querySelector('.player-count');

                if (statusTextEl) {
                    statusTextEl.textContent = SHARED_CONFIG.statusTexts.maintenance;
                    statusTextEl.className = `status-text font-semibold ${SHARED_CONFIG.statusClasses.textYellow.split(' ')[0]}`;
                }
                if (statusDotEl) {
                    statusDotEl.className = `status-dot w-3 h-3 rounded-full ${SHARED_CONFIG.statusClasses.colorYellow}`;
                }
                if (playerCountEl) {
                    playerCountEl.textContent = '-';
                }
            });
        }
        
        // Update player list to indicate maintenance or clear it
        const playerListOnlineCountEl = document.getElementById('player-list-online-count');
        const playerListContainerEl = document.getElementById('player-list-container');
        if (playerListOnlineCountEl) playerListOnlineCountEl.textContent = SHARED_CONFIG.statusTexts.maintenance;
        if (playerListContainerEl) playerListContainerEl.innerHTML = `<div class="text-center text-gray-400">Server is currently under maintenance.</div>`;

        // Update uptime displays
        if (statusPageUptimeEl) statusPageUptimeEl.textContent = '-';
        if (statusPageTotalUptimeEl) statusPageTotalUptimeEl.textContent = '-';
        clearInterval(uptimeIntervalId_status);
        
        // Also ensure the "players online" summary is updated
        if(totalOnlinePlayersEl) {
            totalOnlinePlayersEl.textContent = SHARED_CONFIG.statusTexts.maintenance;
            if(SHARED_CONFIG.statusClasses.textYellow) { // Check if textYellow exists
                 totalOnlinePlayersEl.className = `text-2xl font-bold ${SHARED_CONFIG.statusClasses.textYellow.split(' ')[0]}`;
            } else {
                // Fallback or default class if textYellow is not in sharedConfig for some reason
                totalOnlinePlayersEl.className = 'text-2xl font-bold text-yellow-400'; // Example fallback
            }
        }
    }

    /**
     * Helper function to format a Unix timestamp (in milliseconds) into a YYYY-MM-DD HH:MM:SS string.
     * @param {string|number} timestamp - The Unix timestamp.
     * @returns {string} Formatted date-time string, or an error/placeholder string if formatting fails.
     */
    function formatMaintenanceStartTime(timestamp) {
        if (!timestamp) return window.VOIDIX_SHARED_CONFIG.statusTexts.unknownTime;
        try {
            const date = new Date(parseInt(timestamp));
            if (isNaN(date.getTime())) return window.VOIDIX_SHARED_CONFIG.statusTexts.invalidTimestamp;
            // Format as YYYY-MM-DD HH:MM:SS
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {

            return window.VOIDIX_SHARED_CONFIG.statusTexts.timeFormatError;
        }
    }

    connectStatusPageWebSocket();

    /**
     * Sets up an accordion (collapsible section) for the given button, content, and icon elements.
     * Manages the expansion/collapse animation and icon rotation.
     * Includes logic to prevent event propagation if an accordion is nested.
     * @param {string} buttonId - The ID of the accordion trigger button.
     * @param {string} contentId - The ID of the accordion content element.
     * @param {string} iconClass - The class of the SVG icon within the button to rotate.
     */
    function setupAccordion(buttonId, contentId, iconClass) {
        const button = document.getElementById(buttonId);
        const content = document.getElementById(contentId);
        const icon = button ? button.querySelector('svg.' + iconClass) : null;

        if (button && content && icon) {
            content.style.maxHeight = '0px';
            content.style.opacity = '0';

            button.addEventListener('click', (e) => {
                // Stop propagation if this accordion button is inside another accordion's content area
                // to prevent the parent accordion from toggling.
                if (e.target.closest('#' + buttonId) === button) { // Ensure the click is on this button or its children
                    e.stopPropagation();
                }

                const isExpanded = content.style.maxHeight !== '0px';
                if (isExpanded) {
                    content.style.maxHeight = '0px';
                    content.style.opacity = '0';
                    icon.classList.remove('rotate-180');
                } else {
                    // Refined expansion logic
                    // 1. Remove 'max-height: 0px' constraint to allow scrollHeight to be calculated correctly.
                    content.style.maxHeight = ''; // Temporarily unconstrain height

                    // 2. Get the scrollHeight.
                    const height = content.scrollHeight;

                    // 3. Set maxHeight to 0px again *before* starting the transition to the full height.
                    //    This defines the transition's starting point.
                    content.style.maxHeight = '0px';

                    // 4. Force a reflow to make the browser recognize the change to 0px
                    //    before it then transitions to the calculated height.
                    content.offsetHeight; // Trigger reflow

                    // 5. Now set the target maxHeight and opacity for the transition.
                    content.style.opacity = '1';
                    content.style.maxHeight = height + "px";
                    icon.classList.add('rotate-180');
                }
            });
        }
    }

    // Setup Nested Bedwars Accordion
    setupAccordion('bedwars-sub-accordion-button', 'bedwars-sub-accordion-content', 'bedwars-sub-accordion-icon');

    // Tooltip Logic
    const tooltip = document.getElementById('player-tooltip');
    const tooltipList = document.getElementById('player-tooltip-list');
    const tooltipEmptyMsg = document.getElementById('player-tooltip-empty'); // Corrected variable name
    let hideTooltipTimeout;
    let playerListScrollIntervalId = null; // For auto-scrolling player list
    const PLAYER_LIST_SCROLL_SPEED = 1;    // Pixels per interval for auto-scroll
    const PLAYER_LIST_SCROLL_INTERVAL = 30; // Milliseconds per interval for auto-scroll

    /**
     * Shows a tooltip displaying a list of players for the specified serverKey.
     * Positions the tooltip relative to the event's target element.
     * Handles cases where player data might still be loading or no players are on the server.
     * @param {Event} event - The mouse event that triggered the tooltip.
     * @param {string} serverKey - The key of the server for which to show players.
     */
    function showPlayerTooltip(event, serverKey) {
        clearTimeout(hideTooltipTimeout);
        clearInterval(playerListScrollIntervalId); // Stop any existing scroll animation
        if (tooltipList) tooltipList.scrollTop = 0; // Reset scroll position

        tooltip.classList.remove('hidden', 'opacity-0'); // Show immediately for position calculation

        const serverInfo = serverStatusListConfig[serverKey];
        if (!serverInfo || !currentServerData || !currentServerData.players || !currentServerData.players.currentPlayers) {
            tooltipList.classList.add('hidden');
            tooltipEmptyMsg.classList.remove('hidden');
            tooltipEmptyMsg.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.playerDataLoading;
            // Attempt to position even with loading message
            positionTooltip(event.currentTarget);
            return;
        }

        const targetElement = event.currentTarget;
        let playersOnServer = [];
        const playerUsernames = Object.keys(currentServerData.players.currentPlayers);

        serverInfo.keys.forEach(subKey => {
            playerUsernames.forEach(username => {
                const playerData = currentServerData.players.currentPlayers[username];
                if (playerData.currentServer === subKey) {
                    playersOnServer.push(username);
                }
            });
        });
        playersOnServer = [...new Set(playersOnServer)].sort(); // Get unique names and sort

        tooltipList.innerHTML = '';
        if (playersOnServer.length > 0) {
            playersOnServer.forEach(playerName => {
                const li = document.createElement('li');
                li.textContent = playerName;
                tooltipList.appendChild(li);
            });
            tooltipList.classList.remove('hidden');
            tooltipEmptyMsg.classList.add('hidden');
        } else {
            tooltipList.classList.add('hidden');
            tooltipEmptyMsg.classList.remove('hidden');
            tooltipEmptyMsg.textContent = window.VOIDIX_SHARED_CONFIG.statusTexts.noPlayersOnline;
        }

        positionTooltip(targetElement);
        tooltip.style.opacity = '1'; // Fade in

        // Start auto-scroll if content overflows
        if (tooltipList && tooltipList.scrollHeight > tooltipList.clientHeight) {
            startPlayerListAutoScroll(tooltipList);
        }
    }

    /**
     * Calculates and sets the position of the player tooltip relative to a target HTML element.
     * Ensures the tooltip does not go off-screen by adjusting its left/top position if needed.
     * @param {HTMLElement} targetElement - The element to position the tooltip relative to.
     */
    function positionTooltip(targetElement) {
        if (!tooltip || !targetElement) return;
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect(); // Get current tooltip size

        let left = rect.right + 10 + window.scrollX;
        let top = rect.top + window.scrollY;

        // Adjust if tooltip goes off-screen (right)
        if (left + tooltipRect.width > window.innerWidth - 10) { // 10px buffer from edge
            left = rect.left - tooltipRect.width - 10 + window.scrollX;
        }
        // Adjust if tooltip goes off-screen (left)
        if (left < 10 + window.scrollX) {
            left = 10 + window.scrollX;
        }

        // Adjust if tooltip goes off-screen (bottom)
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = window.innerHeight - tooltipRect.height - 10 + window.scrollY;
        }
        // Adjust if tooltip goes off-screen (top)
        if (top < 10 + window.scrollY) {
            top = 10 + window.scrollY;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * Hides the player tooltip after a short delay.
     * Clears any active auto-scroll interval for the player list.
     */
    function hidePlayerTooltip() {
        clearInterval(playerListScrollIntervalId); // Stop scrolling when hiding tooltip
        if (tooltipList) tooltipList.scrollTop = 0; // Reset scroll position

        hideTooltipTimeout = setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                tooltip.classList.add('hidden');
            }, 200); // Corresponds to transition-opacity duration-200
        }, 250);
    }

    /**
     * Starts an auto-scrolling animation for the player list within the tooltip if its content overflows.
     * @param {HTMLElement} listElement - The player list HTML element (UL).
     */
    function startPlayerListAutoScroll(listElement) {
        playerListScrollIntervalId = setInterval(() => {
            if (listElement.scrollTop < (listElement.scrollHeight - listElement.clientHeight)) {
                listElement.scrollTop += PLAYER_LIST_SCROLL_SPEED;
            } else {
                // Optional: Pause briefly before resetting to top, or just reset
                // setTimeout(() => { listElement.scrollTop = 0; }, 500); // Example pause
                listElement.scrollTop = 0; // Reset to top to loop scroll
            }
        }, PLAYER_LIST_SCROLL_INTERVAL);
    }

    /**
     * Sets up mouseenter/mouseleave event listeners for server entries to show/hide the player tooltip.
     * Skips binding for elements that are accordion triggers to prevent event conflicts.
     * Finds appropriate hover targets for different server entry structures.
     */
    function setupTooltipEvents() {
        Object.keys(serverStatusListConfig).forEach(serverKey => {
            const serverInfo = serverStatusListConfig[serverKey];
            let hoverTarget = null;
            let isAccordionTrigger = false;

            if (serverKey === 'minigames_aggregate') {
                hoverTarget = document.getElementById('minigames-overall-header');
            } else if (serverKey === 'bedwars_sub_aggregate') {
                hoverTarget = document.getElementById('bedwars-sub-accordion-button');
                isAccordionTrigger = true; // This is an accordion trigger
            } else if (serverInfo.dotEl) {
                hoverTarget = serverInfo.dotEl.closest('.p-3.sm\\:p-4.rounded-lg');
                // Fallback for specific server keys if the initial closest target isn't found (e.g. different HTML structure)
                if (!hoverTarget && (serverKey === 'survival' || serverKey === 'lobby1')) {
                    const directChildren = Array.from(document.getElementById('server-status-list').children);
                    directChildren.forEach(child => {
                        if (child.querySelector(`#${serverInfo.dotEl.id}`)) {
                            hoverTarget = child;
                        }
                    });
                }
            }

            if (hoverTarget) {
                if (isAccordionTrigger) {
                    // For accordion triggers, we don't bind the tooltip mouseenter/mouseleave events
                    // to avoid conflict with the click/tap action for toggling the accordion on mobile.
                    // The accordion's own click handler (from setupAccordion) will manage its state.
                } else {
                    // Bind tooltip events for non-accordion trigger elements
                    hoverTarget.addEventListener('mouseenter', (event) => {
                        tooltip.classList.remove('hidden');
                        tooltip.style.opacity = '0';
                        showPlayerTooltip(event, serverKey);
                    });
                    hoverTarget.addEventListener('mouseleave', hidePlayerTooltip);
                    hoverTarget.addEventListener('mousemove', () => {
                        clearTimeout(hideTooltipTimeout);
                    });
                    tooltip.addEventListener('mouseenter', () => {
                        clearTimeout(hideTooltipTimeout);
                    });
                    tooltip.addEventListener('mouseleave', hidePlayerTooltip);
                }
            } else {

            }
        });
    }
    setupTooltipEvents();

    /**
     * Initializes the display names of servers on the status page using names from VOIDIX_SHARED_CONFIG.
     * Logs a warning if a display name element is configured but no corresponding name is found in the shared config.
     */
    function initializeServerDisplayNames() {

        Object.values(serverStatusListConfig).forEach(serverInfo => {
            if (serverInfo.displayNameEl && serverInfo.name) {
                serverInfo.displayNameEl.textContent = serverInfo.name;
            }
        });
    }
    initializeServerDisplayNames(); // Call the new function

});