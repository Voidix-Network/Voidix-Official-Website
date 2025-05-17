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
    let currentReconnectAttempts = 0;
    let forceShowMaintenance = false; // Flag to give maintenance_status_update precedence
    let connectionTimeoutTimer = null; // Timer for connection timeout

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
        gamemodeCount: "3", // 默认游戏模式数量
        isMaintenance: false,
        maintenanceStartTime: null
    };

    // Variables for real-time uptime tracking
    let initialRunningTimeSeconds = null;
    let initialTotalRunningTimeSeconds = null;
    let lastUptimeUpdateTimestamp = null;
    let uptimeIntervalId = null;

    // Sets the initial display text of various status elements to a 'loading' state.
    function setInitialLoadingStatus() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        if (serverData.isMaintenance) {
            displayMaintenanceStatusOnIndex();
            // If in maintenance, other loading states might not be relevant for player count.
            // Server badges and uptime could still show loading or their actual status if desired.
        } else {
            if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.loading;
            if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.loading;
        }

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
        console.log('[DEBUG] updateTotalOnlinePlayers CALLED. serverData.isMaintenance:', serverData.isMaintenance); 
        if (serverData.isMaintenance) {
            console.log('[DEBUG] updateTotalOnlinePlayers: In maintenance, calling displayMaintenanceStatusOnIndex.'); 
            displayMaintenanceStatusOnIndex();
            return;
        }
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        if (onlinePlayersCountEl.desktop) {
            onlinePlayersCountEl.desktop.className = 'text-base font-bold text-center'; 
            onlinePlayersCountEl.desktop.textContent = `${serverData.players.online || '0'}人`;
        }
        if (onlinePlayersCountEl.mobile) {
            onlinePlayersCountEl.mobile.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap'; 
            onlinePlayersCountEl.mobile.textContent = `${serverData.players.online || '0'}人`;
        }
        console.log('[DEBUG] updateTotalOnlinePlayers: Updated player count display.'); 
    }

    // Function to display maintenance status on index page
    function displayMaintenanceStatusOnIndex() {
        console.log('[DEBUG] displayMaintenanceStatusOnIndex START. serverData.isMaintenance:', serverData.isMaintenance, 'forceShowMaintenance:', forceShowMaintenance); 
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        
        if (onlinePlayersCountEl.desktop) {
            onlinePlayersCountEl.desktop.className = 'text-base font-bold text-center '; 
            onlinePlayersCountEl.desktop.classList.add(SHARED_CONFIG.statusClasses.textYellow);
            onlinePlayersCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.maintenance;
        }
        if (onlinePlayersCountEl.mobile) {
            onlinePlayersCountEl.mobile.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap ';
            onlinePlayersCountEl.mobile.classList.add(SHARED_CONFIG.statusClasses.textYellow);
            onlinePlayersCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.maintenance;
        }
        
        Object.values(statusElementsSimplified).forEach((server, index) => { 
            const serverName = Object.keys(statusElementsSimplified)[index]; 
            if (server.badge) {
                server.badge.textContent = SHARED_CONFIG.statusTexts.maintenance;
            }
            if (server.dot) {
                server.dot.className = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${SHARED_CONFIG.statusClasses.indexPage.colorYellow}`;
            }
        });

        const elementsToYellowAndDash = [
            uptimeDaysEl.desktop, uptimeDaysEl.mobile,
            gamemodeCountEl.desktop, gamemodeCountEl.mobile
        ];

        elementsToYellowAndDash.forEach(el => {
            if (el) {
                el.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap ';
                el.classList.add(SHARED_CONFIG.statusClasses.textYellow);
                el.textContent = '-';
            }
        });
        
        clearInterval(uptimeIntervalId);
        console.log('[DEBUG] Cleared uptimeIntervalId & set maintenance UI elements.'); 
        console.log('[DEBUG] displayMaintenanceStatusOnIndex END.'); 
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
        console.log('[DEBUG] updateServerStatusBadges CALLED. serverData.isMaintenance:', serverData.isMaintenance, 'forceShowMaintenance:', forceShowMaintenance); 
        if (serverData.isMaintenance) {
            console.log('[DEBUG] updateServerStatusBadges: In maintenance, calling displayMaintenanceStatusOnIndex and returning.'); 
            displayMaintenanceStatusOnIndex(); 
            return;
        }
        if (!serverData.servers) {
            console.log('[DEBUG] updateServerStatusBadges: No serverData.servers, returning.'); 
            return;
        }
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;

        console.log('[DEBUG] updateServerStatusBadges: Proceeding with normal status update.'); 
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
        console.log('[DEBUG] updateServerStatusBadges: Updated server statuses.'); // DEBUG
    }

    // Updates the 'runningTime' and 'totalRunningTime' display elements.
    // Accepts current running time and total running time in seconds.
    function updateUptimeDisplay(currentRunningTime, currentTotalRunningTime) {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG; 
        // console.log('[DEBUG] updateUptimeDisplay CALLED. currentRunningTime:', currentRunningTime, 'currentTotalRunningTime:', currentTotalRunningTime);

        if (uptimeDaysEl.desktop) {
            uptimeDaysEl.desktop.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap'; // Reset to base
            uptimeDaysEl.desktop.innerHTML = SHARED_CONFIG.formatDuration(currentRunningTime, 'default'); 
        }
        if (uptimeDaysEl.mobile) {
            uptimeDaysEl.mobile.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap'; // Reset to base
            uptimeDaysEl.mobile.innerHTML = SHARED_CONFIG.formatDuration(currentRunningTime, 'default'); 
        }

        if (gamemodeCountEl.desktop) {
            gamemodeCountEl.desktop.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap'; // Reset to base
            gamemodeCountEl.desktop.innerHTML = SHARED_CONFIG.formatDuration(currentTotalRunningTime, 'totalUptime'); 
        }
        if (gamemodeCountEl.mobile) {
            gamemodeCountEl.mobile.className = 'text-base font-bold flex justify-center items-center whitespace-nowrap'; // Reset to base
            gamemodeCountEl.mobile.innerHTML = SHARED_CONFIG.formatDuration(currentTotalRunningTime, 'totalUptime'); 
        }
        console.log('[DEBUG] updateUptimeDisplay: Updated uptime elements.'); // DEBUG
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
        // Clear any existing timeout timer before attempting a new connection
        if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);

        ws = new WebSocket(window.VOIDIX_SHARED_CONFIG.websocket.url);
        console.log('[DEBUG] Attempting to connect to Voidix WebSocket...');
        // setInitialLoadingStatus(); // Called by onclose/onerror or explicit UI update needed before connect

        // Start a 5-second timeout for the connection attempt
        connectionTimeoutTimer = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                console.log('[DEBUG] WebSocket connection attempt timed out after 5 seconds. Closing and retrying.');
                ws.close(); // This will trigger onclose, which handles reconnection logic
            }
        }, 5000); // 5 seconds timeout

        ws.onopen = () => {
            clearTimeout(connectionTimeoutTimer); // Connection successful, clear the timeout
            console.log('[DEBUG] Voidix WebSocket connected (onopen)');
            currentReconnectAttempts = 0; 
        };

        ws.onmessage = (event) => {
            try {
                const messageData = JSON.parse(event.data);
                console.log('[DEBUG] WS MSG (index): টাইপ:', messageData.type, 'isMaint:', messageData.isMaintenance, 'status:', messageData.status, 'Payload:', JSON.stringify(messageData));

                if (messageData.type === 'full') {
                    console.log('[DEBUG] Processing "full". serverData.isMaint:', serverData.isMaintenance, 'forceShowMaint:', forceShowMaintenance);
                    let isMaintenanceFromFull = messageData.isMaintenance;
                    let maintenanceStartTimeFromFull = messageData.maintenanceStartTime;

                    // Update non-maintenance related data first
                    if (messageData.servers) {
                        serverData.servers = messageData.servers;
                    }
                    if (messageData.players) {
                        serverData.players.online = messageData.players.online;
                    }
                    if (messageData.runningTime !== undefined) {
                        serverData.runningTime = messageData.runningTime;
                    }
                    if (messageData.totalRunningTime !== undefined) {
                        serverData.totalRunningTime = messageData.totalRunningTime;
                    }
                    if (messageData.gamemodeCount !== undefined) { 
                        serverData.gamemodeCount = messageData.gamemodeCount;
                    }

                    if (forceShowMaintenance) {
                        serverData.isMaintenance = true;
                        console.log('[DEBUG] "full": forceShowMaint TRUE. Calling displayMaintStatus.');
                        displayMaintenanceStatusOnIndex(); 
                    } else {
                        serverData.isMaintenance = (typeof isMaintenanceFromFull === 'boolean') ? isMaintenanceFromFull : false;
                        serverData.maintenanceStartTime = maintenanceStartTimeFromFull || null;
                        console.log('[DEBUG] "full": forceShowMaint FALSE. serverData.isMaint set to:', serverData.isMaintenance);
                        
                        if (serverData.isMaintenance) {
                            console.log('[DEBUG] "full": serverData.isMaint TRUE. Calling displayMaintStatus.');
                            displayMaintenanceStatusOnIndex();
                        } else {
                            console.log('[DEBUG] "full": serverData.isMaint FALSE. Updating normal UI.');
                            updateTotalOnlinePlayers();
                            updateServerStatusBadges();
                            startRealtimeUptimeUpdates();
                        }
                    }
                    console.log('[DEBUG] "full" message processing END.'); // DEBUG
                } else if (messageData.type === 'maintenance_status_update') {
                    const isEnteringMaintenance = (messageData.status === true || messageData.status === 'true');
                    console.log('[DEBUG] Processing "maint_update". raw status:', messageData.status, 'isEnteringMaint:', isEnteringMaintenance);
                    serverData.maintenanceStartTime = messageData.maintenanceStartTime || null;

                    if (isEnteringMaintenance) {
                        forceShowMaintenance = true;
                        serverData.isMaintenance = true;
                        console.log('[DEBUG] "maint_update" (true): Set forceShowMaint=T, serverData.isMaint=T. Calling displayMaintStatus.');
                        displayMaintenanceStatusOnIndex();
                    } else { 
                        forceShowMaintenance = false;
                        serverData.isMaintenance = false;
                        console.log('[DEBUG] "maint_update" (false): Set forceShowMaint=F, serverData.isMaint=F. Updating normal UI.');
                        updateTotalOnlinePlayers(); 
                        updateServerStatusBadges(); 
                        startRealtimeUptimeUpdates(); 
                    }
                    console.log('[DEBUG] "maintenance_status_update" processing END.'); // DEBUG
                } else if (messageData.type === 'players_update_add' || messageData.type === 'players_update_remove') {
                    console.log('[DEBUG] Processing "player_update". serverData.isMaint:', serverData.isMaintenance);
                    if (!serverData.isMaintenance && messageData.totalOnlinePlayers !== undefined) {
                        serverData.players.online = messageData.totalOnlinePlayers.toString();
                        updateTotalOnlinePlayers();
                    } else {
                        // console.log('[DEBUG] "player_update": In maint or no totalOnlinePlayers. No UI update for player count.');
                    }
                    console.log('[DEBUG] "players_update_add/remove" processing END.'); // DEBUG
                } else if (messageData.type === 'server_update') {
                    console.log('[DEBUG] Processing "server_update". serverData.isMaint BEFORE:', serverData.isMaintenance);
                    if (messageData.servers) {
                         for (const serverName in messageData.servers) {
                            const newOnlineCount = messageData.servers[serverName]; // This is the direct count.
                            if (serverData.servers[serverName]) {
                                // Server exists, update its online count.
                                // The 'isOnline' status comes from the 'full' message and is not changed by 'server_update'.
                                serverData.servers[serverName].online = newOnlineCount;
                            } else {
                                // Server does not exist in our local cache (e.g., 'login', 'anticheat_test').
                                // Initialize it.
                                serverData.servers[serverName] = {
                                    online: newOnlineCount,
                                    isOnline: true // Default for a newly appearing server in this message type.
                                };
                                console.log(`[DEBUG] "server_update": Server ${serverName} was not in serverData.servers. Initialized with count ${newOnlineCount}.`);
                            }
                        }
                    }
                    if (!serverData.isMaintenance) {
                        console.log('[DEBUG] "server_update": NOT in maint. Calling updateServerStatusBadges.');
                        updateServerStatusBadges();
                    } else {
                        console.log('[DEBUG] "server_update": IN maint. Manually setting dots to yellow.');
                        Object.values(statusElementsSimplified).forEach(server => {
                            if (server.dot) {
                                server.dot.className = `${window.VOIDIX_SHARED_CONFIG.statusClasses.indexPage.dotBase} ${window.VOIDIX_SHARED_CONFIG.statusClasses.indexPage.colorYellow}`;
                            }
                        });
                    }
                    console.log('[DEBUG] "server_update" processing END.'); // DEBUG
                }

            } catch (error) {
                console.error('[DEBUG] Error processing WS message (index.html):', error, 'Raw event data:', event.data);
            }
        };

        ws.onerror = (error) => {
            clearTimeout(connectionTimeoutTimer); // Clear timeout on error
            console.error('[DEBUG] WebSocket Error (index.html):', error);
            // setDisconnectedStatus(); // onclose will usually follow
        };

        ws.onclose = (event) => {
            clearTimeout(connectionTimeoutTimer); // Clear timeout on close
            console.log(`[DEBUG] Voidix WebSocket disconnected (index.html). Code: ${event.code}, Reason: ${event.reason}.`);
            // setDisconnectedStatus(); // Removed: UI will be handled by reconnecting or permanent error status

            const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
            const maxAttempts = SHARED_CONFIG.websocket.maxReconnectAttempts;
            const intervalSequence = SHARED_CONFIG.websocket.reconnectIntervalSequence || [5000]; // Fallback to 5s if sequence not defined

            if (currentReconnectAttempts < maxAttempts) {
                // Get the next interval from the sequence.
                // If currentReconnectAttempts (0-indexed) is beyond the sequence, use the last interval.
                setIndexReconnectingStatus(); // Show "Reconnecting..." UI
                const nextInterval = intervalSequence[currentReconnectAttempts] !== undefined 
                                   ? intervalSequence[currentReconnectAttempts] 
                                   : intervalSequence[intervalSequence.length - 1];
                
                currentReconnectAttempts++; // Increment for the next attempt's log and sequence index
                console.log(`[DEBUG] Attempting reconnect ${currentReconnectAttempts}/${maxAttempts} in ${nextInterval / 1000} seconds... (Index page)`);
                setTimeout(connectWebSocket, nextInterval);
            } else {
                console.log(`[DEBUG] Max reconnect attempts (${maxAttempts}) reached. Stopping reconnection for index page.`);
                setPermanentConnectionErrorStatus();
            }
        };
    }

    // Sets UI elements on the index page to a "Reconnecting..." state.
    function setIndexReconnectingStatus() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        const reconnectingText = SHARED_CONFIG.statusTexts.reconnecting || '重连中...';
        const yellowTextClass = SHARED_CONFIG.statusClasses.textYellow;
        const yellowDotBaseClass = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${SHARED_CONFIG.statusClasses.indexPage.colorYellow} ${SHARED_CONFIG.statusClasses.indexPage.animatePulse}`;

        if (serverData.isMaintenance) {
            // If in maintenance, keep maintenance UI but maybe add a reconnecting hint?
            // For now, displayMaintenanceStatusOnIndex already handles the visual styling for maintenance.
            // We can append to specific elements if needed, but let's keep it simple.
            displayMaintenanceStatusOnIndex(); 
            // Potentially update a specific small indicator or log, but avoid cluttering maintenance UI.
            if (onlinePlayersCountEl.desktop && onlinePlayersCountEl.desktop.textContent === SHARED_CONFIG.statusTexts.maintenance) {
                 if(!onlinePlayersCountEl.desktop.textContent.includes(reconnectingText)){
                    onlinePlayersCountEl.desktop.textContent += ` (${reconnectingText.substring(0,2)})`; // 小提示
                 }
            }
             if (onlinePlayersCountEl.mobile && onlinePlayersCountEl.mobile.textContent === SHARED_CONFIG.statusTexts.maintenance) {
                 if(!onlinePlayersCountEl.mobile.textContent.includes(reconnectingText)){
                    onlinePlayersCountEl.mobile.textContent += ` (${reconnectingText.substring(0,2)})`;
                 }
            }
            return; // Keep maintenance UI dominant
        }

        if (onlinePlayersCountEl.desktop) {
            onlinePlayersCountEl.desktop.textContent = reconnectingText;
            onlinePlayersCountEl.desktop.className = `text-base font-bold text-center ${yellowTextClass}`;
        }
        if (onlinePlayersCountEl.mobile) {
            onlinePlayersCountEl.mobile.textContent = reconnectingText;
            onlinePlayersCountEl.mobile.className = `text-base font-bold flex justify-center items-center whitespace-nowrap ${yellowTextClass}`;
        }

        Object.values(statusElementsSimplified).forEach(server => {
            if (server.badge) {
                server.badge.textContent = reconnectingText;
                // server.badge.className = ...; // Assuming text color is handled by parent or yellowTextClass if needed
            }
            if (server.dot) {
                server.dot.className = yellowDotBaseClass;
            }
        });

        const uptimeElements = [uptimeDaysEl.desktop, uptimeDaysEl.mobile, gamemodeCountEl.desktop, gamemodeCountEl.mobile];
        uptimeElements.forEach(el => {
            if (el) {
                el.textContent = reconnectingText;
                el.className = `text-base font-bold flex justify-center items-center whitespace-nowrap ${yellowTextClass}`;
            }
        });

        clearInterval(uptimeIntervalId);
        initialRunningTimeSeconds = null;
        initialTotalRunningTimeSeconds = null;
        lastUptimeUpdateTimestamp = null;
        // Do NOT reset serverData here, to allow quick recovery if reconnect succeeds.
    }

    // Sets all dynamic status elements on the index page to a 'disconnected' state and resets local data.
    function setDisconnectedStatus() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;

        if (serverData.isMaintenance) {
            displayMaintenanceStatusOnIndex();
            // If already in maintenance, disconnected status might be secondary for player count.
        } else {
            if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = SHARED_CONFIG.statusTexts.disconnected;
            if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = SHARED_CONFIG.statusTexts.disconnected;
        }

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

        // Reset server data to avoid showing stale info
        serverData = {
            servers: {},
            players: { online: "0", currentPlayers: {} },
            runningTime: undefined,
            totalRunningTime: undefined,
            gamemodeCount: "3", // Reset to original default "3"
            isMaintenance: false,
            maintenanceStartTime: null
        };
    }

    // Function to set UI to a permanent connection error state
    function setPermanentConnectionErrorStatus() {
        const SHARED_CONFIG = window.VOIDIX_SHARED_CONFIG;
        const errorText = SHARED_CONFIG.statusTexts.connectionFailedPermanently;

        if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = errorText;
        if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = errorText;
        // Set class to textRed for player count error message if defined in sharedConfig, or default style
        if (onlinePlayersCountEl.desktop && SHARED_CONFIG.statusClasses.textRed) onlinePlayersCountEl.desktop.className = SHARED_CONFIG.statusClasses.textRed;
        if (onlinePlayersCountEl.mobile && SHARED_CONFIG.statusClasses.textRed) onlinePlayersCountEl.mobile.className = SHARED_CONFIG.statusClasses.textRed;


        Object.values(statusElementsSimplified).forEach(server => {
            if (server.badge) server.badge.textContent = errorText;
            // Set badge text color to red if desired, similar to player count
            // if (server.badge && SHARED_CONFIG.statusClasses.textRed) server.badge.className = SHARED_CONFIG.statusClasses.textRed;
            if (server.dot) server.dot.className = `${SHARED_CONFIG.statusClasses.indexPage.dotBase} ${SHARED_CONFIG.statusClasses.indexPage.colorRed}`;
        });

        if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = errorText;
        if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = errorText;
        // if (uptimeDaysEl.desktop && SHARED_CONFIG.statusClasses.textRed) uptimeDaysEl.desktop.className = SHARED_CONFIG.statusClasses.textRed;
        // if (uptimeDaysEl.mobile && SHARED_CONFIG.statusClasses.textRed) uptimeDaysEl.mobile.className = SHARED_CONFIG.statusClasses.textRed;

        if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = errorText;
        if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = errorText;
        // if (gamemodeCountEl.desktop && SHARED_CONFIG.statusClasses.textRed) gamemodeCountEl.desktop.className = SHARED_CONFIG.statusClasses.textRed;
        // if (gamemodeCountEl.mobile && SHARED_CONFIG.statusClasses.textRed) gamemodeCountEl.mobile.className = SHARED_CONFIG.statusClasses.textRed;

        clearInterval(uptimeIntervalId); // Ensure uptime interval is cleared
        initialRunningTimeSeconds = null;
        initialTotalRunningTimeSeconds = null;
        lastUptimeUpdateTimestamp = null;
    }

    connectWebSocket();
});