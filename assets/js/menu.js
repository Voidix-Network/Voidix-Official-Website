/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// assets/js/menu.js

/**
 * Handles interactive elements for the site navigation menu,
 * including the mobile hamburger menu toggle and smooth scrolling for anchor links.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Hamburger Menu Logic
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenuItems = document.getElementById('mobile-menu-items');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    let line1, line2, line3; // Lines of the hamburger icon for animation

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

    // Smooth Scroll for Anchor Links & Mobile Menu Closure
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const hrefAttribute = this.getAttribute('href');
            // Ensure it's a valid anchor link (not just "#" or empty)
            if (hrefAttribute && hrefAttribute.length > 1) {
                const targetId = hrefAttribute.substring(1); // Remove #
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Close mobile menu if it's open after clicking an anchor link
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