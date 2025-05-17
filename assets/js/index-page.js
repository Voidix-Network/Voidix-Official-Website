/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// Please copy the JavaScript code from index.html (lines approx. 835-1353) into this file.
document.addEventListener('DOMContentLoaded', () => {
    // Tabs (Java/Bedrock Connection)
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const activeTabUnderline = document.getElementById('active-tab-underline');
    const contentSlider = document.getElementById('content-slider');
    const tabContentWrapper = contentSlider ? contentSlider.parentElement : null; // Parent for height animation

    function updateTabUnderlineAndStyles(activeButton) {
        if (!activeTabUnderline || !activeButton) return;
        activeTabUnderline.style.width = activeButton.offsetWidth + 'px';
        activeTabUnderline.style.left = activeButton.offsetLeft + 'px';

        tabButtons.forEach(btn => {
            if (btn === activeButton) {
                btn.classList.add('active', 'text-white');
                btn.classList.remove('text-gray-400');
            } else {
                btn.classList.remove('active', 'text-white');
                btn.classList.add('text-gray-400');
            }
        });
    }

    function switchTabContent(activeIndex) {
        if (!contentSlider || !tabContentWrapper || !tabContents[activeIndex]) return;

        // Update height of the wrapper to the new content's scrollHeight
        tabContentWrapper.style.maxHeight = tabContents[activeIndex].scrollHeight + 'px';

        // Slide the content horizontally
        const translateXValue = -activeIndex * 100;
        contentSlider.style.transform = `translateX(${translateXValue}%)`;
    }

    if (tabButtons.length > 0 && contentSlider && activeTabUnderline && tabContentWrapper && tabContents.length > 0) {
        let initialActiveIndex = 0;
        tabButtons.forEach((btn, index) => {
            if (btn.classList.contains('active')) {
                initialActiveIndex = index;
            }
        });

        // Set initial height of the wrapper (for the active tab) WITHOUT animation
        if (tabContents[initialActiveIndex]) {
            tabContentWrapper.style.maxHeight = tabContents[initialActiveIndex].scrollHeight + 'px';
        }

        // Apply transition for future height changes AFTER initial height is set
        // Use a timeout to ensure initial height is applied before transition starts for max-height
        setTimeout(() => {
            if (tabContentWrapper) {
                tabContentWrapper.style.transition = 'max-height 0.3s ease-in-out';
            }
        }, 0);


        // Update underline for the initially active tab
        updateTabUnderlineAndStyles(tabButtons[initialActiveIndex]);

        // Set initial horizontal scroll position for the content slider
        const initialTranslateXValue = -initialActiveIndex * 100;
        contentSlider.style.transform = `translateX(${initialTranslateXValue}%)`;

        // Add click listeners to tab buttons
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetIndex = parseInt(button.dataset.tabIndex);

                updateTabUnderlineAndStyles(button);
                switchTabContent(targetIndex);
            });
        });
    }

    // Player Accordion (玩家公约)
    const playerAccordionButton = document.querySelector('.accordion-btn');
    if (playerAccordionButton) {
        const accordionContent = playerAccordionButton.nextElementSibling;
        const accordionIcon = playerAccordionButton.querySelector('svg');

        if (accordionContent && accordionIcon) {
            accordionContent.style.overflow = 'hidden';
            accordionContent.style.transition = 'max-height 0.3s ease-out';

            // Accordion starts OPEN by default
            let isPlayerAccordionOpen = true;
            accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px'; // Set to scrollHeight to be open
            accordionIcon.classList.add('rotate-180'); // Icon points up for open state

            playerAccordionButton.addEventListener('click', () => {
                if (isPlayerAccordionOpen) {
                    accordionContent.style.maxHeight = '0px';
                    accordionIcon.classList.remove('rotate-180');
                } else {
                    accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
                    accordionIcon.classList.add('rotate-180');
                }
                isPlayerAccordionOpen = !isPlayerAccordionOpen;
            });
        }
    }

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            // Ensure it's not just a lone # or an empty # (which might be used for other JS triggers)
            if (hrefAttribute && hrefAttribute.length > 1) {
                const targetId = hrefAttribute.substring(1); // Remove #
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault(); // Prevent default anchor jump
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start' // Aligns the top of the target element to the top of the visible area of the scrollable ancestor
                    });

                    // Optional: If using a fixed header and want to close mobile menu on navigation
                    const mobileMenuItems = document.getElementById('mobile-menu-items');
                    const mobileMenuButton = document.getElementById('mobile-menu-button');
                    if (mobileMenuItems && !mobileMenuItems.classList.contains('max-h-0')) { // If mobile menu is open
                        const hamburgerIcon = document.getElementById('hamburger-icon');
                        const line1 = hamburgerIcon ? hamburgerIcon.querySelector('.line1') : null;
                        const line2 = hamburgerIcon ? hamburgerIcon.querySelector('.line2') : null;
                        const line3 = hamburgerIcon ? hamburgerIcon.querySelector('.line3') : null;

                        mobileMenuItems.classList.add('max-h-0', 'opacity-0');
                        mobileMenuItems.classList.remove('max-h-96');
                        if (mobileMenuButton) mobileMenuButton.setAttribute('aria-expanded', 'false');

                        if (line1 && line2 && line3) {
                            line1.classList.remove('translate-y-[6px]', 'rotate-45');
                            line2.classList.remove('opacity-0');
                            line3.classList.remove('translate-y-[-6px]', '-rotate-45');
                        }
                    }
                }
            }
        });
    });

    // WebSocket logic for Voidix Server Status

    let ws;

    // Object mapping server types to their corresponding HTML badge and status dot elements on the index page.
    const statusElementsSimplified = {
        minigame: {
            badge: document.getElementById('minigame-status-badge-desktop'), // Badge for minigame server status
            dot: document.getElementById('minigame-status-dot-desktop')      // Status dot for minigame server
        },
        survival: {
            badge: document.getElementById('survival-status-badge-desktop'), // Badge for survival server status
            dot: document.getElementById('survival-status-dot-desktop')      // Status dot for survival server
        },
        lobby: {
            badge: document.getElementById('lobby-status-badge-desktop'),    // Badge for lobby server status
            dot: document.getElementById('lobby-status-dot-desktop')       // Status dot for lobby server
        }
    };

    // HTML elements for displaying total online players count (desktop and mobile versions).
    const onlinePlayersCountEl = {
        desktop: document.getElementById('online-players-count-desktop'),
        mobile: document.getElementById('online-players-count-mobile')
    };

    // HTML elements for displaying server running time (desktop and mobile versions).
    const uptimeDaysEl = {
        desktop: document.getElementById('uptime-days-desktop'),
        mobile: document.getElementById('uptime-days-mobile')
    };

    // HTML elements for displaying total server running time (desktop and mobile versions).
    // Note: IDs 'gamemode-count-desktop/mobile' are legacy, now used for totalRunningTime.
    const gamemodeCountEl = {
        desktop: document.getElementById('gamemode-count-desktop'),
        mobile: document.getElementById('gamemode-count-mobile')
    };

    let serverData = {
        servers: {},
        players: { online: "0", currentPlayers: {} },
        runningTime: undefined, // Added for running time
        totalRunningTime: undefined, // Updated for total running time
        gamemodeCount: "3" // 默认游戏模式数量
    };

    // Variables for real-time uptime tracking
    let initialRunningTimeSeconds = null;
    let initialTotalRunningTimeSeconds = null;
    let lastUptimeUpdateTimestamp = null;
    let uptimeIntervalId = null;

    // Sets the initial display text of various status elements to a 'loading' state.
    function setInitialLoadingStatus() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.loading;
        if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.loading;

        Object.values(statusElementsSimplified).forEach(server => {
            if (server.badge) server.badge.textContent = SHARED_CONFIG.statusTexts.loading;
            if (server.dot) server.dot.className = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${SHARED_CONFIG.statusClasses.indexPage.colorYellow} ${SHARED_CONFIG.statusClasses.indexPage.animatePulse}`;
        });

        if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = SHARED_CONFIG.statusTexts.loading;
        if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = SHARED_CONFIG.statusTexts.loading;

        if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.loading;
        if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.loading;

        // Clear any existing uptime interval and reset tracking variables
        clearInterval(uptimeIntervalId);
        initialRunningTimeSeconds = null;
        initialTotalRunningTimeSeconds = null;
        lastUptimeUpdateTimestamp = null;
    }

    setInitialLoadingStatus();

    // Updates the total online players count on the page (desktop and mobile).
    function updateTotalOnlinePlayers() {
        if (onlinePlayersCountEl.desktop) {
            onlinePlayersCountEl.desktop.textContent = `${serverData.players.online || '0'}人`;
        }
        if (onlinePlayersCountEl.mobile) {
            onlinePlayersCountEl.mobile.textContent = `${serverData.players.online || '0'}人`;
        }
    }

    // Updates the 'gamemode count' elements. Note: These elements now display totalRunningTime.
    // This function remains for historical reasons but doesn't update gamemode count anymore.
    function updateGamemodeCount() {
        // These lines are no longer needed as these elements now display total uptime
        // if (gamemodeCountEl.desktop) {
        //     gamemodeCountEl.desktop.textContent = `${serverData.gamemodeCount || '3'}个`;
        // }
        // if (gamemodeCountEl.mobile) {
        //     gamemodeCountEl.mobile.textContent = `${serverData.gamemodeCount || '3'}个`;
        // }
    }

    // Updates the status badges and dots for individual server types (minigame, survival, lobby) on the index page.
    function updateServerStatusBadges() {
        if (!serverData.servers) return;
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;

        // 使用简化版状态元素更新函数 (已使用共享配置重构)
        const updateStatusDisplay = (serverKey, elements, count, isOnline, isPartial = false) => {
            const statusText = isPartial ? SHARED_CONFIG.statusTexts.partialUnknown : (isOnline ? `${count} ${SHARED_CONFIG.statusTexts.online}` : SHARED_CONFIG.statusTexts.offline);
            const dotColorClass = isPartial ? SHARED_CONFIG.statusClasses.indexPage.colorYellow : (isOnline ? SHARED_CONFIG.statusClasses.indexPage.colorGreen : SHARED_CONFIG.statusClasses.indexPage.colorRed);

            let finalDotClass = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${dotColorClass}`;
            // Add pulse animation if the status is partial, or if the badge is showing "loading"
            if (isPartial || (elements.badge && elements.badge.textContent === SHARED_CONFIG.statusTexts.loading)) {
                finalDotClass += ` ${SHARED_CONFIG.statusClasses.indexPage.animatePulse}`;
            }
            // Note: If a server is online and stable, animatePulse should not be present.
            // The setInitialLoadingStatus function and connectWebSocket's setInitialLoadingStatus call will apply pulse initially.
            // This logic ensures pulse is primarily for loading/partial states.

            if (elements.badge) elements.badge.textContent = statusText;
            if (elements.dot) elements.dot.className = finalDotClass;
        };

        // 小游戏服务器（汇总）
        let minigameOnlineCount = 0;
        let minigameIsEffectivelyOnline = false;
        let allMinigameKeysPresent = SHARED_CONFIG.minigameKeys.every(key => serverData.servers[key] !== undefined);

        SHARED_CONFIG.minigameKeys.forEach(key => {
            if (serverData.servers[key] && serverData.servers[key].isOnline) {
                minigameOnlineCount += serverData.servers[key].online;
                minigameIsEffectivelyOnline = true;
            }
        });

        if (Object.keys(serverData.servers).length === 0 && ws?.readyState !== WebSocket.OPEN) {
            // Fallback if no server data yet and WS is not open (covered by setInitialLoadingStatus mostly)
            Object.values(statusElementsSimplified).forEach(server => {
                if (server.badge) server.badge.textContent = SHARED_CONFIG.statusTexts.loading;
                if (server.dot) server.dot.className = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${SHARED_CONFIG.statusClasses.indexPage.colorYellow} ${SHARED_CONFIG.statusClasses.indexPage.animatePulse}`;
            });
        } else {
            // Update Minigame Aggregate Status
            updateStatusDisplay(
                'minigame',
                statusElementsSimplified.minigame,
                minigameOnlineCount,
                minigameIsEffectivelyOnline,
                !allMinigameKeysPresent && Object.keys(serverData.servers).length > 0 // isPartial if not all keys present but some data exists
            );

            // Update Survival Server Status
            const survivalServer = serverData.servers.survival;
            if (survivalServer) {
                updateStatusDisplay('survival', statusElementsSimplified.survival, survivalServer.online, survivalServer.isOnline);
            } else if (Object.keys(serverData.servers).length > 0 && serverData.servers.survival === undefined) {
                // Data from other servers exists, but 'survival' key is specifically missing.
                updateStatusDisplay('survival', statusElementsSimplified.survival, 0, false, true); // Mark as partial/unknown
            } else if (ws?.readyState === WebSocket.OPEN && !survivalServer) {
                // WS is open, but no data for survival at all, treat as offline for now or loading if initial.
                // This case might be complex, assuming it's covered by initial loading or if server explicitly sends offline.
                // For safety, if no data and WS is open, and not covered by initial loading, assume unknown.
                // updateStatusDisplay('survival', statusElementsSimplified.survival, 0, false, true);
            }


            // Update Lobby Server Status
            const lobbyServer = serverData.servers.lobby;
            if (lobbyServer) {
                updateStatusDisplay('lobby', statusElementsSimplified.lobby, lobbyServer.online, lobbyServer.isOnline);
            } else if (Object.keys(serverData.servers).length > 0 && serverData.servers.lobby === undefined) {
                updateStatusDisplay('lobby', statusElementsSimplified.lobby, 0, false, true); // Mark as partial/unknown
            }
        }
    }

    // Updates the 'runningTime' and 'totalRunningTime' display elements.
    // Accepts current running time and total running time in seconds.
    function updateUptimeDisplay(currentRunningTime, currentTotalRunningTime) {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;

        // Update "运行时间"
        const formattedRunningTime = SHARED_CONFIG.formatDuration(currentRunningTime, 'default');
        if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.innerHTML = formattedRunningTime; // Use innerHTML for <1min
        if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.innerHTML = formattedRunningTime; // Use innerHTML for <1min

        // Update "总运行时长" (displayed in gamemodeCountEl elements)
        const formattedTotalRunningTime = SHARED_CONFIG.formatDuration(currentTotalRunningTime, 'totalUptime');
        if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.innerHTML = formattedTotalRunningTime; // Use innerHTML
        if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.innerHTML = formattedTotalRunningTime; // Use innerHTML
    }

    // Starts or restarts the real-time uptime counter
    function startRealtimeUptimeUpdates() {
        clearInterval(uptimeIntervalId); // Clear existing interval before starting a new one

        if (serverData.runningTime !== undefined && serverData.runningTime !== null) {
            initialRunningTimeSeconds = parseInt(serverData.runningTime, 10) || 0;
        } else {
            initialRunningTimeSeconds = 0;
        }

        if (serverData.totalRunningTime !== undefined && serverData.totalRunningTime !== null) {
            initialTotalRunningTimeSeconds = parseInt(serverData.totalRunningTime, 10) || 0;
        } else {
            initialTotalRunningTimeSeconds = 0;
        }

        lastUptimeUpdateTimestamp = Date.now();

        // Initial display update
        updateUptimeDisplay(initialRunningTimeSeconds, initialTotalRunningTimeSeconds);

        uptimeIntervalId = setInterval(() => {
            if (initialRunningTimeSeconds === null || lastUptimeUpdateTimestamp === null) {
                // This should not happen if startRealtimeUptimeUpdates was called correctly
                // but as a safeguard, stop the interval if data is missing.
                clearInterval(uptimeIntervalId);
                return;
            }

            const elapsedSeconds = Math.floor((Date.now() - lastUptimeUpdateTimestamp) / 1000);
            const currentRunningTime = initialRunningTimeSeconds + elapsedSeconds;
            // totalRunningTime also increases with real-time elapsed seconds from its initial value
            const currentTotalRunningTime = initialTotalRunningTimeSeconds + elapsedSeconds;

            updateUptimeDisplay(currentRunningTime, currentTotalRunningTime);
        }, 1000);
    }

    // Establishes and manages the WebSocket connection for receiving real-time server status updates for the index page.
    function connectWebSocket() {
        ws = new WebSocket(window.VOIDIX_SHARED_CONFIG.websocket.url);
        console.log('Attempting to connect to Voidix WebSocket...');
        setInitialLoadingStatus();


        ws.onopen = () => {
            console.log('Voidix WebSocket connected');
            // Initial state will be pushed by server with 'full' message.
            // If not, elements will remain '获取中...' until first message.
        };

        ws.onmessage = (event) => {
            try {
                const messageData = JSON.parse(event.data);
                console.log('WebSocket message received:', messageData);

                if (messageData.type === 'full' || messageData.type === 'update') {
                    // Update server data (individual servers, players, runningTime, totalRunningTime)
                    // Accessing properties directly from messageData, assuming no nested 'data' object for index.html
                    if (messageData.servers) {
                        serverData.servers = messageData.servers;
                    }
                    if (messageData.players) {
                        serverData.players.online = messageData.players.online;
                        // currentPlayers might be handled by specific player_add/remove messages if needed
                    }
                    if (messageData.runningTime !== undefined) {
                        serverData.runningTime = messageData.runningTime;
                    }
                    if (messageData.totalRunningTime !== undefined) {
                        serverData.totalRunningTime = messageData.totalRunningTime;
                    }
                    if (messageData.gamemodeCount !== undefined) { // Keep gamemodeCount if provided
                        serverData.gamemodeCount = messageData.gamemodeCount;
                    }

                    // Update UI elements
                    updateTotalOnlinePlayers();
                    updateServerStatusBadges();
                    // updateUptimeDisplay(serverData.runningTime, serverData.totalRunningTime); // This direct call is now handled by startRealtimeUptimeUpdates
                    startRealtimeUptimeUpdates(); // Start/Restart the real-time counter with new base values
                    updateGamemodeCount();

                } else if (messageData.type === 'player_join') {
                    if (serverData.players.online !== undefined) {
                        serverData.players.online = parseInt(serverData.players.online, 10) + 1;
                        updateTotalOnlinePlayers();
                    }
                    // Optionally update specific server counts if player join includes server info
                } else if (messageData.type === 'player_leave') {
                    if (serverData.players.online !== undefined && parseInt(serverData.players.online, 10) > 0) {
                        serverData.players.online = parseInt(serverData.players.online, 10) - 1;
                        updateTotalOnlinePlayers();
                    }
                    // Optionally update specific server counts
                }
                // Add more specific message type handlers here if needed

            } catch (error) {
                console.error('Error processing WebSocket message (index.html):', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error (index.html):', error);
            setDisconnectedStatus();
        };

        ws.onclose = (event) => {
            console.log(`Voidix WebSocket disconnected (index.html). Code: ${event.code}, Reason: ${event.reason}. Attempting to reconnect in 5 seconds...`);
            setDisconnectedStatus();
            setTimeout(connectWebSocket, window.VOIDIX_SHARED_CONFIG.websocket.reconnectInterval);
        };
    }

    // Sets all dynamic status elements on the index page to a 'disconnected' state and resets local data.
    function setDisconnectedStatus() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.disconnected;
        if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.disconnected;

        Object.values(statusElementsSimplified).forEach(server => {
            if (server.badge) server.badge.textContent = SHARED_CONFIG.statusTexts.disconnected;
            if (server.dot) server.dot.className = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${SHARED_CONFIG.statusClasses.indexPage.colorRed}`;
        });

        if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = SHARED_CONFIG.statusTexts.disconnected;
        if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = SHARED_CONFIG.statusTexts.disconnected;

        if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.disconnected;
        if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.disconnected;

        // Clear any existing uptime interval and reset tracking variables
        clearInterval(uptimeIntervalId);
        initialRunningTimeSeconds = null;
        initialTotalRunningTimeSeconds = null;
        lastUptimeUpdateTimestamp = null;

        // Reset server data to avoid showing stale info on reconnect attempt
        serverData = {
            servers: {},
            players: { online: "0", currentPlayers: {} },
            runningTime: undefined,
            totalRunningTime: undefined,
            gamemodeCount: "3" // Reset to original default "3"
        };
    }

    connectWebSocket();
});