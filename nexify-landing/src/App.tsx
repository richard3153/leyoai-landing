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
  icon: string;
  image?: string;
  color: string;
  badge: string;
  badgeColor: string;
  features: string[];
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
  hero: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80", // AI 神经网络
  cyber: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80", // 网络安全
  video: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80", // 视频制作
  flow: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", // 数据流程
  analytics: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", // 数据分析
  case1: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80", // 金融
  case2: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80", // 短视频
  case3: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80", // 电商
  tutorial: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80", // 学习
  cta: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80", // 科技背景
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
    icon: "🛡️",
    image: IMAGES.cyber,
    color: "from-emerald-500 to-teal-600",
    badge: "✅ 已验证",
    badgeColor: "bg-emerald-500",
    features: ["钓鱼网站识别", "诈骗信息判断", "隐私泄露检测", "应急响应建议"],
    models: [
      { name: "🛡️ Cyber 安全助手", tag: "垂直领域", icon: "🛡️", link: "https://huggingface.co/spaces/FFZwai/leyoai-cyber-assistant" },
    ],
  },
  {
    id: "video",
    name: "Video Model",
    nameCn: "视频内容模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精视频/图像安全审核与内容合规分类",
    icon: "🎬",
    image: IMAGES.video,
    color: "from-violet-500 to-purple-600",
    badge: "✅ 已验证",
    badgeColor: "bg-violet-500",
    features: ["图像安全审核", "场景风险识别", "内容合规分类", "隐私泄露检测"],
    models: [
      { name: "🎬 视频安全助手", tag: "垂直领域", icon: "🎬", link: "https://huggingface.co/spaces/FFZwai/leyoai-video-safety" },
    ],
    link: "https://huggingface.co/spaces/FFZwai/leyoai-video-safety",
  },
  {
    id: "flow",
    name: "Flow Model",
    nameCn: "流程自动化模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精业务流程分析、Python 脚本生成与工作流编排",
    icon: "⚙️",
    image: IMAGES.flow,
    color: "from-blue-500 to-cyan-600",
    badge: "✅ 已验证",
    badgeColor: "bg-blue-500",
    features: ["业务流程分析", "Python 脚本生成", "Airflow 工作流编排", "高可用系统设计"],
    models: [
      { name: "⚙️ Flow 自动化助手", tag: "流程自动化", icon: "⚙️", link: "https://huggingface.co/spaces/FFZwai/leyoai-flow-assistant" },
    ],
  },
  {
    id: "analytics",
    name: "Analytics Model",
    nameCn: "数据分析模型",
    desc: "基于 Qwen2.5-1.5B + LoRA 微调，专精 A/B 测试、用户行为分析与报告生成",
    icon: "📊",
    image: IMAGES.analytics,
    color: "from-orange-500 to-amber-600",
    badge: "✅ 已验证",
    badgeColor: "bg-orange-500",
    features: ["A/B 测试设计", "用户行为分析", "流失预测建模", "数据报告生成"],
    models: [
      { name: "📊 Analytics 分析助手", tag: "数据分析", icon: "📊", link: "https://huggingface.co/spaces/FFZwai/leyoai-analytics-assistant" },
    ],
  },
  {
    id: "quant",
    name: "LeyoQuant",
    nameCn: "量化分析系统",
    desc: "基于价值投资理念的A股量化分析系统，7因子评分模型 + 实时行情监控 + 风控管理",
    icon: "📈",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    color: "from-rose-500 to-red-600",
    badge: "✅ 已上线",
    badgeColor: "bg-rose-500",
    features: ["多因子量化评分", "实时行情监控", "技术分析引擎", "风控管理"],
    models: [
      { name: "📈 LeyoQuant 量化分析", tag: "量化投资", icon: "📈", link: "https://leyoai-quant.vercel.app" },
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
    icon: "🔄",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    color: "from-indigo-500 to-blue-600",
    badge: "✅ 开源",
    badgeColor: "bg-indigo-500",
    features: ["技能导出/导入", "工作流记忆迁移", "配置模板化", "一键部署"],
    models: [
      { name: "🔄 successor-skill", tag: "OpenClaw Skill", icon: "🔄", link: "https://github.com/richard3153/successor-skill" },
    ],
  },
  {
    id: "persona-mimic",
    name: "persona-mimic",
    nameCn: "人格镜像",
    desc: "捕捉并复现特定人格特质与对话风格，生成风格一致的 AI 角色助手",
    icon: "🎭",
    image: "https://images.unsplash.com/photo-1518715308788-3005759c61d4?w=800&q=80",
    color: "from-pink-500 to-rose-600",
    badge: "✅ 开源",
    badgeColor: "bg-pink-500",
    features: ["人格特质捕捉", "对话风格学习", "角色一致性保持", "多场景适配"],
    models: [
      { name: "🎭 persona-mimic", tag: "OpenClaw Skill", icon: "🎭", link: "https://github.com/richard3153/persona-mimic" },
    ],
  },
];

