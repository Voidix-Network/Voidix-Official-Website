/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// assets/js/sharedConfig.js
// Defines a global configuration object for shared keys, names, settings, and utility functions.

window.VOIDIX_SHARED_CONFIG = {
    // Existing shared items
    minigameKeys: ["bedwars", "bedwars_solo", "bedwars_other", "knockioffa"],
    /**
     * Display names for servers and server aggregates, used in the UI.
     * Currently contains Chinese (Simplified) strings.
     */
    serverDisplayNames: {
        minigames_aggregate: "小游戏服务器 (总览)",
        bedwars_sub_aggregate: "起床战争 (总览)",
        bedwars: "起床大厅 (bedwars)",
        bedwars_solo: "起床战争 (单人)",
        bedwars_other: "起床战争 (其他)",
        survival: "生存服务器",
        lobby: "小游戏大厅",
        knockioffa: "击退战场 (knockioffa)"
    },

    // New shared items:
    websocket: {
        url: 'wss://server.voidix.top:10203',
        // maxReconnectAttempts and reconnectIntervalSequence control the WebSocket reconnection strategy.
        maxReconnectAttempts: 3, // 降低重试次数，减少控制台错误
        // Sequence of retry intervals in milliseconds. The length should ideally match maxReconnectAttempts.
        // Example: 10s, 30s, 60s
        reconnectIntervalSequence: [10000, 30000, 60000],
        // 添加禁用标志，如果需要完全禁用WebSocket连接
        disabled: false // 设置为 true 可以禁用WebSocket连接
    },

    timeConstants: {
        SECONDS_IN_MINUTE: 60,
        SECONDS_IN_HOUR: 3600,
        SECONDS_IN_DAY: 24 * 3600,
        SECONDS_IN_YEAR: 365 * 24 * 3600, // Simplified year, does not account for leap years.
    },

    /**
     * Standardized status texts for UI display.
     * Currently contains Chinese (Simplified) strings and some HTML entities where appropriate.
     */
    statusTexts: {
        loading: '获取中...',
        online: '在线', // General online status; count might be prepended by consuming code.
        offline: '离线',
        disconnected: '连接已断开',
        unknown: '状态未知',
        partialUnknown: '部分状态未知', // Used on status-page.html for aggregated server statuses.
        lessThanAMinute: '<1分', // Used for durations less than one minute.
        errorConnecting: '连接错误', // Generic connection error text.
        maintenance: '维护中',
        maintenanceStartTimePrefix: '维护开始于: ',
        connectionFailedPermanently: '连接失败，请检查网络或稍后重试。',
        reconnecting: '重连中...', // Indicates that a WebSocket reconnection attempt is in progress.
        playerDataLoading: '玩家数据加载中...',
        noPlayersOnline: '该服务器当前没有玩家在线。',
        unknownTime: '未知时间',
        invalidTimestamp: '无效的时间戳',
        timeFormatError: '时间格式错误'
    },

    statusClasses: {
        // Base classes for status dots on the index page (applied to all server status dots)
        indexPage: {
            dotBase: 'w-4 h-4 flex-shrink-0 rounded-full',
            colorGreen: 'bg-green-500',
            colorYellow: 'bg-yellow-500',
            colorRed: 'bg-red-500',
            animatePulse: 'animate-pulse' // Added for pulsing animation
        },
        // Base classes for status dots on the status page (more generic)
        statusPage: {
            dotOnline: 'w-3 h-3 rounded-full bg-green-500 flex-shrink-0 mr-2', // Green dot for online servers
            dotOffline: 'w-3 h-3 rounded-full bg-red-500 flex-shrink-0 mr-2',   // Red dot for offline servers
            dotMaintenance: 'w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0 mr-2' // Yellow dot for maintenance/unknown
        },
        // Text color classes
        textGreen: 'text-green-400',
        textYellow: 'text-yellow-400', 
        textRed: 'text-red-400',
        // Renamed mono versions to avoid conflict
        textMonoGreen: 'font-mono text-green-400',
        textMonoRed: 'font-mono text-red-400',
        textMonoYellow: 'font-mono text-yellow-400'
    },

    /**
     * Formats a duration in seconds into a human-readable string.
     * @param {number|string|null|undefined} totalSeconds The total duration in seconds.
     * @param {string} [type='default'] Type of formatting: 'default' for HH:MM or D H, 'totalUptime' for Y D.
     * @returns {string} Formatted duration string or loading/error text.
     */
    formatDuration: function(totalSeconds, type = 'default') {
        const shared = window.VOIDIX_SHARED_CONFIG; // Alias for easier access to other shared props

        if (totalSeconds === undefined || totalSeconds === null) return shared.statusTexts.loading;

        let numericSeconds = parseFloat(totalSeconds); // Allow string input
        if (isNaN(numericSeconds) || numericSeconds < 0) {
            numericSeconds = 0; // Default to 0 if input is invalid or negative.
        }

        const days = Math.floor(numericSeconds / shared.timeConstants.SECONDS_IN_DAY);
        const hours = Math.floor((numericSeconds % shared.timeConstants.SECONDS_IN_DAY) / shared.timeConstants.SECONDS_IN_HOUR);
        const minutes = Math.floor((numericSeconds % shared.timeConstants.SECONDS_IN_HOUR) / shared.timeConstants.SECONDS_IN_MINUTE);

        if (type === 'totalUptime') { // Formatting for "Total Running Time" (e.g., on index page)
            if (numericSeconds >= shared.timeConstants.SECONDS_IN_YEAR) {
                const years = Math.floor(numericSeconds / shared.timeConstants.SECONDS_IN_YEAR);
                const remainingSecondsAfterYears = numericSeconds % shared.timeConstants.SECONDS_IN_YEAR;
                const daysInYearContext = Math.floor(remainingSecondsAfterYears / shared.timeConstants.SECONDS_IN_DAY);
                return `${years}年 ${daysInYearContext}天`; // e.g., "1年 120天"
            }
            // Fallback for totalUptime if less than a year
            if (days > 0) return `${days}天 ${hours}时`;       // e.g., "10天 5时"
            if (hours > 0) return `${hours}时 ${minutes}分`;   // e.g., "5时 30分"
            // If less than an hour but more than a minute, or exactly 0 and was initially 0.
            if (numericSeconds > 0 && numericSeconds < shared.timeConstants.SECONDS_IN_MINUTE) return shared.statusTexts.lessThanAMinute; // e.g., "<1分"
            return `${minutes}分`; // e.g., "30分" or "0分" if less than a minute (and not 0 initially and caught by lessThanAMinute)
        }

        // Default formatting (typically for individual server uptimes on status page)
        if (days >= 100) return `${days}天`; // If very long, just show days, e.g., "120天"
        if (days > 0) return `${days}天 ${hours}时`;   // e.g., "10天 5时"
        if (hours > 0) return `${hours}时 ${minutes}分`; // e.g., "5时 30分"
        if (numericSeconds > 0 && numericSeconds < shared.timeConstants.SECONDS_IN_MINUTE) return shared.statusTexts.lessThanAMinute; // e.g., "<1分"
        if (numericSeconds === 0 && (totalSeconds === 0 || totalSeconds === "0")) return '0分'; // Explicitly show "0分" for 0 seconds duration.
        return `${minutes}分`; // e.g., "30分"
    }
};