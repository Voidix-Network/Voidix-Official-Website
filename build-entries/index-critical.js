// Index页面关键CSS入口文件（首屏必需样式）
// 只包含首屏渲染所需的最小样式集

// 导入最基础的重置和变量
import '../assets/css/base/reset.css';
import '../assets/css/base/variables.css';

// 导入基础布局和字体（首屏必需）
import '../assets/css/base/typography.css';

// 导入关键组件样式（导航、基础按钮等）
import '../assets/css/components/buttons.css';
import '../assets/css/components/text.css';

// 导入SEO相关样式（可能影响首屏）
import '../assets/css/utilities/seo.css';

console.log('Index页面关键样式已加载');
