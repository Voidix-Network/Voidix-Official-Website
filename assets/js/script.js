/*
  This code is licensed under the GNU Affero General Public License, version 3.
  To view a copy of this license, see https://www.gnu.org/licenses/agpl-3.0.html
  or the LICENSE_CODE file.
*/
// General script for navbar, animations, tabs, accordions, and smooth scrolling.

/**
 * 初始化简单的动画系统，替代 Framer Motion
 * 使用 CSS 过渡和 Intersection Observer API
 */
const initializeAnimations = () => {
  // 添加 CSS 动画样式
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .motion-element {
      transition: all 0.5s ease-out;
    }
    
    .motion-element[data-animate] {
      opacity: 0;
      transform: translateY(20px);
    }
    
    .motion-element.animated {
      opacity: 1 !important;
      transform: translate(0, 0) !important;
    }
  `;
  document.head.appendChild(styleSheet);

  // 创建 Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        try {
          // 解析动画属性
          const initialProps = element.dataset.initial ? JSON.parse(element.dataset.initial) : {};
          const animateProps = element.dataset.animate ? JSON.parse(element.dataset.animate) : {};
          const transitionProps = element.dataset.transition ? JSON.parse(element.dataset.transition) : {};
          const viewportProps = element.dataset.viewport ? JSON.parse(element.dataset.viewport) : { once: true };
          const whileInViewProps = element.dataset.whileinview ? JSON.parse(element.dataset.whileinview) : null;
          
          // 应用初始样式
          if (initialProps.opacity !== undefined) {
            element.style.opacity = initialProps.opacity;
          }
          if (initialProps.y !== undefined) {
            element.style.transform = `translateY(${initialProps.y}px)`;
          }
          if (initialProps.x !== undefined) {
            element.style.transform = `translateX(${initialProps.x}px)`;
          }
          
          // 应用过渡时间
          if (transitionProps.duration) {
            element.style.transitionDuration = `${transitionProps.duration}s`;
          }
          if (transitionProps.delay) {
            element.style.transitionDelay = `${transitionProps.delay}s`;
          }
          
          // 选择要应用的目标属性（优先使用 whileInViewProps）
          const targetProps = whileInViewProps || animateProps;
          
          // 延迟应用动画到的样式
          setTimeout(() => {
            element.classList.add('animated');
            
            if (targetProps.opacity !== undefined) {
              element.style.opacity = targetProps.opacity;
            }
            if (targetProps.y !== undefined) {
              element.style.transform = `translateY(${targetProps.y}px)`;
            }
            if (targetProps.x !== undefined) {
              element.style.transform = `translateX(${targetProps.x}px)`;
            }
          }, (transitionProps.delay || 0) * 1000);
          
          // 如果设置了 once: true，观察一次后就停止观察
          if (viewportProps.once) {
            observer.unobserve(element);
          }
          
        } catch (e) {
          console.error('Error parsing animation attributes for element:', element, e);
          // 简单地添加 animated 类作为后备
          element.classList.add('animated');
        }
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // 观察所有动画元素
  const motionElements = document.querySelectorAll('.motion-element');
  motionElements.forEach(el => {
    observer.observe(el);
  });
  
  console.log(`Initialized animations for ${motionElements.length} elements`);
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
 * Handles page-specific initializations and WebSocket logic...
 * (Remaining code unchanged)
 */