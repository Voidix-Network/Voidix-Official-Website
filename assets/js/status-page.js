/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// Please copy the JavaScript code from status.html (lines approx. 430-936) into this file. 
// Specific script for status page to fetch server data
document.addEventListener("DOMContentLoaded", () => {
    // Remove existing mock fetch logic

    const WS_URL = 'ws://ikuaiservice.catpixel.cn:10203';
    let ws;

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
            keys: ["bedwars", "bedwars_solo", "bedwars_other", "lobby"], // Server keys from WS data
            name: "小游戏服务器 (minigame.voidix.top)"
        },
        bedwars_sub_aggregate: {
            statusEl: document.getElementById("bedwars-sub-aggregate-status"),
            dotEl: null, // Set to null as the element is removed
            keys: ["bedwars", "bedwars_solo", "bedwars_other"],
            name: "起床战争 (总览)"
        },
        bedwars: {
            statusEl: document.getElementById("bedwars-status"),
            dotEl: document.getElementById("bedwars-dot"),
            keys: ["bedwars"],
            name: "起床大厅 (bedwars)"
        },
        bedwars_solo: {
            statusEl: document.getElementById("bedwars_solo-status"),
            dotEl: document.getElementById("bedwars_solo-dot"),
            keys: ["bedwars_solo"],
            name: "起床战争 (单人)"
        },
        bedwars_other: {
            statusEl: document.getElementById("bedwars_other-status"),
            dotEl: document.getElementById("bedwars_other-dot"),
            keys: ["bedwars_other"],
            name: "起床战争 (其他)"
        },
        survival: {
            statusEl: document.getElementById("survival-live-status"),
            dotEl: document.getElementById("survival-dot"), // Assuming this ID will be on the survival dot
            keys: ["survival"],
            name: "生存服务器"
        },
        lobby: {
            statusEl: document.getElementById("lobby-live-status"),
            dotEl: document.querySelector("#server-status-list > div:last-child .status-dot"), // More robust selector needed if survival isn't last before lobby or if lobby isn't last overall. Let's give lobby dot an ID.
            keys: ["lobby"],
            name: "大厅服务器"
        }
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
        totalRunningTime: undefined
    };

    // Variables for real-time uptime tracking on status page
    let initialRunningTimeSeconds_status = null;
    let initialTotalRunningTimeSeconds_status = null;
    let lastUptimeUpdateTimestamp_status = null;
    let uptimeIntervalId_status = null;

    const statusPageUptimeEl = document.getElementById('status-page-uptime');
    const statusPageTotalUptimeEl = document.getElementById('status-page-total-uptime');

    // Sets the initial display text of server statuses and uptime fields to a loading state.
    function setInitialLoadingStatusOnStatusPage() {
        Object.values(serverStatusListConfig).forEach(s => {
            if (s.statusEl) s.statusEl.textContent = '正在获取...';
            if (s.dotEl) s.dotEl.className = 'status-dot maintenance';
        });
        if (statusPageUptimeEl) statusPageUptimeEl.textContent = '获取中...';
        if (statusPageTotalUptimeEl) statusPageTotalUptimeEl.textContent = '获取中...';

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

        let onlineCount = 0;
        let isEffectivelyOnline = false; // True if any underlying physical server is reported as isOnline=true
        let allKeysPresent = true; // True if all expected keys for this server group are in currentServerData

        if (serverKey === 'minigames_aggregate' || serverKey === 'bedwars_sub_aggregate') {
            console.log(`[DEBUG ${serverKey}] updateServerDisplay called. Initial currentServerData.servers:`, JSON.parse(JSON.stringify(currentServerData.servers)));
        }

        if (!currentServerData.servers || Object.keys(currentServerData.servers).length === 0) {
            if (ws?.readyState !== WebSocket.OPEN) { // Still connecting or disconnected
                serverInfo.statusEl.textContent = '获取中...';
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = 'status-dot maintenance';
                }
            }
            if (serverKey === 'minigames_aggregate' || serverKey === 'bedwars_sub_aggregate') {
                console.log(`[DEBUG ${serverKey}] No server data or WS not open. Status: ${serverInfo.statusEl.textContent}`);
            }
            return;
        }

        serverInfo.keys.forEach(subKey => {
            if (currentServerData.servers[subKey]) {
                if (currentServerData.servers[subKey].isOnline) {
                    isEffectivelyOnline = true; // The server type is considered online if at least one sub-server is online
                    onlineCount += currentServerData.servers[subKey].online;
                }
            } else {
                allKeysPresent = false;
            }
        });

        if (serverKey === 'minigames_aggregate' || serverKey === 'bedwars_sub_aggregate') {
            console.log(`[DEBUG ${serverKey}] Calculated: onlineCount=${onlineCount}, isEffectivelyOnline=${isEffectivelyOnline}, allKeysPresent=${allKeysPresent}`);
            serverInfo.keys.forEach(subKey => {
                if(currentServerData.servers[subKey]) {
                    console.log(`[DEBUG ${serverKey}] SubKey ${subKey}: online=${currentServerData.servers[subKey].online}, isOnline=${currentServerData.servers[subKey].isOnline}`);
                } else {
                    console.log(`[DEBUG ${serverKey}] SubKey ${subKey}: NOT FOUND in currentServerData.servers`);
                }
            });
        }

        if (!allKeysPresent && serverInfo.keys.length > 0) {
            serverInfo.statusEl.textContent = "部分状态未知";
            serverInfo.statusEl.className = "font-mono text-yellow-400";
            if (serverInfo.dotEl) {
                serverInfo.dotEl.className = "status-dot maintenance";
            }
        } else if (isEffectivelyOnline) {
            serverInfo.statusEl.textContent = `${onlineCount} 在线`;
            serverInfo.statusEl.className = "font-mono text-green-400";
            if (serverInfo.dotEl) {
                serverInfo.dotEl.className = "status-dot online";
            }
        } else { // Not effectively online (either all sub-servers are isOnline=false or keys are present but all offline)
            let allKeysOffline = true;
            if (serverInfo.keys.length > 0) {
                allKeysOffline = serverInfo.keys.every(subKey =>
                    currentServerData.servers[subKey] && currentServerData.servers[subKey].isOnline === false
                );
            }

            if(allKeysPresent && allKeysOffline && onlineCount === 0){ // Also check onlineCount to be sure
                serverInfo.statusEl.textContent = "离线";
                serverInfo.statusEl.className = "font-mono text-red-400";
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = "status-dot offline";
                }
            } else if (!allKeysPresent && Object.keys(currentServerData.servers).length > 0) {
                serverInfo.statusEl.textContent = "状态未知"; // Some keys missing, but some data exists
                serverInfo.statusEl.className = "font-mono text-yellow-400";
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = "status-dot maintenance";
                }
            } else { // Default to offline if no specific condition met but not effectively online, or if keys are present but all counts are zero
                serverInfo.statusEl.textContent = "离线"; // `${onlineCount} 在线` might be more accurate if onlineCount > 0 but isEffectivelyOnline is false due to isOnline flags
                if (onlineCount > 0 && allKeysPresent) { // If counts are there but all marked offline, this is confusing.
                    serverInfo.statusEl.textContent = `${onlineCount} 在线 (但服务器标记为离线)`;
                    serverInfo.statusEl.className = "font-mono text-yellow-400";
                } else {
                    serverInfo.statusEl.textContent = "离线";
                    serverInfo.statusEl.className = "font-mono text-red-400";
                }
                if (serverInfo.dotEl) {
                    serverInfo.dotEl.className = "status-dot offline";
                }
            }
        }
        if (serverKey === 'minigames_aggregate' || serverKey === 'bedwars_sub_aggregate') {
            console.log(`[DEBUG ${serverKey}] Final status text: ${serverInfo.statusEl.textContent}`);
        }
    }

    // Updates the '运行时间' and '总运行时长' display elements on the status page.
    // Formats seconds into days/hours/minutes or years/days as appropriate.
    // Accepts current running time and total running time in seconds.
    function updateStatusPageUptimeDisplays(currentRunningTime, currentTotalRunningTime) {
        // Logic for "运行时间" (status-page-uptime)
        if (currentRunningTime !== undefined && currentRunningTime !== null && statusPageUptimeEl) {
            let seconds = currentRunningTime;
            if (typeof seconds === 'string') {
                const parsedSeconds = parseInt(seconds, 10);
                seconds = isNaN(parsedSeconds) ? 0 : parsedSeconds;
            }
            if (typeof seconds !== 'number') seconds = 0;
            if (seconds < 0) seconds = 0;

            const days = Math.floor(seconds / (3600 * 24));
            const hours = Math.floor((seconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            let formattedTime;
            if (days >= 100) formattedTime = `${days}天`;
            else if (days >= 1) formattedTime = `${days}天 ${hours}时`;
            else if (hours > 0) formattedTime = `${hours}时 ${minutes}分`;
            else if (seconds > 0 && seconds < 60) formattedTime = "<1分";
            else formattedTime = `${minutes}分`;
            statusPageUptimeEl.textContent = formattedTime;
        } else if (statusPageUptimeEl) {
            statusPageUptimeEl.textContent = '获取中...';
        }

        // Logic for "总运行时长" (status-page-total-uptime)
        if (currentTotalRunningTime !== undefined && currentTotalRunningTime !== null && statusPageTotalUptimeEl) {
            let totalSeconds = currentTotalRunningTime;
            if (typeof totalSeconds === 'string') {
                const parsedSeconds = parseInt(totalSeconds, 10);
                totalSeconds = isNaN(parsedSeconds) ? 0 : parsedSeconds;
            }
            if (typeof totalSeconds !== 'number') totalSeconds = 0;
            if (totalSeconds < 0) totalSeconds = 0;

            let formattedTotalTime;
            const secondsInYear = 365 * 24 * 3600;
            const secondsInDay = 24 * 3600;
            if (totalSeconds >= secondsInYear) {
                const years = Math.floor(totalSeconds / secondsInYear);
                const remainingSecondsAfterYears = totalSeconds % secondsInYear;
                const days = Math.floor(remainingSecondsAfterYears / secondsInDay);
                formattedTotalTime = `${years}年 ${days}日`;
            } else {
                const days = Math.floor(totalSeconds / secondsInDay);
                const hours = Math.floor((totalSeconds % secondsInDay) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                if (days >= 100) formattedTotalTime = `${days}天`;
                else if (days >= 1) formattedTotalTime = `${days}天 ${hours}时`;
                else if (hours > 0) formattedTotalTime = `${hours}时 ${minutes}分`;
                else if (totalSeconds > 0 && totalSeconds < 60) formattedTotalTime = "<1分";
                else formattedTotalTime = `${minutes}分`;
            }
            statusPageTotalUptimeEl.textContent = formattedTotalTime;
        } else if (statusPageTotalUptimeEl) {
            statusPageTotalUptimeEl.textContent = '获取中...';
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
    function connectWebSocket() {
        ws = new WebSocket(WS_URL);
        console.log('Attempting to connect to Voidix Status WebSocket...');
        setInitialLoadingStatusOnStatusPage();

        ws.onopen = () => {
            console.log('Voidix Status WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WS Message (status.html):', data);

                if (data.type === 'full') {
                    currentServerData.servers = data.servers || {};
                    currentServerData.players = data.players || { currentPlayers: {} };
                    currentServerData.runningTime = data.runningTime;
                    currentServerData.totalRunningTime = data.totalRunningTime;
                } else if (data.type === 'players_update_add') {
                    if (data.player && data.player.username) {
                        if (!currentServerData.players.currentPlayers) currentServerData.players.currentPlayers = {};
                        currentServerData.players.currentPlayers[data.player.username] = {
                            uuid: data.player.uuid,
                            currentServer: 'unknown' // Will be updated by a subsequent server_update
                        };
                        console.log('Player added to currentPlayers (status.html):', data.player.username);
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
                            console.log('Player removed by UUID (status.html):', playerUsernameToRemove, data.player.uuid);
                        } else {
                            console.warn('Player to remove (by UUID) not found in local cache (status.html):', data.player.uuid);
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
                console.error('Error processing WebSocket message (status.html):', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Status Error (status.html):', error);
            setDisconnectedStatusOnStatusPage();
        };

        ws.onclose = (event) => {
            console.log(`Voidix Status WebSocket disconnected (status.html). Code: ${event.code}, Reason: ${event.reason}. Attempting to reconnect in 5 seconds...`);
            setDisconnectedStatusOnStatusPage();
            setTimeout(connectWebSocket, 5000);
        };
    }

    // Sets all server status displays and uptime fields to a 'disconnected' state.
    // Clears existing server data.
    function setDisconnectedStatusOnStatusPage() {
        Object.values(serverStatusListConfig).forEach(s => {
            if (s.statusEl) {
                s.statusEl.textContent = '连接已断开';
                s.statusEl.className = 'font-mono text-red-400';
            }
            if (s.dotEl) s.dotEl.className = 'status-dot offline';
        });
        if (statusPageUptimeEl) statusPageUptimeEl.textContent = '未知';
        if (statusPageTotalUptimeEl) statusPageTotalUptimeEl.textContent = '未知';

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

    connectWebSocket();

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
                    console.log('Skipping tooltip hover events for accordion trigger:', serverKey);
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
                console.warn('Could not find hover target for serverKey:', serverKey, serverInfo.dotEl);
            }
        });
    }
    setupTooltipEvents();

});