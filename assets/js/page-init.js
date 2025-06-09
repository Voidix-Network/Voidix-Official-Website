/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// assets/js/page-init.js

// 等待页面加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 初始化 AOS 动画库
  if (typeof AOS !== 'undefined') {
    AOS.init();
  }
});