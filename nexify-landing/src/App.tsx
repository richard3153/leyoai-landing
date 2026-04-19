import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuth } from "./components/AuthProvider";
import { useLang } from "./contexts/LanguageContext";
import { LanguageToggle } from "./components/LanguageToggle";

// ============================================================
// 类型定义
// ============================================================
interface ProductModel {
  name: string;
  tag: string;
  icon: string;
  link: string;
}

interface Product {
  id: string;
  name: string;
  nameCn: string;
  desc: string;
  descEn?: string;
  icon: string;
  image?: string;
  color: string;
  badge: string;
  badgeColor: string;
  features: string[];
  featuresEn?: string[];
  models?: ProductModel[];
  link?: string;
}

// ============================================================
// LeyoAI MaaS 平台
// ============================================================
const COMPANY_NAME = "杭州市上城区乐友信息服务工作室";
const BRAND_NAME = "LeyoAI";
const BRAND_TAGLINE = "Model as a Service";

// ============================================================
// 图片资源 (使用 Unsplash 和免费图库)
// ============================================================
const IMAGES = {
  hero: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80",
  cyber: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
  video: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80",
  flow: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  analytics: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  case1: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80",
  case2: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
  case3: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
  tutorial: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
  cta: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80",
};

// ============================================================
// 4大产品线
// ============================================================
const PRODUCTS: Product[] = [
  {
    id: "cyber",
    name: "Cyber Model",
    nameCn: "网络安全模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精网络诈骗预防、安全威胁识别与合规审查",
    descEn: "Based on Qwen2.5-1.5B + LoRA, specialized in phishing prevention, threat detection, and compliance review",
    icon: "🛡️",
    image: IMAGES.cyber,
    color: "from-emerald-500 to-teal-600",
    badge: "✅ Verified",
    badgeColor: "bg-emerald-500",
    features: ["钓鱼网站识别", "诈骗信息判断", "隐私泄露检测", "应急响应建议"],
    featuresEn: ["Phishing Detection", "Fraud Analysis", "Privacy Leak Check", "Emergency Response"],
    models: [
      { name: "🛡️ Cyber Security Assistant", tag: "Vertical Domain", icon: "🛡️", link: "https://huggingface.co/spaces/FFZwai/leyoai-cyber-assistant" },
    ],
  },
  {
    id: "video",
    name: "Video Model",
    nameCn: "视频内容模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精视频/图像安全审核与内容合规分类",
    descEn: "Based on Qwen2.5-1.5B + LoRA, specialized in video/image safety moderation and content classification",
    icon: "🎬",
    image: IMAGES.video,
    color: "from-violet-500 to-purple-600",
    badge: "✅ Verified",
    badgeColor: "bg-violet-500",
    features: ["图像安全审核", "场景风险识别", "内容合规分类", "隐私泄露检测"],
    featuresEn: ["Image Safety Audit", "Scene Risk Detection", "Content Classification", "Privacy Protection"],
    models: [
      { name: "🎬 Video Safety Assistant", tag: "Vertical Domain", icon: "🎬", link: "https://huggingface.co/spaces/FFZwai/leyoai-video-safety" },
    ],
    link: "https://huggingface.co/spaces/FFZwai/leyoai-video-safety",
  },
  {
    id: "flow",
    name: "Flow Model",
    nameCn: "流程自动化模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精业务流程分析、Python 脚本生成与工作流编排",
    descEn: "Based on Qwen2.5-1.5B + LoRA, specialized in business process analysis, Python script generation, and workflow orchestration",
    icon: "⚙️",
    image: IMAGES.flow,
    color: "from-blue-500 to-cyan-600",
    badge: "✅ Verified",
    badgeColor: "bg-blue-500",
    features: ["业务流程分析", "Python 脚本生成", "Airflow 工作流编排", "高可用系统设计"],
    featuresEn: ["Process Analysis", "Python Generation", "Airflow Orchestration", "System Design"],
    models: [
      { name: "⚙️ Flow Automation Assistant", tag: "Auto Workflow", icon: "⚙️", link: "https://huggingface.co/spaces/FFZwai/leyoai-flow-assistant" },
    ],
  },
  {
    id: "analytics",
    name: "Analytics Model",
    nameCn: "数据分析模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精 A/B 测试、用户行为分析与报告生成",
    descEn: "Based on Qwen2.5-1.5B + LoRA, specialized in A/B testing, user behavior analysis, and report generation",
    icon: "📊",
    image: IMAGES.analytics,
    color: "from-orange-500 to-amber-600",
    badge: "✅ Verified",
    badgeColor: "bg-orange-500",
    features: ["A/B 测试设计", "用户行为分析", "流失预测建模", "数据报告生成"],
    featuresEn: ["A/B Test Design", "User Behavior Analysis", "Churn Prediction", "Report Generation"],
    models: [
      { name: "📊 Analytics Assistant", tag: "Data Analysis", icon: "📊", link: "https://huggingface.co/spaces/FFZwai/leyoai-analytics-assistant" },
    ],
  },
  {
    id: "quant",
    name: "LeyoQuant",
    nameCn: "量化分析系统",
    desc: "基于价值投资理念的A股量化分析系统，7因子评分模型 + 实时行情监控 + 风控管理",
    descEn: "A-share quantitative analysis system based on value investing, 7-factor scoring model + real-time quotes + risk management",
    icon: "📈",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    color: "from-rose-500 to-red-600",
    badge: "✅ Online",
    badgeColor: "bg-rose-500",
    features: ["多因子量化评分", "实时行情监控", "技术分析引擎", "风控管理"],
    featuresEn: ["Multi-Factor Scoring", "Real-time Quotes", "Technical Analysis", "Risk Management"],
    models: [
      { name: "📈 LeyoQuant Analysis", tag: "Quant Investment", icon: "📈", link: "https://leyoai-quant.vercel.app" },
    ],
  },
];

