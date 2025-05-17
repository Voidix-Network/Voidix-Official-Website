/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// Please copy the JavaScript code from status.html (lines approx. 430-936) into this file.
// Specific script for status page to fetch server data
document.addEventListener("DOMContentLoaded", () => {
    // Remove existing mock fetch logic

    let ws;
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
    const serverStatusListConfig = {
        minigames_aggregate: {
            statusEl: document.getElementById("minigames-aggregate-status"), // Element ID in status.html
            dotEl: document.getElementById("minigames-aggregate-dot"),       // Element ID in status.html
            keys: window.VOIDIX_SHARED_CONFIG.minigameKeys, // Server keys from WS data
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.minigames_aggregate
        },
        bedwars_sub_aggregate: {
            statusEl: document.getElementById("bedwars-sub-aggregate-status"),
            dotEl: null, // Set to null as the element is removed
            keys: ["bedwars", "bedwars_solo", "bedwars_other"], // This remains specific as it's a sub-aggregate
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.bedwars_sub_aggregate
        },
        bedwars: {
            statusEl: document.getElementById("bedwars-status"),
            dotEl: document.getElementById("bedwars-dot"),
            keys: ["bedwars"],
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.bedwars
        },
        bedwars_solo: {
            statusEl: document.getElementById("bedwars_solo-status"),
            dotEl: document.getElementById("bedwars_solo-dot"),
            keys: ["bedwars_solo"],
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.bedwars_solo
        },
        bedwars_other: {
            statusEl: document.getElementById("bedwars_other-status"),
            dotEl: document.getElementById("bedwars_other-dot"),
            keys: ["bedwars_other"],
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.bedwars_other
        },
        survival: {
            statusEl: document.getElementById("survival-live-status"),
            dotEl: document.getElementById("survival-dot"), // Assuming this ID will be on the survival dot
            keys: ["survival"],
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.survival
        },
        lobby: {
            statusEl: document.getElementById("lobby-live-status"),
            dotEl: document.querySelector("#server-status-list > div:last-child .status-dot"), // More robust selector needed if survival isn't last before lobby or if lobby isn't last overall. Let's give lobby dot an ID.
            keys: ["lobby"],
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.lobby
        },
        knockioffa: {
            statusEl: document.getElementById("knockioffa-live-status"),
            dotEl: document.getElementById("knockioffa-dot"),
            keys: ["knockioffa"],
            name: window.VOIDIX_SHARED_CONFIG.serverDisplayNames.knockioffa
        },
    };

    // Ensure survival and lobby dots have IDs for robust selection
    const survivalDot = document.querySelector("#server-status-list div:nth-child(5) .status-dot"); // Example, adjust if HTML order changes
    if (survivalDot && !survivalDot.id) survivalDot.id = "survival-dot";

    const lobbyDot = document.querySelector("#server-status-list div:nth-child(6) .status-dot"); // Example
    if (lobbyDot && !lobbyDot.id) lobbyDot.id = "lobby-dot";

    // Re-acquire dot elements with new IDs if they were just set
    if (serverStatusListConfig.survival.dotEl.id !== "survival-dot" && document.getElementById("survival-dot")) {
        serverStatusListConfig.survival.dotEl = document.getElementById("survival-dot");
    }
    if (serverStatusListConfig.lobby.dotEl.id !== "lobby-dot" && document.getElementById("lobby-dot")) { // Check if querySelector was used initially
        const actualLobbyDot = document.querySelector("#server-status-list > div:nth-last-child(1) .status-dot"); // Assuming lobby is last
        if(actualLobbyDot && !actualLobbyDot.id) actualLobbyDot.id = "lobby-dot";
        serverStatusListConfig.lobby.dotEl = document.getElementById("lobby-dot") || actualLobbyDot;
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

    // Sets the initial display text of server statuses and uptime fields to a loading state.
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

    // Updates the display (status text and dot) for a single server entry based on currentServerData.
    function updateServerDisplay(serverKey) {
        const serverInfo = serverStatusListConfig[serverKey];
        if (!serverInfo || !serverInfo.statusEl) return;

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
                if (serverKey === 'minigames_aggregate' || serverKey === 'bedwars_sub_aggregate') {
                    // This log is kept as it indicates a potential data issue for aggregates
                    console.log(`[DEBUG Status WS] Aggregation warning for '${serverKey}': SubKey '${subKey}' NOT FOUND in currentServerData.servers.`);
                }
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
                    serverInfo.statusEl.textContent = `${onlineCount} ${window.VOIDIX_SHARED_CONFIG.statusTexts.online} (但服务器标记为离线)`; 
                    serverInfo.statusEl.className = window.VOIDIX_SHARED_CONFIG.statusClasses.textYellow;
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

    // Updates the '运行时间' and '总运行时长' display elements on the status page.
    // Formats seconds into days/hours/minutes or years/days as appropriate.
    // Accepts current running time and total running time in seconds.
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

    // Starts or restarts the real-time uptime counter for the status page
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

    // Establishes and manages the WebSocket connection for receiving real-time server status updates.
    function connectStatusPageWebSocket() {
        // Clear any existing timeout timer
        if (statusPageConnectionTimeoutTimer) clearTimeout(statusPageConnectionTimeoutTimer);

        wsStatusPage = new WebSocket(window.VOIDIX_SHARED_CONFIG.websocket.url);
        console.log('[DEBUG] Status WS: Attempting connection...');
        
        // if (currentServerData.isMaintenance) { 
        //     displayMaintenanceInfoOnStatusPage();
        // } else {
        //     setInitialLoadingStatusOnStatusPage();
        // }
        // Initial status is typically loading, handled by setInitialLoadingStatusOnStatusPage unless connection is instant
        // or an immediate error/close occurs triggering setDisconnectedStatusOnStatusPage.

        statusPageConnectionTimeoutTimer = setTimeout(() => {
            if (wsStatusPage.readyState !== WebSocket.OPEN) {
                console.log('[DEBUG] Status WS: Connection attempt timed out. Closing and retrying.');
                wsStatusPage.close(); // Triggers onclose for reconnect
            }
        }, 5000);

        wsStatusPage.onopen = () => {
            clearTimeout(statusPageConnectionTimeoutTimer); // Connection successful
            console.log('[DEBUG] Status WS: Connected (onopen)');
            statusPageReconnectAttempts = 0; // Reset on successful connection
        };

        wsStatusPage.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Concise log for received messages
                const commonPayloadPreview = `isMaint: ${data.isMaintenance}, status: ${data.status}`;
                let specificPayloadPreview = '';
                if (data.type === 'full') {
                    specificPayloadPreview = `servers: ${data.servers ? Object.keys(data.servers).length : 'N/A'}, players: ${data.players ? data.players.online : 'N/A'}`;
                } else if (data.type === 'server_update' && data.servers) {
                    specificPayloadPreview = `updated_servers: ${Object.keys(data.servers).join(', ')}`;
                } else if ((data.type === 'players_update_add' || data.type === 'players_update_remove') && data.player) {
                    specificPayloadPreview = `player_uuid: ${data.player.uuid}`;
                }
                console.log(`[DEBUG] Status WS MSG: type: ${data.type}, ${commonPayloadPreview}, ${specificPayloadPreview}`);


                if (data.type === 'full') {
                    currentServerData.servers = data.servers || {};
                    currentServerData.players = data.players || { currentPlayers: {} };
                    currentServerData.runningTime = data.runningTime;
                    currentServerData.totalRunningTime = data.totalRunningTime;
                    // Handle isMaintenance and maintenanceStartTime from full message
                    if (typeof data.isMaintenance === 'boolean') {
                        currentServerData.isMaintenance = data.isMaintenance;
                        currentServerData.maintenanceStartTime = data.maintenanceStartTime || null;
                    } else {
                         // If not present in full message, assume not in maintenance unless previously set
                        // This handles the case where backend stops sending it when maintenance is false
                        if (!currentServerData.isMaintenance) { // only reset if not already in maintenance
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
                } else if (data.type === 'maintenance_status_update') {
                    // Correctly check for boolean true or string 'true' for robust handling
                    const isEnteringMaintenance = (data.status === true || data.status === 'true');
                    console.log(`[DEBUG] Status WS: Processing "maint_update". raw status: ${data.status}, isEnteringMaint: ${isEnteringMaintenance}`);
                    currentServerData.maintenanceStartTime = data.maintenanceStartTime || null;
                    
                    if (isEnteringMaintenance) {
                        displayMaintenanceInfoOnStatusPage(); // Update UI based on new maintenance state
                    } else { // Exiting maintenance
                        // Hide maintenance-specific info
                        if (maintenanceInfoContainerEl) maintenanceInfoContainerEl.classList.add('hidden');
                        
                        // Attempt to restore previous state immediately using current (likely stale) data
                        Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
                        startStatusPageRealtimeUptimeUpdates();
                        // No longer call setInitialLoadingStatusOnStatusPage() here.
                    }
                } else if (data.type === 'players_update_add') {
                    if (data.player && data.player.username) {
                        if (!currentServerData.players.currentPlayers) currentServerData.players.currentPlayers = {};
                        currentServerData.players.currentPlayers[data.player.username] = {
                            uuid: data.player.uuid,
                            currentServer: 'unknown' // Will be updated by a subsequent server_update
                        };
                        // console.log('Player added to currentPlayers (status.html):', data.player.username); // Reduced verbosity
                    }
                } else if (data.type === 'players_update_remove') {
                    if (data.player && data.player.uuid) { // Check for UUID instead of username
                        let playerUsernameToRemove = null;
                        let serverToDecrement = null;

                        // Find the player by UUID
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
                            // console.log('Player removed by UUID (status.html):', playerUsernameToRemove, data.player.uuid); // Reduced verbosity
                        } else {
                            console.warn('[DEBUG] Status WS: Player to remove (by UUID) not found in local cache:', data.player.uuid);
                        }
                    }
                } else if (data.type === 'server_update') {
                    if (data.player && data.player.username) {
                        if (!currentServerData.players.currentPlayers) currentServerData.players.currentPlayers = {};
                        currentServerData.players.currentPlayers[data.player.username] = {
                            uuid: data.player.uuid,
                            currentServer: data.player.newServer
                        };
                    }
                    if (data.servers) {
                        for (const serverName in data.servers) {
                            if (currentServerData.servers[serverName]) {
                                currentServerData.servers[serverName].online = data.servers[serverName];
                            } else {
                                currentServerData.servers[serverName] = { online: data.servers[serverName], isOnline: true };
                            }
                        }
                    }
                }
                // players_update_add does not directly affect server counts here, server_update does for specific server.

                Object.keys(serverStatusListConfig).forEach(key => updateServerDisplay(key));
                startStatusPageRealtimeUptimeUpdates(); // Start/Restart the real-time counter

            } catch (error) {
                console.error('[DEBUG] Status WS: Error processing message:', error, 'Raw data:', event.data);
            }
        };

        wsStatusPage.onerror = (error) => {
            clearTimeout(statusPageConnectionTimeoutTimer); // Clear timeout on error
            console.error('[DEBUG] Status WS: Error:', error);
            setDisconnectedStatusOnStatusPage(); // Update UI to disconnected
        };

        wsStatusPage.onclose = (event) => {
            clearTimeout(statusPageConnectionTimeoutTimer); // Clear timeout on close
            console.log(`[DEBUG] Status WS: Disconnected. Code: ${event.code}, Reason: "${event.reason}".`);
            setDisconnectedStatusOnStatusPage(); // Update UI
            
            const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
            const maxAttempts = SHARED_CONFIG.websocket.maxReconnectAttempts;
            const intervalSequence = SHARED_CONFIG.websocket.reconnectIntervalSequence || [5000]; // Fallback

            if (statusPageReconnectAttempts < maxAttempts) {
                const nextInterval = intervalSequence[statusPageReconnectAttempts] !== undefined
                                   ? intervalSequence[statusPageReconnectAttempts]
                                   : intervalSequence[intervalSequence.length - 1];

                statusPageReconnectAttempts++;
                console.log(`[DEBUG] Status WS: Attempting reconnect ${statusPageReconnectAttempts}/${maxAttempts} in ${nextInterval / 1000}s...`);
                setTimeout(connectStatusPageWebSocket, nextInterval);
            } else {
                console.log(`[DEBUG] Status WS: Max reconnect attempts (${maxAttempts}) reached.`);
            }
        };
    }

    // Sets all server status displays and uptime fields to a 'disconnected' state.
    // Clears existing server data.
    function setDisconnectedStatusOnStatusPage() {
        if (currentServerData.isMaintenance) {
            // If in maintenance, we might want to keep showing maintenance info
            // or show a specific "maintenance & disconnected" message.
            // For now, let displayMaintenanceInfoOnStatusPage handle it, which shows maintenance.
            displayMaintenanceInfoOnStatusPage();
            // Optionally, you could add a note about connection being lost during maintenance.
            if (maintenanceInfoTextEl) {
                let text = window.VOIDIX_SHARED_CONFIG.statusTexts.maintenanceStartTimePrefix;
                if (currentServerData.maintenanceStartTime) {
                    text += formatMaintenanceStartTime(currentServerData.maintenanceStartTime);
                } else {
                    text = window.VOIDIX_SHARED_CONFIG.statusTexts.maintenance;
                }
                maintenanceInfoTextEl.textContent = text + " (连接已断开)";
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

    // Helper function to display maintenance information on the status page
    function displayMaintenanceInfoOnStatusPage() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        if (maintenanceInfoContainerEl && maintenanceInfoTextEl) {
            maintenanceInfoContainerEl.classList.remove('hidden');
            let startTimeText = 'N/A';
            if (currentServerData.maintenanceStartTime) {
                try {
                    startTimeText = formatMaintenanceStartTime(currentServerData.maintenanceStartTime); // Use the refactored helper
                } catch (e) { 
                    console.error("[DEBUG] Status Page: Error parsing maintenanceStartTime for display:", e); 
                    startTimeText = '时间解析错误';
                }
            }
            maintenanceInfoTextEl.textContent = `${SHARED_CONFIG.statusTexts.maintenanceStartTimePrefix}${startTimeText}`;
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

        if (playerListOnlineCountEl) playerListOnlineCountEl.textContent = '维护中';
        if (playerListContainerEl) playerListContainerEl.innerHTML = '<div class="text-center text-gray-400">当前处于服务器维护状态。</div>';


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

    // Helper function to format maintenance start time
    function formatMaintenanceStartTime(timestamp) {
        if (!timestamp) return '未知时间';
        try {
            const date = new Date(parseInt(timestamp));
            if (isNaN(date.getTime())) return '无效时间戳';
            // Format as YYYY-MM-DD HH:MM:SS
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            console.error("[DEBUG] Status Page: Error formatting maintenance start time:", e);
            return '时间格式错误';
        }
    }

    connectStatusPageWebSocket();

    // Accordion Logic
    // Sets up an accordion (collapsible section) for the given button, content, and icon elements.
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

    // Shows a tooltip displaying a list of players for the specified serverKey.
    // Positions the tooltip relative to the event's target element.
    function showPlayerTooltip(event, serverKey) {
        clearTimeout(hideTooltipTimeout);
        clearInterval(playerListScrollIntervalId); // Stop any existing scroll animation
        if (tooltipList) tooltipList.scrollTop = 0; // Reset scroll position

        tooltip.classList.remove('hidden', 'opacity-0'); // Show immediately for position calculation

        const serverInfo = serverStatusListConfig[serverKey];
        if (!serverInfo || !currentServerData || !currentServerData.players || !currentServerData.players.currentPlayers) {
            tooltipList.classList.add('hidden');
            tooltipEmptyMsg.classList.remove('hidden');
            tooltipEmptyMsg.textContent = '玩家数据加载中...';
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
            tooltipEmptyMsg.textContent = '此服务器当前没有玩家在线。';
        }

        positionTooltip(targetElement);
        tooltip.style.opacity = '1'; // Fade in

        // Start auto-scroll if content overflows
        if (tooltipList && tooltipList.scrollHeight > tooltipList.clientHeight) {
            startPlayerListAutoScroll(tooltipList);
        }
    }

    // Calculates and sets the position of the player tooltip relative to a target HTML element.
    // Ensures the tooltip does not go off-screen.
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

    // Hides the player tooltip after a short delay.
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

    // Starts auto-scrolling for the player list in the tooltip
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

    // Sets up mouseenter/mouseleave event listeners for server entries to show/hide the player tooltip.
    // Skips binding for elements اللي هي triggers for accordions to prevent conflicts on mobile.
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
                if (!hoverTarget && (serverKey === 'survival' || serverKey === 'lobby')) {
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
                    // console.log('Skipping tooltip hover events for accordion trigger:', serverKey); // Reduced verbosity
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
                console.warn('[DEBUG] Status Page: Could not find tooltip hover target for serverKey:', serverKey, serverInfo.dotEl ? serverInfo.dotEl.id : 'No dotEl');
            }
        });
    }
    setupTooltipEvents();

});