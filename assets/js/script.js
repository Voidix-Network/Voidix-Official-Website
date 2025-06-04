/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// General script for navbar, framer motion, tabs, accordions, and smooth scrolling.

/**
 * 简单的全局状态管理，用于跟踪动画库加载状态
 */
window.VoidixApp = window.VoidixApp || {
  isFramerMotionLoaded: false,
  pendingAnimations: [],
  
  // 标记Framer Motion已加载
  setFramerMotionLoaded: function() {
    this.isFramerMotionLoaded = true;
    this.processPendingAnimations();
  },
  
  // 添加一个等待执行的动画元素和配置
  addPendingAnimation: function(element, config) {
    this.pendingAnimations.push({element, config});
    
    // 如果动画库已加载，立即处理
    if (this.isFramerMotionLoaded) {
      this.processPendingAnimations();
    }
  },
  
  // 处理所有等待的动画
  processPendingAnimations: function() {
    if (!this.isFramerMotionLoaded || !window.motion) return;
    
    const { animate, inView, set } = window.motion;
    
    // 处理所有待处理的动画
    while (this.pendingAnimations.length > 0) {
      const { element, config } = this.pendingAnimations.shift();
      try {
        const { initialProps, animateProps, transitionProps, whileInViewProps, viewportProps } = config;
        
        if (initialProps) {
          set(element, initialProps);
        }
        
        if (whileInViewProps) {
          inView(
            element,
            () => { animate(element, whileInViewProps, transitionProps); },
            viewportProps
          );
        } else if (animateProps) {
          animate(element, animateProps, transitionProps);
        }
      } catch (e) {
        console.error('Error applying animation to element:', element, e);
      }
    }
  }
};

/**
 * 当Framer Motion脚本加载完成时执行此函数
 */
window.onFramerMotionLoaded = function() {
  console.log('Framer Motion库已成功加载');
  window.VoidixApp.setFramerMotionLoaded();
};

/**
 * 初始化动画元素，即使Framer Motion尚未加载也可以安全调用
 */
const initializeFramerMotion = () => {
  const motionElements = document.querySelectorAll('.motion-element');
  
  motionElements.forEach(el => {
    try {
      // 解析动画配置
      const config = {
        initialProps: el.dataset.initial ? JSON.parse(el.dataset.initial) : null,
        animateProps: el.dataset.animate ? JSON.parse(el.dataset.animate) : null,
        transitionProps: el.dataset.transition ? JSON.parse(el.dataset.transition) : {},
        whileInViewProps: el.dataset.whileinview ? JSON.parse(el.dataset.whileinview) : null,
        viewportProps: el.dataset.viewport ? JSON.parse(el.dataset.viewport) : { once: true }
      };
      
      // 添加到待处理队列
      window.VoidixApp.addPendingAnimation(el, config);
    } catch (e) {
      console.error('Error parsing animation attributes for element:', el, e);
    }
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