// ============================================================
// Skill Hub 产品（OpenClaw 技能包）
// ============================================================
const SKILL_PRODUCTS: Product[] = [
  {
    id: "successor-skill",
    name: "successor-skill",
    nameCn: "AI 技能传承",
    desc: "智能体技能跨平台迁移与复制，保留工作流记忆与配置，一键部署到新环境",
    descEn: "Cross-platform AI skill migration, preserving workflow memory and configs, one-click deployment",
    icon: "🔄",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    color: "from-indigo-500 to-blue-600",
    badge: "✅ Open Source",
    badgeColor: "bg-indigo-500",
    features: ["技能导出/导入", "工作流记忆迁移", "配置模板化", "一键部署"],
    featuresEn: ["Skill Export/Import", "Workflow Memory", "Config Templates", "One-Click Deploy"],
    models: [
      { name: "🔄 successor-skill", tag: "OpenClaw Skill", icon: "🔄", link: "https://github.com/richard3153/successor-skill" },
    ],
  },
  {
    id: "persona-mimic",
    name: "persona-mimic",
    nameCn: "人格镜像",
    desc: "捕捉并复现特定人格特质与对话风格，生成风格一致的 AI 角色助手",
    descEn: "Capture and replicate specific personality traits and dialogue styles for consistent AI characters",
    icon: "🎭",
    image: "https://images.unsplash.com/photo-1518715308788-3005759c61d4?w=800&q=80",
    color: "from-pink-500 to-rose-600",
    badge: "✅ Open Source",
    badgeColor: "bg-pink-500",
    features: ["人格特质捕捉", "对话风格学习", "角色一致性保持", "多场景适配"],
    featuresEn: ["Personality Capture", "Style Learning", "Consistency Keeping", "Multi-Scene Adapt"],
    models: [
      { name: "🎭 persona-mimic", tag: "OpenClaw Skill", icon: "🎭", link: "https://github.com/richard3153/persona-mimic" },
    ],
  },
  {
    id: "code-restore-point",
    name: "code-restore-point",
    nameCn: "代码还原点",
    desc: "代码修改前一键创建 Git 快照还原点，出问题即时回滚，自动清理过期记录",
    descEn: "One-command Git snapshot before code changes, instant rollback on failure, automatic cleanup",
    icon: "🛡️",
    image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&q=80",
    color: "from-emerald-500 to-teal-600",
    badge: "✅ Open Source",
    badgeColor: "bg-emerald-500",
    features: ["一键快照", "即时回滚", "命名还原点", "自动清理"],
    featuresEn: ["One-Command Snapshot", "Instant Rollback", "Named Restore Points", "Auto Cleanup"],
    models: [
      { name: "🛡️ code-restore-point", tag: "OpenClaw Skill", icon: "🛡️", link: "https://github.com/richard3153/code-restore-point" },
    ],
  },
];

