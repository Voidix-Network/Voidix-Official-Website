/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// General script for navbar, framer motion, tabs, accordions, and smooth scrolling.

/**
 * Initializes Framer Motion animations for elements with .motion-element class.
 * It reads animation properties from data attributes (data-initial, data-animate, etc.).
 * Ensures Framer Motion (window.motion) is loaded before attempting to use it.
 */
const initializeFramerMotion = () => {
  // 等待Framer Motion加载完成
  const waitForFramerMotion = (callback, maxAttempts = 10, interval = 200) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      if (typeof window.motion !== 'undefined') {
        callback();
      } else if (attempts < maxAttempts) {
        console.log(`Waiting for Framer Motion to load (attempt ${attempts}/${maxAttempts})...`);
        setTimeout(check, interval);
      } else {
        console.warn('Framer Motion global (window.motion) not found after multiple attempts. Animations might not work.');
      }
    };
    check();
  };

  waitForFramerMotion(() => {
    const { animate: fmAnimate, inView: fmInView, set: fmSet } = window.motion;

    const motionElements = document.querySelectorAll('.motion-element');
    motionElements.forEach(el => {
      try {
        const initialProps = el.dataset.initial ? JSON.parse(el.dataset.initial) : null;
        const animateProps = el.dataset.animate ? JSON.parse(el.dataset.animate) : null;
        const transitionProps = el.dataset.transition
            ? JSON.parse(el.dataset.transition)
            : {};
        const whileInViewProps = el.dataset.whileinview
            ? JSON.parse(el.dataset.whileinview)
            : null;
        const viewportProps = el.dataset.viewport
            ? JSON.parse(el.dataset.viewport)
            : { once: true };

        if (initialProps) {
          fmSet(el, initialProps);
        }

        if (whileInViewProps) {
          fmInView(
              el,
              () => { fmAnimate(el, whileInViewProps, transitionProps); },
              viewportProps
          );
        } else if (animateProps) {
          fmAnimate(el, animateProps, transitionProps);
        }
      } catch (e) {
        console.error('Error parsing Framer Motion attributes for element:', el, e);
      }
    });
  });
};

/**
 * Sets up tab functionality for elements with .tab-btn class and data-tab-target attribute.
 * Handles switching active tabs and displaying corresponding content.
 */
const setupTabs = () => {
  document.querySelectorAll('.tab-btn[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabButtonsContainer = btn.parentElement;
      const mainContainer = tabButtonsContainer.parentElement;
      const contentContainer = mainContainer.querySelector('.p-8');
      const targetContentId = btn.dataset.tabTarget;

      if (!tabButtonsContainer || !contentContainer) {
        console.error('Tab structure not found for button:', btn);
        return;
      }

      tabButtonsContainer.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'border-indigo-400', 'text-white');
        b.classList.add('text-gray-400');
      });
      btn.classList.add('active', 'border-indigo-400', 'text-white');
      btn.classList.remove('text-gray-400');

      contentContainer.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden');
      });
      const targetContentElement = contentContainer.querySelector('#' + targetContentId);
      if (targetContentElement) {
        targetContentElement.classList.add('active');
        targetContentElement.classList.remove('hidden');
      }
    });
  });
};

/**
 * Sets up accordion functionality for elements with .accordion-btn class.
 * Toggles visibility of the next sibling element (the content) and rotates an icon.
 */
const setupAccordions = () => {
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('svg');
      btn.classList.toggle('active');
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        if (icon) icon.classList.remove('rotate-180');
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        if (icon) icon.classList.add('rotate-180');
      }
    });
  });
};

/**
 * Sets up smooth scrolling for anchor links (a[href^="#"]).
 * Scrolls to the target element with an offset for fixed navigation bars.
 * Updates URL hash if browser supports history.pushState.
 */
const setupSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
        if (history.pushState) {
          history.pushState(null, null, targetId);
        } else {
          location.hash = targetId;
        }
      }
    });
  });
};

/**
 * Handles page-specific initializations, currently:
 * 1. Auto-scrolls to a section if its ID is in the URL hash.
 * 2. If the target of a hash is within an accordion, it attempts to open that accordion.
 * 3. Initializes accordions 상태 that should be open or closed by default based on '.active' class.
 */
const initializePageSpecificScripts = () => {
  const hash = window.location.hash;
  if (hash && hash !== '#') {
    const targetElement = document.querySelector(hash);
    if (targetElement) {
      setTimeout(() => {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
        const accordionContent = targetElement.closest('.accordion-content');
        if (accordionContent && !accordionContent.style.maxHeight) {
          const accordionButton = accordionContent.previousElementSibling;
          if (accordionButton && accordionButton.classList.contains('accordion-btn')) {
            accordionButton.click();
          }
        }
      }, 100);
    }
  }

  document.querySelectorAll('.accordion-btn.active').forEach(btn => {
    const content = btn.nextElementSibling;
    if (content && content.classList.contains('accordion-content')) {
      content.style.maxHeight = content.scrollHeight + 'px';
      const icon = btn.querySelector('svg');
      if (icon) icon.classList.add('rotate-180');
    }
  });
  document.querySelectorAll('.accordion-btn:not(.active)').forEach(btn => {
    const content = btn.nextElementSibling;
    if (content && content.classList.contains('accordion-content')) {
      content.style.maxHeight = null;
      const icon = btn.querySelector('svg');
      if (icon) icon.classList.remove('rotate-180');
    }
  });
};

/**
 * Main function to orchestrate the initialization of various UI scripts.
 */
const runScripts = () => {
  initializeFramerMotion();
  setupTabs();
  setupAccordions();
  setupSmoothScroll();
  initializePageSpecificScripts();
};

// Ensures scripts run after DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runScripts);
} else {
  // DOMContentLoaded has already fired
  runScripts();
}