// ============================================================
// 三大 AI 领域分类
// ============================================================
const CATEGORIES = [
  {
    id: "application",
    label: "应用系统 Application",
    icon: "💼",
    desc: "开箱即用的完整解决方案",
    color: "from-rose-500 to-red-600",
    items: PRODUCTS.filter(p => p.id === "quant"),
  },
  {
    id: "model",
    label: "模型 Model",
    icon: "🧠",
    desc: "垂直领域 LoRA 微调模型",
    color: "from-indigo-500 to-violet-600",
    items: PRODUCTS.filter(p => ["cyber", "video", "flow", "analytics"].includes(p.id)),
  },
  {
    id: "skill",
    label: "技能 Skillhub",
    icon: "🛠️",
    desc: "OpenClaw 智能体技能包",
    color: "from-emerald-500 to-teal-600",
    items: SKILL_PRODUCTS,
  },
];

// ============================================================
// 案例展示
// ============================================================
const CASES = [
  {
    title: "金融安全威胁检测",
    industry: "金融科技",
    icon: "🏦",
    image: IMAGES.case1,
    desc: "某银行使用 Cyber Model 实现威胁情报自动分析，安全响应时间缩短 80%，准确率达 95%",
    metrics: [{ label: "响应时间", value: "-80%" }, { label: "准确率", value: "95%" }],
  },
  {
    title: "网络威胁智能识别",
    industry: "金融科技",
    icon: "📱",
    image: IMAGES.case2,
    desc: "某银行使用 Cyber Model 自动识别钓鱼网站和诈骗短信，安全事件响应时间缩短 80%",
    metrics: [{ label: "响应时间", value: "-80%" }, { label: "准确率", value: "95%" }],
  },
  {
    title: "业务流程自动化",
    industry: "电商",
    icon: "🛒",
    image: IMAGES.case3,
    desc: "某电商平台使用 Flow Model 实现订单处理自动化，人工干预减少 60%，效率提升 150%",
    metrics: [{ label: "效率提升", value: "+150%" }, { label: "成本降低", value: "-40%" }],
  },
];

// ============================================================
// 使用教程
// ============================================================
const TUTORIALS = [
  {
    title: "5 分钟上手安全助手",
    desc: "快速体验 AI 安全问答，了解模型能力边界",
    time: "5 min",
    level: "入门",
    icon: "🚀",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80",
  },
  {
    title: "本地部署模型指南",
    desc: "在本地环境部署 LeyoAI 模型，保护数据隐私",
    time: "15 min",
    level: "进阶",
    icon: "💻",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80",
  },
  {
    title: "API 集成最佳实践",
    desc: "将 LeyoAI 集成到你的应用中，实现智能化升级",
    time: "10 min",
    level: "进阶",
    icon: "🔌",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80",
  },
  {
    title: "自定义模型微调",
    desc: "基于 LoRA 技术微调专属模型，适配业务场景",
    time: "30 min",
    level: "高级",
    icon: "🎯",
    image: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&q=80",
  },
];

// ============================================================
// 定价方案
// ============================================================
const PRICING_PLANS = [
  {
    name: "免费版",
    price: "¥0",
    period: "永久免费",
    desc: "个人学习与体验",
    features: ["Cyber 安全助手 100次/月", "Video 安全 500分钟/月", "Flow 自动化 500次/月", "Analytics 分析 1,000次/月", "HF Spaces 在线访问"],
    cta: "免费开始",
    highlight: false,
  },
  {
    name: "起步版",
    price: "¥29",
    period: "/月",
    desc: "小团队安全防护",
    features: ["Cyber 5,000次/月 + 8K上下文", "Video 5,000分钟/月 1080p", "Flow 5,000次/月 50步工作流", "Analytics 10,000次/月 10万行", "API 接入 + 邮件告警"],
    cta: "立即订阅",
    highlight: false,
  },
  {
    name: "专业版",
    price: "¥79",
    period: "/月",
    desc: "中小企业安全部门",
    features: ["Cyber 30,000次/月 + 漏洞分析", "Video 30,000分钟/月 4K", "Flow 30,000次/月 200步", "Analytics 50,000次/月 百万行", "SLA 99.5% + 优先支持"],
    cta: "升级专业版",
    highlight: true,
  },
  {
    name: "企业版",
    price: "¥299",
    period: "/月起",
    desc: "大规模定制需求",
    features: ["四款产品均不限量", "私有化部署", "定制模型训练", "专属客户成功经理", "7×24 技术支持"],
    cta: "联系销售",
    highlight: false,
  },
];

