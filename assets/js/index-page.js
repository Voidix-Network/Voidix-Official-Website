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
    const RECONNECT_INTERVAL = 5000;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const WS_URL = 'wss://server.voidix.top:10203'; // 更新 WebSocket URL

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
        if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = '获取中...';
        if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = '获取中...';

        Object.values(statusElementsSimplified).forEach(server => {
            if (server.badge) server.badge.textContent = '获取中...';
            if (server.dot) server.dot.className = 'w-3 h-3 rounded-full bg-yellow-400 animate-pulse';
        });

        if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = '获取中...';
        if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = '获取中...';

        if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = '获取中...';
        if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = '获取中...';

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

        // 使用简化版状态元素更新函数
        const updateStatusDisplay = (serverKey, elements, count, isOnline, isPartial = false) => {
            const statusText = isPartial ? '部分未知' : (isOnline ? `${count} 在线` : '离线');
            const dotClass = isPartial ? 'bg-yellow-400' : (isOnline ? 'bg-green-400' : 'bg-red-400');

            if (elements.badge) elements.badge.textContent = statusText;
            if (elements.dot) elements.dot.className = `w-3 h-3 rounded-full ${dotClass} animate-pulse`;
        };

        // 小游戏服务器（汇总）
        let minigameOnlineCount = 0;
        let minigameIsEffectivelyOnline = false;
        const minigameKeys = ["bedwars", "bedwars_solo", "bedwars_other"];
        let allMinigameKeysPresent = minigameKeys.every(key => serverData.servers[key] !== undefined);

        minigameKeys.forEach(key => {
            if (serverData.servers[key] && serverData.servers[key].isOnline) {
                minigameOnlineCount += serverData.servers[key].online;
                minigameIsEffectivelyOnline = true;
            }
        });

        if (Object.keys(serverData.servers).length === 0 && ws?.readyState !== WebSocket.OPEN) {
            // 使用简化版状态元素
            Object.values(statusElementsSimplified).forEach(server => {
                if (server.badge) server.badge.textContent = '获取中...';
                if (server.dot) server.dot.className = 'w-3 h-3 rounded-full bg-yellow-400 animate-pulse';
            });
        } else {
            updateStatusDisplay('minigame', statusElementsSimplified.minigame, minigameOnlineCount, minigameIsEffectivelyOnline, !allMinigameKeysPresent && Object.keys(serverData.servers).length > 0);

            // 生存服务器
            const survivalServer = serverData.servers.survival;
            if (survivalServer) {
                updateStatusDisplay('survival', statusElementsSimplified.survival, survivalServer.online, survivalServer.isOnline);
            } else if (Object.keys(serverData.servers).length > 0) {
                updateStatusDisplay('survival', statusElementsSimplified.survival, 0, false, true); // 部分/未知
            }

            // 大厅服务器
            const lobbyServer = serverData.servers.lobby;
            if (lobbyServer) {
                updateStatusDisplay('lobby', statusElementsSimplified.lobby, lobbyServer.online, lobbyServer.isOnline);
            } else if (Object.keys(serverData.servers).length > 0) {
                updateStatusDisplay('lobby', statusElementsSimplified.lobby, 0, false, true); // 部分/未知
            }
        }
    }

    // Updates the 'runningTime' and 'totalRunningTime' display elements.
    // Accepts current running time and total running time in seconds.
    function updateUptimeDisplay(currentRunningTime, currentTotalRunningTime) {
        // Logic for "运行时间" (uptimeDaysEl)
        if (currentRunningTime !== undefined && currentRunningTime !== null) {
            let seconds = currentRunningTime;
            // Ensure seconds is a number, attempt parsing if it's a string.
            if (typeof seconds === 'string') {
                const parsedSeconds = parseInt(seconds, 10);
                seconds = isNaN(parsedSeconds) ? 0 : parsedSeconds; // Default to 0 if parsing fails
            }
            if (typeof seconds !== 'number') { // If still not a number (e.g. was undefined initially and not updated)
                seconds = 0;
            }

            if (seconds < 0) seconds = 0; // Prevent negative display

            const days = Math.floor(seconds / (3600 * 24));
            const hours = Math.floor((seconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            let formattedTime;

            if (days >= 100) formattedTime = `${days}天`;
            else if (days >= 1) formattedTime = `${days}天 ${hours}时`;
            else if (hours > 0) formattedTime = `${hours}时 ${minutes}分`;
            else if (seconds > 0 && seconds < 60) formattedTime = "<1分"; // Consistent with status page
            else formattedTime = `${minutes}分`;

            if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = formattedTime;
            if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = formattedTime;
        } else {
            if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = '获取中...';
            if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = '获取中...';
        }

        // Logic for "总运行时长" (gamemodeCountEl, which is repurposed for totalRunningTime)
        if (currentTotalRunningTime !== undefined && currentTotalRunningTime !== null) {
            let totalSeconds = currentTotalRunningTime;
            // Ensure totalSeconds is a number
            if (typeof totalSeconds === 'string') {
                const parsedSeconds = parseInt(totalSeconds, 10);
                totalSeconds = isNaN(parsedSeconds) ? 0 : parsedSeconds;
            }
            if (typeof totalSeconds !== 'number') {
                totalSeconds = 0;
            }

            if (totalSeconds < 0) totalSeconds = 0;

            let formattedTotalTime;
            const secondsInYear = 365 * 24 * 3600;
            const secondsInDay = 24 * 3600;

            if (totalSeconds >= secondsInYear) {
                const years = Math.floor(totalSeconds / secondsInYear);
                const remainingSecondsAfterYears = totalSeconds % secondsInYear;
                const days = Math.floor(remainingSecondsAfterYears / secondsInDay);
                formattedTotalTime = `${years}年 ${days}日`;
            } else { // Original logic for days, hours, minutes if less than a year
                const days = Math.floor(totalSeconds / secondsInDay);
                const hours = Math.floor((totalSeconds % secondsInDay) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);

                if (days >= 100) formattedTotalTime = `${days}天`;
                else if (days >= 1) formattedTotalTime = `${days}天 ${hours}时`;
                else if (hours > 0) formattedTotalTime = `${hours}时 ${minutes}分`;
                else if (totalSeconds > 0 && totalSeconds < 60) formattedTotalTime = "<1分";
                else formattedTotalTime = `${minutes}分`;
            }

            if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = formattedTotalTime;
            if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = formattedTotalTime;
        } else {
            if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = '获取中...';
            if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = '获取中...';
        }
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
        ws = new WebSocket(WS_URL);
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
            setTimeout(connectWebSocket, 5000);
        };
    }

    // Sets all dynamic status elements on the index page to a 'disconnected' state and resets local data.
    function setDisconnectedStatus() {
        if (onlinePlayersCountEl.desktop) onlinePlayersCountEl.desktop.textContent = '连接已断开';
        if (onlinePlayersCountEl.mobile) onlinePlayersCountEl.mobile.textContent = '连接已断开';

        Object.values(statusElementsSimplified).forEach(server => {
            if (server.badge) server.badge.textContent = '状态未知';
            if (server.dot) server.dot.className = 'w-3 h-3 rounded-full bg-gray-500'; // Disconnected/Unknown color
        });

        if (uptimeDaysEl.desktop) uptimeDaysEl.desktop.textContent = '未知';
        if (uptimeDaysEl.mobile) uptimeDaysEl.mobile.textContent = '未知';

        if (gamemodeCountEl.desktop) gamemodeCountEl.desktop.textContent = '未知';
        if (gamemodeCountEl.mobile) gamemodeCountEl.mobile.textContent = '未知';

        // 重置serverData，这样重新连接尝试时不会显示陈旧数据
        serverData = {
            servers: {},
            players: { online: "0", currentPlayers: {} },
            runningTime: undefined, // 重置运行时间
            gamemodeCount: "3", // 默认游戏模式数量
            totalRunningTime: undefined // 重置总运行时间
        };

        // Clear any existing uptime interval and reset tracking variables
        clearInterval(uptimeIntervalId);
        initialRunningTimeSeconds = null;
        initialTotalRunningTimeSeconds = null;
        lastUptimeUpdateTimestamp = null;
    }

    connectWebSocket();
});