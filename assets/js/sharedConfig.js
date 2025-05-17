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
    serverDisplayNames: {
        minigames_aggregate: "小游戏服务器 (总览)",
        bedwars_sub_aggregate: "起床战争 (总览)",
        bedwars: "起床大厅 (bedwars)",
        bedwars_solo: "起床战争 (单人)",
        bedwars_other: "起床战争 (其他)",
        survival: "生存服务器",
        lobby: "小游戏大厅",
        knockioffa: "Knockioffa"
    },

    // New shared items:
    websocket: {
        url: 'wss://server.voidix.top:10203',
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
    },

    timeConstants: {
        SECONDS_IN_MINUTE: 60,
        SECONDS_IN_HOUR: 3600,
        SECONDS_IN_DAY: 24 * 3600,
        SECONDS_IN_YEAR: 365 * 24 * 3600, // Simplified year, no leap years accounted for
    },

    statusTexts: {
        loading: '获取中...',
        online: '在线', // General online status, count might be prepended by consuming code
        offline: '离线',
        disconnected: '连接已断开',
        unknown: '状态未知',
        partialUnknown: '部分状态未知', // Used in status-page for aggregates
        lessThanAMinute: '<1分', // HTML entity for <
        errorConnecting: '连接错误' // Generic connection error
    },

    statusClasses: {
        // For status.html specific styling
        statusPage: {
            dotOnline: 'status-dot online',
            dotOffline: 'status-dot offline',
            dotMaintenance: 'status-dot maintenance' // Typically for loading/unknown as well
        },
        // For index.html specific styling (Tailwind based)
        indexPage: {
            dotBase: 'w-3 h-3 rounded-full',
            colorGreen: 'bg-green-400',
            colorRed: 'bg-red-400',
            colorYellow: 'bg-yellow-400', // For loading/maintenance/unknown
            animatePulse: 'animate-pulse' // Often combined with yellow
        },
        // Common text styling classes (Tailwind based)
        textGreen: 'font-mono text-green-400',
        textRed: 'font-mono text-red-400',
        textYellow: 'font-mono text-yellow-400'
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
            numericSeconds = 0; // Default to 0 if invalid or negative
        }

        const days = Math.floor(numericSeconds / shared.timeConstants.SECONDS_IN_DAY);
        const hours = Math.floor((numericSeconds % shared.timeConstants.SECONDS_IN_DAY) / shared.timeConstants.SECONDS_IN_HOUR);
        const minutes = Math.floor((numericSeconds % shared.timeConstants.SECONDS_IN_HOUR) / shared.timeConstants.SECONDS_IN_MINUTE);

        if (type === 'totalUptime') { // For "总运行时长" on index page
            if (numericSeconds >= shared.timeConstants.SECONDS_IN_YEAR) {
                const years = Math.floor(numericSeconds / shared.timeConstants.SECONDS_IN_YEAR);
                const remainingSecondsAfterYears = numericSeconds % shared.timeConstants.SECONDS_IN_YEAR;
                const daysInYearContext = Math.floor(remainingSecondsAfterYears / shared.timeConstants.SECONDS_IN_DAY);
                return `${years}年 ${daysInYearContext}天`;
            }
            // Fallback for totalUptime if less than a year
            if (days > 0) return `${days}天 ${hours}时`;
            if (hours > 0) return `${hours}时 ${minutes}分`;
            if (numericSeconds > 0 && numericSeconds < shared.timeConstants.SECONDS_IN_MINUTE) return shared.statusTexts.lessThanAMinute;
            return `${minutes}分`; // Should rarely hit this for totalUptime unless very short
        }

        // Default formatting (for individual server uptimes)
        if (days >= 100) return `${days}天`; // Just days if very long
        if (days > 0) return `${days}天 ${hours}时`;
        if (hours > 0) return `${hours}时 ${minutes}分`;
        if (numericSeconds > 0 && numericSeconds < shared.timeConstants.SECONDS_IN_MINUTE) return shared.statusTexts.lessThanAMinute;
        if (numericSeconds === 0 && (totalSeconds === 0 || totalSeconds === "0")) return '0分'; // Explicitly show 0分 for 0 seconds
        return `${minutes}分`;
    }
};