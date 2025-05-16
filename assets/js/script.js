/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// General script for navbar, framer motion etc.

const initializeFramerMotion = () => {
  if (typeof window.motion === 'undefined') {
    console.warn('Framer Motion global (window.motion) not found when expected. Animations might not work. Ensure Framer Motion script loads before this script.');
    return; // Exit if Framer Motion is not available
  }
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
};

const setupTabs = () => {
  document.querySelectorAll('.tab-btn[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabButtonsContainer = btn.parentElement;
      const mainContainer = tabButtonsContainer.parentElement;
      const contentContainer = mainContainer.querySelector('.p-8'); // Adjust selector if structure varies
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

const setupSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100, // Adjust for navbar
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

// This function seems to be for placeholder/mock status updates.
// It should eventually be removed if WebSocket provides all status data reliably.
const updateServerStatusPlaceholder = () => {
  const serverElements = [
    { id: 'minigame-status-badge', baseText: ' 在线' },
    { id: 'survival-status-badge', baseText: ' 在线' },
    { id: 'lobby-status-badge', baseText: ' 在线' }
  ];
  serverElements.forEach(server => {
    const element = document.getElementById(server.id);
    if (element && element.textContent.includes('获取中')) { // Only update if still in loading state
      // For placeholder, just set a random number
      element.textContent = Math.floor(Math.random() * 30) + server.baseText;
    }
  });
  const onlinePlayersEl = document.getElementById('online-players-count');
  if (onlinePlayersEl && onlinePlayersEl.textContent.includes('获取中')) {
    onlinePlayersEl.textContent = Math.floor(Math.random() * 50) + '人';
  }
  const uptimeEl = document.getElementById('uptime-days');
  if (uptimeEl && uptimeEl.textContent.includes('获取中')) {
    uptimeEl.textContent = Math.floor(Math.random() * 10) + '天';
  }
  const gamemodeEl = document.getElementById('gamemode-count');
  if (gamemodeEl && gamemodeEl.textContent.includes('获取中')) {
    gamemodeEl.textContent = Math.floor(Math.random() * 3) + '个';
  }
};


const initializePageSpecificScripts = () => {
  // Auto-scroll to hash if present and init accordions for hash targets
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

  // Initialize accordions that should be open by default
  document.querySelectorAll('.accordion-btn.active').forEach(btn => {
    const content = btn.nextElementSibling;
    if (content && content.classList.contains('accordion-content')) {
      content.style.maxHeight = content.scrollHeight + 'px';
      const icon = btn.querySelector('svg');
      if (icon) icon.classList.add('rotate-180');
    }
  });
  // Ensure accordions not marked active are closed
  document.querySelectorAll('.accordion-btn:not(.active)').forEach(btn => {
    const content = btn.nextElementSibling;
    if (content && content.classList.contains('accordion-content')) {
      content.style.maxHeight = null;
      const icon = btn.querySelector('svg');
      if (icon) icon.classList.remove('rotate-180');
    }
  });
};


// Main execution logic
const runScripts = () => {
  initializeFramerMotion(); // Initialize animations
  setupTabs();              // Set up tab functionality
  setupAccordions();        // Set up accordion functionality
  setupSmoothScroll();      // Set up smooth scrolling for anchor links

  // The updateServerStatusPlaceholder and its interval were likely for mock data.
  // Since index-page.js now handles real data via WebSocket, these might conflict or be redundant.
  // If index.html elements (like 'minigame-status-badge') are solely updated by index-page.js,
  // this placeholder logic can be removed. For now, it's renamed and its interval is removed.
  // updateServerStatusPlaceholder(); // Call once if needed for initial placeholder fill before WS connect
  // setInterval(updateServerStatusPlaceholder, 30000); // This interval should likely be removed

  initializePageSpecificScripts(); // Handles hash scrolling and default accordion states
};

// Ensures scripts run after DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runScripts);
} else {
  // DOMContentLoaded has already fired
  runScripts();
}