// ============================================================
// 导航项
// ============================================================
const NAV_ITEMS = [
  { labelZh: "产品", labelEn: "Products", href: "#products" },
  { labelZh: "案例", labelEn: "Cases", href: "#cases" },
  { labelZh: "教程", labelEn: "Tutorials", href: "#tutorials" },
  { labelZh: "定价", labelEn: "Pricing", href: "#pricing" },
];

// ============================================================
// 等待名单表单
// ============================================================
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setErr("请输入有效邮箱"); return; }
    setLoading(true); setErr("");
    try {
      const { error } = await supabase.from("waitlist").insert([{ email }]);
      if (error?.code === "23505") { setErr("此邮箱已注册"); setLoading(false); return; }
      setDone(true);
    } catch { setErr("网络异常，请重试"); }
    setLoading(false);
  };

  if (done) return (
    <div className="text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="text-xl font-bold text-white mb-2">注册成功！</h3>
      <p className="text-white/70 text-sm">我们会第一时间通知你产品更新</p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
      <input
        type="email" placeholder="输入邮箱地址" value={email}
        onChange={e => setEmail(e.target.value)} disabled={loading}
        className="flex-1 px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
      />
      <button
        type="submit" disabled={loading}
        className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {loading ? "提交中..." : "获取内测"}
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
      // HF Space URL 格式: https://huggingface.co/spaces/Owner/Repo → https://Owner-Repo.hf.space
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

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">

      {/* ── 导航栏 ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/25">
              N
            </div>
            <span className="font-bold text-lg">{BRAND_NAME}</span>
          </div>

          {/* 导航 */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href}
                className="text-sm text-slate-400 hover:text-white transition-colors">
                {lang === 'zh' ? item.labelZh : item.labelEn}
              </a>
            ))}
          </nav>

          {/* 语言切换 + CTA */}
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
        {/* 背景图片 */}
        <div className="absolute inset-0">
          <img 
            src={IMAGES.hero} 
            alt="AI Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
        </div>

        {/* 装饰光晕 */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
        </div>

        {/* 内容 */}
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* 标签 */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-slate-300">{BRAND_TAGLINE}</span>
            </div>

            {/* 标题 */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {t("AI 模型", "AI Models")}
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                {t("即服务平台", "as a Service")}
              </span>
            </h1>

            {/* 描述 */}
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t(
                "专注垂直领域 AI 模型与应用系统研发，覆盖模型训练、智能技能与行业解决方案，让 AI 技术真正赋能业务场景。",
                "Focus on vertical AI models and application systems, covering model training, intelligent skills, and industry solutions to truly empower business scenarios."
              )}
            </p>

            {/* 按钮 */}
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

        {/* 向下滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* ── 产品展示区 ── */}
      <section id="products" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{t("AI 能力矩阵", "AI Capability Matrix")}</h2>
            <p className="text-slate-400 text-lg">{t("三大领域，深度垂直，构建专业级 AI 生态", "Three major domains, deeply vertical, building professional AI ecosystem")}</p>
          </div>

          {/* 三大领域分组 */}
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="mb-16 last:mb-0">
              {/* 领域标题 */}
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg`}>
                  {cat.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{cat.label}</h3>
                  <p className="text-slate-500 text-sm">{cat.desc}</p>
                </div>
              </div>

              {/* 该领域产品网格 */}
              <div className={`grid gap-6 ${cat.id === 'model' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                {cat.items.map((p) => (
                  <div key={p.id}
                    className="group relative bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden hover:border-white/20 transition-all duration-500"
                    onMouseEnter={() => setActiveProduct(p.id)}
                    onMouseLeave={() => setActiveProduct(null)}>

                    {/* 产品图片背景 */}
                    <div className="absolute inset-0">
                      <img
                        src={p.image}
                        alt={p.name}
                        className={`w-full h-full object-cover transition-all duration-700 ${activeProduct === p.id ? 'opacity-40 scale-105' : 'opacity-20'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />
                    </div>

                    {/* 顶部渐变条 */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.color}`} />

                    {/* 内容 */}
                    <div className="relative p-8">
                      {/* 图标和状态 */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-3xl">
                          {p.icon}
                        </div>
                        <span className={`${p.badgeColor}/20 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${p.badgeColor.replace('bg-', 'text-')}`}>
                          {p.badge}
                        </span>
                      </div>

                      {/* 标题 */}
                      <h3 className="text-2xl font-bold mb-1">{p.name}</h3>
                      <p className="text-slate-500 text-sm mb-4">{p.nameCn}</p>
                      <p className="text-slate-400 leading-relaxed mb-6">{p.desc}</p>

                      {/* 特性标签 */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {p.features.map(f => (
                          <span key={f} className="text-xs bg-white/10 backdrop-blur-sm text-slate-300 px-3 py-1.5 rounded-lg">
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* 模型入口 */}
                      {p.models && p.models.length > 0 && (
                        <div className="space-y-2">
                          {p.models.map(m => (
                            <a key={m.name} href="#" onClick={e => { e.preventDefault(); openHF(m.link); }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all group/item">
                              <span className="text-xl">{m.icon}</span>
                              <div className="flex-1">
                                <p className="font-semibold text-sm group-hover/item:text-indigo-400 transition-colors">{m.name}</p>
                                <p className="text-xs text-slate-500">{m.tag}{session?.access_token && m.link.includes('/spaces/') ? ' · 🔐 自动认证' : ''}</p>
                              </div>
                              <span className="text-indigo-400 text-sm font-medium opacity-0 group-hover/item:opacity-100 transition-opacity">
                                体验 →
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* 未上线提示 */}
                      {!p.models && !p.link && (
                        <div className="text-slate-500 text-sm flex items-center gap-2">
                          <span>🔒</span> 敬请期待
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
          {[
            { label: "垂直模型", value: "4", icon: "🧠" },
            { label: "智能技能", value: "2", icon: "🛠️" },
            { label: "应用系统", value: "1", icon: "💼" },
            { label: "服务领域", value: "9+", icon: "🎯" },
          ].map(s => (
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4">客户案例</h2>
            <p className="text-slate-400 text-lg">真实场景，真实价值</p>
          </div>

          {/* 案例切换 - 横向卡片 */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 案例列表 */}
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

            {/* 案例详情 */}
            <div className="lg:flex-1 relative rounded-3xl overflow-hidden">
              {/* 背景图片 */}
              <img 
                src={CASES[activeCase].image} 
                alt={CASES[activeCase].title}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/70" />
              
              {/* 内容 */}
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4">快速开始</h2>
            <p className="text-slate-400 text-lg">从入门到精通，一步步掌握 LeyoAI</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TUTORIALS.map((t, idx) => (
              <div key={t.title}
                className="group relative rounded-2xl border border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all cursor-pointer">
                
                {/* 图片背景 */}
                <div className="h-32 relative overflow-hidden">
                  <img 
                    src={t.image} 
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  {/* 序号 */}
                  <div className="absolute top-3 left-3 text-3xl font-black text-white/20">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                </div>
                
                {/* 内容 */}
                <div className="p-5 bg-slate-900">
                  <h3 className="font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {t.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">{t.desc}</p>
                  {/* 标签 */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded">{t.time}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      t.level === '入门' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.level === '进阶' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>{t.level}</span>
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
            <h2 className="text-4xl sm:text-5xl font-black mb-4">简单透明的定价</h2>
            <p className="text-slate-400 text-lg">无隐藏费用，按需选择</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING_PLANS.map(plan => (
              <div key={plan.name}
                className={`relative rounded-3xl border p-8 ${
                  plan.highlight 
                    ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/50' 
                    : 'bg-slate-900/50 border-white/5'
                }`}>
                {/* 推荐标签 */}
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                      最受欢迎
                    </span>
                  </div>
                )}

                {/* 价格 */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-2">{plan.desc}</p>
                </div>

                {/* 功能列表 */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <span className="text-indigo-400">✓</span>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* 按钮 */}
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
        {/* 背景图片 */}
        <div className="absolute inset-0">
          <img 
            src={IMAGES.cta} 
            alt="Technology" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-violet-900/80 to-purple-900/90" />
        </div>

        {/* 装饰 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">开始使用 LeyoAI</h2>
          <p className="text-white/80 text-lg mb-10">
            注册获取内测资格，第一时间体验最新模型能力
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── 页脚 ── */}
      <footer className="bg-slate-950 border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* 品牌 */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm">
                  N
                </div>
                <span className="font-bold text-lg">{BRAND_NAME}</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
                {t(
                  `${COMPANY_NAME} 旗下品牌。专注垂直领域 AI 模型研发与商业化，让 AI 技术真正赋能千行百业。`,
                  `A brand under ${COMPANY_NAME}. Focus on vertical AI model development and commercialization, empowering industries with AI technology.`
                )}
              </p>
            </div>

            {/* 产品 */}
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

            {/* 公司 */}
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

          {/* 底部 */}
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

