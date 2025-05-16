/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// assets/js/menu.js
document.addEventListener('DOMContentLoaded', () => {
    // Hamburger Menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenuItems = document.getElementById('mobile-menu-items');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    let line1, line2, line3;
    
    if (hamburgerIcon) {
        line1 = hamburgerIcon.querySelector('.line1');
        line2 = hamburgerIcon.querySelector('.line2');
        line3 = hamburgerIcon.querySelector('.line3');
    }

    if (mobileMenuButton && mobileMenuItems && line1 && line2 && line3) {
        mobileMenuButton.addEventListener('click', () => {
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);

            if (!isExpanded) {
                mobileMenuItems.classList.remove('max-h-0', 'opacity-0');
                mobileMenuItems.classList.add('max-h-96');
                line1.classList.add('translate-y-[6px]', 'rotate-45');
                line2.classList.add('opacity-0');
                line3.classList.add('translate-y-[-6px]', '-rotate-45');
            } else {
                mobileMenuItems.classList.add('max-h-0', 'opacity-0');
                mobileMenuItems.classList.remove('max-h-96');
                line1.classList.remove('translate-y-[6px]', 'rotate-45');
                line2.classList.remove('opacity-0');
                line3.classList.remove('translate-y-[-6px]', '-rotate-45');
            }
        });
    }

    // 平滑滚动锚点链接
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const hrefAttribute = this.getAttribute('href');
            if (hrefAttribute && hrefAttribute.length > 1) {
                const targetId = hrefAttribute.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // 点击链接后关闭移动菜单
                    if (mobileMenuItems && !mobileMenuItems.classList.contains('max-h-0')) {
                        mobileMenuItems.classList.add('max-h-0', 'opacity-0');
                        mobileMenuItems.classList.remove('max-h-96');
                        mobileMenuButton.setAttribute('aria-expanded', 'false');
                        
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
});