// ============================================================
// 等待名单表单
// ============================================================
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const { t } = useLang();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setErr(t("请输入有效邮箱", "Please enter a valid email")); return; }
    setLoading(true); setErr("");
    try {
      const { error } = await supabase.from("waitlist").insert([{ email }]);
      if (error?.code === "23505") { setErr(t("此邮箱已注册", "Email already registered")); setLoading(false); return; }
      setDone(true);
    } catch { setErr(t("网络异常，请重试", "Network error, please retry")); }
    setLoading(false);
  };

  if (done) return (
    <div className="text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="text-xl font-bold text-white mb-2">{t("注册成功！", "Registration Successful!")}</h3>
      <p className="text-white/70 text-sm">{t("我们会第一时间通知你产品更新", "We'll notify you about product updates")}</p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
      <input
        type="email" placeholder={t("输入邮箱地址", "Enter your email")} value={email}
        onChange={e => setEmail(e.target.value)} disabled={loading}
        className="flex-1 px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
      />
      <button
        type="submit" disabled={loading}
        className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {loading ? t("提交中...", "Submitting...") : t("获取内测", "Get Early Access")}
      </button>
      {err && <p className="text-red-300 text-sm text-center w-full">{err}</p>}
    </form>
  );
}

// ============================================================
// 主组件（首页）
// ============================================================
function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeCase, setActiveCase] = useState(0);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { lang, t } = useLang();

  // HF Space 链接自动附加 JWT（已登录时）
  const openHF = (baseUrl: string) => {
    if (session?.access_token) {
      const match = baseUrl.match(/spaces\/([^/]+)\/([^/]+)/);
      if (match) {
        const hfUrl = `https://${match[1]}-${match[2]}.hf.space/?token=${encodeURIComponent(session.access_token)}`;
        window.open(hfUrl, '_blank', 'noreferrer');
        return;
      }
    }
    window.open(baseUrl, '_blank', 'noreferrer');
  };
  
  useEffect(() => { setMounted(true); }, []);

  // 动态翻译数据
  const NAV_ITEMS = [
    { label: t("产品", "Products"), href: "#products" },
    { label: t("案例", "Cases"), href: "#cases" },
    { label: t("教程", "Tutorials"), href: "#tutorials" },
    { label: t("定价", "Pricing"), href: "#pricing" },
  ];

  const CATEGORIES = [
    {
      id: "application",
      label: t("应用系统", "Application"),
      icon: "💼",
      desc: t("开箱即用的完整解决方案", "Ready-to-use complete solutions"),
      color: "from-rose-500 to-red-600",
      items: PRODUCTS.filter(p => p.id === "quant"),
    },
    {
      id: "model",
      label: t("模型", "Model"),
      icon: "🧠",
      desc: t("垂直领域 LoRA 微调模型", "Vertical domain LoRA fine-tuned models"),
      color: "from-indigo-500 to-violet-600",
      items: PRODUCTS.filter(p => ["cyber", "video", "flow", "analytics"].includes(p.id)),
    },
    {
      id: "skill",
      label: t("技能", "Skillhub"),
      icon: "🛠️",
      desc: t("OpenClaw 智能体技能包", "OpenClaw agent skill packages"),
      color: "from-emerald-500 to-teal-600",
      items: SKILL_PRODUCTS,
    },
  ];

  const CASES = [
    {
      title: t("金融安全威胁检测", "Financial Threat Detection"),
      industry: t("金融科技", "Fintech"),
      icon: "🏦",
      image: IMAGES.case1,
      desc: t("某银行使用 Cyber Model 实现威胁情报自动分析，安全响应时间缩短 80%，准确率达 95%", "A bank uses Cyber Model for automated threat intelligence analysis, reducing response time by 80% with 95% accuracy"),
      metrics: [{ label: t("响应时间", "Response Time"), value: "-80%" }, { label: t("准确率", "Accuracy"), value: "95%" }],
    },
    {
      title: t("网络威胁智能识别", "Network Threat Detection"),
      industry: t("金融科技", "Fintech"),
      icon: "📱",
      image: IMAGES.case2,
      desc: t("某银行使用 Cyber Model 自动识别钓鱼网站和诈骗短信，安全事件响应时间缩短 80%", "A bank uses Cyber Model to auto-detect phishing sites and scam messages, reducing incident response by 80%"),
      metrics: [{ label: t("响应时间", "Response Time"), value: "-80%" }, { label: t("准确率", "Accuracy"), value: "95%" }],
    },
    {
      title: t("业务流程自动化", "Business Automation"),
      industry: t("电商", "E-commerce"),
      icon: "🛒",
      image: IMAGES.case3,
      desc: t("某电商平台使用 Flow Model 实现订单处理自动化，人工干预减少 60%，效率提升 150%", "An e-commerce platform uses Flow Model for order processing automation, reducing manual work by 60% and boosting efficiency by 150%"),
      metrics: [{ label: t("效率提升", "Efficiency"), value: "+150%" }, { label: t("成本降低", "Cost"), value: "-40%" }],
    },
  ];

  const TUTORIALS = [
    {
      title: t("5 分钟上手安全助手", "5-Min Security Assistant"),
      desc: t("快速体验 AI 安全问答，了解模型能力边界", "Quick experience AI security Q&A, understand model capabilities"),
      time: "5 min",
      level: t("入门", "Beginner"),
      icon: "🚀",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80",
    },
    {
      title: t("本地部署模型指南", "Local Deployment Guide"),
      desc: t("在本地环境部署 LeyoAI 模型，保护数据隐私", "Deploy LeyoAI models locally to protect data privacy"),
      time: "15 min",
      level: t("进阶", "Intermediate"),
      icon: "💻",
      image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80",
    },
    {
      title: t("API 集成最佳实践", "API Integration Best Practices"),
      desc: t("将 LeyoAI 集成到你的应用中，实现智能化升级", "Integrate LeyoAI into your applications for intelligent upgrade"),
      time: "10 min",
      level: t("进阶", "Intermediate"),
      icon: "🔌",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80",
    },
    {
      title: t("自定义模型微调", "Custom Model Fine-tuning"),
      desc: t("基于 LoRA 技术微调专属模型，适配业务场景", "Fine-tune custom models with LoRA for your business scenarios"),
      time: "30 min",
      level: t("高级", "Advanced"),
      icon: "🎯",
      image: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&q=80",
    },
  ];

  const PRICING_PLANS = [
    {
      name: t("免费版", "Free"),
      price: "¥0",
      period: t("永久免费", "Forever Free"),
      desc: t("个人学习与体验", "Personal learning"),
      features: [
        t("Cyber 安全助手 100次/月", "Cyber Assistant 100 calls/mo"),
        t("Video 安全 500分钟/月", "Video Safety 500 mins/mo"),
        t("Flow 自动化 500次/月", "Flow Automation 500 calls/mo"),
        t("Analytics 分析 1,000次/月", "Analytics 1,000 calls/mo"),
        t("HF Spaces 在线访问", "HF Spaces Online Access"),
      ],
      cta: t("免费开始", "Get Started Free"),
      highlight: false,
    },
    {
      name: t("起步版", "Starter"),
      price: "¥29",
      period: "/月",
      desc: t("小团队安全防护", "Small team security"),
      features: [
        t("Cyber 5,000次/月 + 8K上下文", "Cyber 5,000 calls/mo + 8K context"),
        t("Video 5,000分钟/月 1080p", "Video 5,000 mins/mo 1080p"),
        t("Flow 5,000次/月 50步工作流", "Flow 5,000 calls/mo 50-step workflow"),
        t("Analytics 10,000次/月 10万行", "Analytics 10,000 calls/mo 100K rows"),
        t("API 接入 + 邮件告警", "API Access + Email Alerts"),
      ],
      cta: t("立即订阅", "Subscribe Now"),
      highlight: false,
    },
    {
      name: t("专业版", "Pro"),
      price: "¥79",
      period: "/月",
      desc: t("中小企业安全部门", "SME security teams"),
      features: [
        t("Cyber 30,000次/月 + 漏洞分析", "Cyber 30,000 calls/mo + Vulnerability Analysis"),
        t("Video 30,000分钟/月 4K", "Video 30,000 mins/mo 4K"),
        t("Flow 30,000次/月 200步", "Flow 30,000 calls/mo 200 steps"),
        t("Analytics 50,000次/月 百万行", "Analytics 50,000 calls/mo 1M rows"),
        t("SLA 99.5% + 优先支持", "SLA 99.5% + Priority Support"),
      ],
      cta: t("升级专业版", "Upgrade to Pro"),
      highlight: true,
    },
    {
      name: t("企业版", "Enterprise"),
      price: "¥299",
      period: t("/月起", "/mo+"),
      desc: t("大规模定制需求", "Large-scale customization"),
      features: [
        t("四款产品均不限量", "Unlimited access to all products"),
        t("私有化部署", "Private Deployment"),
        t("定制模型训练", "Custom Model Training"),
        t("专属客户成功经理", "Dedicated Success Manager"),
        t("7×24 技术支持", "24/7 Technical Support"),
      ],
      cta: t("联系销售", "Contact Sales"),
      highlight: false,
    },
  ];

  const STATS = [
    { label: t("垂直模型", "Vertical Models"), value: "4", icon: "🧠" },
    { label: t("智能技能", "Smart Skills"), value: "3", icon: "🛠️" },
    { label: t("应用系统", "Applications"), value: "1", icon: "💼" },
    { label: t("服务领域", "Industries"), value: "9+", icon: "🎯" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">

      {/* ── 导航栏 ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/25">
              N
            </div>
            <span className="font-bold text-lg">{BRAND_NAME}</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href}
                className="text-sm text-slate-400 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            
            {user ? (
              <Link to="/dashboard"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-500/25 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-400/30 flex items-center justify-center text-xs font-bold">
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                {t("控制台", "Dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login"
                  className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors">
                  {t("登录", "Login")}
                </Link>
                <Link to="/signup"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-500/25">
                  {t("免费注册", "Sign Up")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero 区域 ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMAGES.hero} alt="AI Background" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
        </div>

        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-slate-300">{BRAND_TAGLINE}</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {t("AI 模型", "AI Models")}
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                {t("即服务平台", "as a Service")}
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t(
                "专注垂直领域 AI 模型与应用系统研发，覆盖模型训练、智能技能与行业解决方案，让 AI 技术真正赋能业务场景。",
                "Focus on vertical AI models and application systems, covering model training, intelligent skills, and industry solutions to empower business scenarios."
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#products"
                className="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-xl">
                {t("探索模型", "Explore Models")}
              </a>
              <a href="#tutorials"
                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
                {t("查看教程", "View Tutorials")}
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* ── 产品展示区 ── */}
      <section id="products" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{t("AI 能力矩阵", "AI Capability Matrix")}</h2>
            <p className="text-slate-400 text-lg">{t("三大领域，深度垂直，构建专业级 AI 生态", "Three domains, deeply vertical, building a professional AI ecosystem")}</p>
          </div>

          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="mb-16 last:mb-0">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg`}>
                  {cat.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{cat.label}</h3>
                  <p className="text-slate-500 text-sm">{cat.desc}</p>
                </div>
              </div>

              <div className={`grid gap-6 ${cat.id === 'model' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                {cat.items.map((p) => (
                  <div key={p.id}
                    className="group relative bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden hover:border-white/20 transition-all duration-500"
                    onMouseEnter={() => setActiveProduct(p.id)}
                    onMouseLeave={() => setActiveProduct(null)}>

                    <div className="absolute inset-0">
                      <img
                        src={p.image}
                        alt={p.name}
                        className={`w-full h-full object-cover transition-all duration-700 ${activeProduct === p.id ? 'opacity-40 scale-105' : 'opacity-20'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />
                    </div>

                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.color}`} />

                    <div className="relative p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-3xl">
                          {p.icon}
                        </div>
                        <span className={`${p.badgeColor}/20 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${p.badgeColor.replace('bg-', 'text-')}`}>
                          {p.badge}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold mb-1">{lang === 'zh' ? p.nameCn : p.name}</h3>
                      <p className="text-slate-500 text-sm mb-4">{lang === 'zh' ? p.name : p.nameCn}</p>
                      <p className="text-slate-400 leading-relaxed mb-6">{lang === 'zh' ? p.desc : (p.descEn || p.desc)}</p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {(lang === 'zh' ? p.features : (p.featuresEn || p.features)).map(f => (
                          <span key={f} className="text-xs bg-white/10 backdrop-blur-sm text-slate-300 px-3 py-1.5 rounded-lg">
                            {f}
                          </span>
                        ))}
                      </div>

                      {p.models && p.models.length > 0 && (
                        <div className="space-y-2">
                          {p.models.map(m => (
                            <a key={m.name} href="#" onClick={e => { e.preventDefault(); openHF(m.link); }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all group/item">
                              <span className="text-xl">{m.icon}</span>
                              <div className="flex-1">
                                <p className="font-semibold text-sm group-hover/item:text-indigo-400 transition-colors">{m.name}</p>
                                <p className="text-xs text-slate-500">{m.tag}{session?.access_token && m.link.includes('/spaces/') ? ` · ${t('🔐 自动认证', '🔐 Auto Auth')}` : ''}</p>
                              </div>
                              <span className="text-indigo-400 text-sm font-medium opacity-0 group-hover/item:opacity-100 transition-opacity">
                                {t("体验 →", "Try →")}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {!p.models && !p.link && (
                        <div className="text-slate-500 text-sm flex items-center gap-2">
                          <span>🔒</span> {t("敬请期待", "Coming Soon")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 数据统计 ── */}
      <section className="py-16 px-6 border-y border-white/5 bg-slate-900/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label} className="group">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-slate-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 案例展示 ── */}
      <section id="cases" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{t("客户案例", "Customer Stories")}</h2>
            <p className="text-slate-400 text-lg">{t("真实场景，真实价值", "Real scenarios, real value")}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3 space-y-4">
              {CASES.map((c, idx) => (
                <button key={c.title}
                  onClick={() => setActiveCase(idx)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all ${
                    activeCase === idx 
                      ? 'bg-indigo-600/20 border-indigo-500/50' 
                      : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                  }`}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{c.icon}</span>
                    <div>
                      <p className="font-bold text-white">{c.title}</p>
                      <p className="text-sm text-slate-500">{c.industry}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:flex-1 relative rounded-3xl overflow-hidden">
              <img 
                src={CASES[activeCase].image} 
                alt={CASES[activeCase].title}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/70" />
              
              <div className="relative p-8 lg:p-12">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl">{CASES[activeCase].icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{CASES[activeCase].title}</h3>
                    <p className="text-slate-400">{CASES[activeCase].industry}</p>
                  </div>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  {CASES[activeCase].desc}
                </p>
                <div className="flex gap-8">
                  {CASES[activeCase].metrics.map(m => (
                    <div key={m.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-3xl font-black text-indigo-400">{m.value}</div>
                      <div className="text-sm text-slate-500 mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 教程区 ── */}
      <section id="tutorials" className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{t("快速开始", "Quick Start")}</h2>
            <p className="text-slate-400 text-lg">{t("从入门到精通，一步步掌握 LeyoAI", "From beginner to master, step by step")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TUTORIALS.map((tut, idx) => (
              <div key={tut.title}
                className="group relative rounded-2xl border border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all cursor-pointer">
                
                <div className="h-32 relative overflow-hidden">
                  <img 
                    src={tut.image} 
                    alt={tut.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <div className="absolute top-3 left-3 text-3xl font-black text-white/20">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                </div>
                
                <div className="p-5 bg-slate-900">
                  <h3 className="font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {tut.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">{tut.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded">{tut.time}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      tut.level.includes('入') ? 'bg-emerald-500/20 text-emerald-400' :
                      tut.level.includes('进') ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>{tut.level}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 定价 ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{t("简单透明的定价", "Simple Transparent Pricing")}</h2>
            <p className="text-slate-400 text-lg">{t("无隐藏费用，按需选择", "No hidden fees, choose as needed")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING_PLANS.map(plan => (
              <div key={plan.name}
                className={`relative rounded-3xl border p-8 ${
                  plan.highlight 
                    ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/50' 
                    : 'bg-slate-900/50 border-white/5'
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                      {t("最受欢迎", "Most Popular")}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <span className="text-indigo-400">✓</span>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <a href="#waitlist"
                  className={`block text-center py-3.5 rounded-xl font-semibold transition-colors ${
                    plan.highlight 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA 区域 ── */}
      <section id="waitlist" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMAGES.cta} alt="Technology" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-violet-900/80 to-purple-900/90" />
        </div>

        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">{t("开始使用 LeyoAI", "Get Started with LeyoAI")}</h2>
          <p className="text-white/80 text-lg mb-10">
            {t("注册获取内测资格，第一时间体验最新模型能力", "Sign up for early access and experience the latest AI capabilities")}
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── 页脚 ── */}
      <footer className="bg-slate-950 border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm">
                  N
                </div>
                <span className="font-bold text-lg">{BRAND_NAME}</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
                {lang === 'zh' 
                  ? `${COMPANY_NAME} 旗下品牌。专注垂直领域 AI 模型研发与商业化，让 AI 技术真正赋能千行百业。`
                  : `A brand under ${COMPANY_NAME}. Focus on vertical AI model development, empowering industries with AI technology.`
                }
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm mb-4">{t("产品", "Products")}</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                {[...PRODUCTS, ...SKILL_PRODUCTS].map(p => (
                  <li key={p.id} className="hover:text-white transition-colors cursor-pointer">
                    {p.icon} {lang === 'zh' ? p.nameCn : p.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm mb-4">{t("公司", "Company")}</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="/about.html" className="hover:text-white transition-colors">{t("关于我们", "About Us")}</a></li>
                <li><a href="/about.html#join" className="hover:text-white transition-colors">{t("加入团队", "Join Us")}</a></li>
                <li><a href="mailto:xuanchen.wu@hotmail.com" className="hover:text-white transition-colors">{t("联系我们", "Contact")}</a></li>
                <li><a href="/privacy.html" className="hover:text-white transition-colors">{t("隐私政策", "Privacy Policy")}</a></li>
                <li><a href="/terms.html" className="hover:text-white transition-colors">{t("使用条款", "Terms of Service")}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <span>© 2026 {COMPANY_NAME}</span>
            <span>{BRAND_NAME} — {t("让 AI 模型服务每个人", "AI Models for Everyone")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// 路由配置
// ============================================================
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import DashboardKeys from "./pages/DashboardKeys";
import DashboardPlans from "./pages/DashboardPlans";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="keys" element={<DashboardKeys />} />
        <Route path="plans" element={<DashboardPlans />} />
      </Route>
    </Routes>
  );
}
