// LeyoAI 翻译常量

export const translations = {
  // 通用
  common: {
    loading: { zh: '加载中...', en: 'Loading...' },
    error: { zh: '发生错误', en: 'An error occurred' },
    success: { zh: '操作成功', en: 'Success' },
    cancel: { zh: '取消', en: 'Cancel' },
    save: { zh: '保存', en: 'Save' },
    delete: { zh: '删除', en: 'Delete' },
    edit: { zh: '编辑', en: 'Edit' },
    back: { zh: '返回', en: 'Back' },
    next: { zh: '下一步', en: 'Next' },
    submit: { zh: '提交', en: 'Submit' },
  },

  // 导航栏
  nav: {
    products: { zh: '产品', en: 'Products' },
    cases: { zh: '案例', en: 'Cases' },
    tutorials: { zh: '教程', en: 'Tutorials' },
    pricing: { zh: '定价', en: 'Pricing' },
    dashboard: { zh: '控制台', en: 'Dashboard' },
    login: { zh: '登录', en: 'Login' },
    signup: { zh: '免费注册', en: 'Sign Up' },
    logout: { zh: '退出登录', en: 'Log Out' },
  },

  // Hero 区域
  hero: {
    title: { zh: 'AI 模型', en: 'AI Models' },
    subtitle: { zh: '即服务平台', en: 'as a Service' },
    description: { zh: '一站式 AI 模型服务平台，提供网络安全、视频安全、流程自动化、数据分析四大垂直领域 AI 助手', en: 'One-stop AI model service platform, providing AI assistants in four vertical domains: Cyber Security, Video Safety, Flow Automation, and Data Analytics' },
    exploreModels: { zh: '探索模型', en: 'Explore Models' },
    viewTutorials: { zh: '查看教程', en: 'View Tutorials' },
  },

  // 产品区域
  products: {
    title: { zh: 'AI 能力矩阵', en: 'AI Capability Matrix' },
    subtitle: { zh: '三大领域，深度垂直，构建专业级 AI 生态', en: 'Three major domains, deeply vertical, building professional AI ecosystem' },
    cyber: {
      name: { zh: 'Cyber Model', en: 'Cyber Model' },
      nameCn: { zh: '网络安全模型', en: 'Cyber Security Model' },
      desc: { zh: '网络安全 AI 助手，帮助识别威胁、分析漏洞、提供安全建议', en: 'Cyber security AI assistant for threat identification, vulnerability analysis, and security recommendations' },
    },
    video: {
      name: { zh: 'Video Model', en: 'Video Model' },
      nameCn: { zh: '视频安全模型', en: 'Video Safety Model' },
      desc: { zh: '视频内容安全检测，识别违规内容、敏感场景、风险行为', en: 'Video content safety detection for prohibited content, sensitive scenes, and risky behaviors' },
    },
    flow: {
      name: { zh: 'Flow Model', en: 'Flow Model' },
      nameCn: { zh: '流程自动化模型', en: 'Flow Automation Model' },
      desc: { zh: '业务流程自动化助手，优化工作流程、提升运营效率', en: 'Business process automation assistant for workflow optimization and operational efficiency' },
    },
    analytics: {
      name: { zh: 'Analytics Model', en: 'Analytics Model' },
      nameCn: { zh: '数据分析模型', en: 'Data Analytics Model' },
      desc: { zh: '数据分析 AI 助手，洞察数据趋势、生成分析报告', en: 'Data analytics AI assistant for trend insights and analytical report generation' },
    },
    tryNow: { zh: '立即体验', en: 'Try Now' },
    learnMore: { zh: '了解更多', en: 'Learn More' },
  },

  // 登录页面
  login: {
    title: { zh: '欢迎回来', en: 'Welcome Back' },
    subtitle: { zh: '登录你的账号以继续', en: 'Sign in to your account to continue' },
    email: { zh: '邮箱', en: 'Email' },
    password: { zh: '密码', en: 'Password' },
    rememberMe: { zh: '记住我', en: 'Remember me' },
    forgotPassword: { zh: '忘记密码？', en: 'Forgot password?' },
    loginButton: { zh: '登录', en: 'Sign In' },
    loggingIn: { zh: '登录中...', en: 'Signing in...' },
    orContinueWith: { zh: '或', en: 'Or continue with' },
    noAccount: { zh: '还没有账号？', en: "Don't have an account?" },
    signUp: { zh: '免费注册', en: 'Sign Up' },
    invalidCredentials: { zh: '邮箱或密码错误', en: 'Invalid email or password' },
    comingSoon: { zh: '即将支持', en: 'Coming Soon' },
  },

  // 注册页面
  signup: {
    title: { zh: '创建账号', en: 'Create Account' },
    subtitle: { zh: '开始你的 AI 之旅', en: 'Start your AI journey' },
    name: { zh: '姓名', en: 'Name' },
    email: { zh: '邮箱', en: 'Email' },
    password: { zh: '密码', en: 'Password' },
    confirmPassword: { zh: '确认密码', en: 'Confirm Password' },
    agreeTerms: { zh: '我同意服务条款和隐私政策', en: 'I agree to the Terms of Service and Privacy Policy' },
    signupButton: { zh: '注册', en: 'Sign Up' },
    signingUp: { zh: '注册中...', en: 'Signing up...' },
    hasAccount: { zh: '已有账号？', en: 'Already have an account?' },
    login: { zh: '立即登录', en: 'Sign In' },
    passwordMismatch: { zh: '两次密码输入不一致', en: 'Passwords do not match' },
    mustAgreeTerms: { zh: '请同意服务条款', en: 'Please agree to the terms' },
  },

  // 忘记密码页面
  forgotPassword: {
    title: { zh: '重置密码', en: 'Reset Password' },
    subtitle: { zh: '输入你的邮箱，我们将发送重置链接', en: 'Enter your email and we\'ll send you a reset link' },
    email: { zh: '邮箱', en: 'Email' },
    sendButton: { zh: '发送重置链接', en: 'Send Reset Link' },
    sending: { zh: '发送中...', en: 'Sending...' },
    backToLogin: { zh: '返回登录', en: 'Back to Login' },
    checkEmail: { zh: '请检查你的邮箱', en: 'Check your email' },
    emailSent: { zh: '重置链接已发送到你的邮箱', en: 'Reset link has been sent to your email' },
  },

  // 控制台
  dashboard: {
    title: { zh: '控制台', en: 'Dashboard' },
    welcome: { zh: '欢迎回来', en: 'Welcome back' },
    overview: { zh: '概览', en: 'Overview' },
    usage: { zh: '用量统计', en: 'Usage Statistics' },
    apiKeys: { zh: 'API 密钥', en: 'API Keys' },
    plans: { zh: '订阅计划', en: 'Subscription Plans' },
    openAssistant: { zh: '打开助手', en: 'Open Assistant' },
    requests: { zh: '请求', en: 'Requests' },
    remaining: { zh: '剩余', en: 'Remaining' },
    currentPlan: { zh: '当前计划', en: 'Current Plan' },
    upgrade: { zh: '升级', en: 'Upgrade' },
  },

  // API 密钥页面
  apiKeys: {
    title: { zh: 'API 密钥管理', en: 'API Key Management' },
    description: { zh: '管理你的 API 密钥，用于调用 LeyoAI 服务', en: 'Manage your API keys for LeyoAI services' },
    createKey: { zh: '创建新密钥', en: 'Create New Key' },
    keyName: { zh: '密钥名称', en: 'Key Name' },
    keyValue: { zh: '密钥值', en: 'Key Value' },
    createdAt: { zh: '创建时间', en: 'Created At' },
    lastUsed: { zh: '最后使用', en: 'Last Used' },
    copy: { zh: '复制', en: 'Copy' },
    copied: { zh: '已复制', en: 'Copied' },
    revoke: { zh: '撤销', en: 'Revoke' },
    revokeConfirm: { zh: '确定要撤销此密钥吗？', en: 'Are you sure you want to revoke this key?' },
    noKeys: { zh: '暂无 API 密钥', en: 'No API keys yet' },
    createFirst: { zh: '创建你的第一个密钥', en: 'Create your first key' },
  },

  // 订阅计划页面
  plans: {
    title: { zh: '选择计划', en: 'Choose a Plan' },
    description: { zh: '选择适合你的计划，解锁更多 AI 能力', en: 'Choose a plan that fits your needs and unlock more AI capabilities' },
    free: {
      name: { zh: '免费版', en: 'Free' },
      price: { zh: '免费', en: 'Free' },
      desc: { zh: '适合个人体验', en: 'Perfect for personal use' },
    },
    starter: {
      name: { zh: '入门版', en: 'Starter' },
      price: { zh: '¥99/月', en: '$15/mo' },
      desc: { zh: '适合小型项目', en: 'Great for small projects' },
    },
    pro: {
      name: { zh: '专业版', en: 'Pro' },
      price: { zh: '¥299/月', en: '$45/mo' },
      desc: { zh: '适合团队协作', en: 'Perfect for teams' },
    },
    enterprise: {
      name: { zh: '企业版', en: 'Enterprise' },
      price: { zh: '联系我们', en: 'Contact Us' },
      desc: { zh: '定制化解决方案', en: 'Custom solutions' },
    },
    requests: { zh: '请求/月', en: 'requests/month' },
    current: { zh: '当前计划', en: 'Current' },
    select: { zh: '选择', en: 'Select' },
    contact: { zh: '联系我们', en: 'Contact Us' },
  },

  // Footer
  footer: {
    about: { zh: '关于我们', en: 'About Us' },
    aboutDesc: { zh: 'LeyoAI 是专业的 AI 模型服务平台，致力于为企业提供安全、高效的 AI 解决方案。', en: 'LeyoAI is a professional AI model service platform dedicated to providing secure and efficient AI solutions for enterprises.' },
    products: { zh: '产品', en: 'Products' },
    resources: { zh: '资源', en: 'Resources' },
    company: { zh: '公司', en: 'Company' },
    docs: { zh: '文档', en: 'Documentation' },
    api: { zh: 'API 参考', en: 'API Reference' },
    tutorials: { zh: '教程', en: 'Tutorials' },
    blog: { zh: '博客', en: 'Blog' },
    aboutUs: { zh: '关于我们', en: 'About Us' },
    careers: { zh: '加入我们', en: 'Careers' },
    contact: { zh: '联系我们', en: 'Contact' },
    privacy: { zh: '隐私政策', en: 'Privacy Policy' },
    terms: { zh: '使用条款', en: 'Terms of Service' },
    copyright: { zh: '© 2026 LeyoAI. 保留所有权利。', en: '© 2026 LeyoAI. All rights reserved.' },
  },
}

// 辅助函数：获取翻译
export function getTranslation(path: string, lang: 'zh' | 'en'): string {
  const keys = path.split('.')
  let value: any = translations
  for (const key of keys) {
    value = value?.[key]
    if (!value) return path
  }
  return value[lang] || value.zh || path
}
