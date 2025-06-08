/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// assets/js/error-handler.js

// 全局 JavaScript 错误处理
window.addEventListener('error', function(event) {
  console.error('JavaScript Error:', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  });
  // 发送错误报告到服务器（可选）
  // fetch('/api/log-error', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     message: event.message,
  //     source: event.filename,
  //     line: event.lineno,
  //     url: window.location.href,
  //     userAgent: navigator.userAgent
  //   })
  // });
});
// 捕获 Promise 拒绝
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled Promise Rejection:', event.reason);
});