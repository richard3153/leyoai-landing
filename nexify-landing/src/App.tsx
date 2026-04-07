import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

// ============================================================
// 全新设计 - Nexify 品牌
// ============================================================

const HERO_HEADLINE = "AI Agent as a Service";
const HERO_SUBTITLE = "一个平台，无限可能。让 AI 智能体为你完成一切工作。";
const HERO_CTA_PRIMARY = "免费试用";
const HERO_CTA_SECONDARY = "观看演示";

const FEATURES = [
  {
    icon: "⚡",
    title: "极速交付",
    desc: "AI 7×24小时工作，分钟级完成任务",
    stat: "平均 15 分钟",
  },
  {
    icon: "🎯",
    title: "精准执行",
    desc: "理解自然语言指令，零误差完成任务",
    stat: "99.7% 准确率",
  },
  {
    icon: "🔄",
    title: "无限迭代",
    desc: "不满意？随时调整，直到完美",
    stat: "免费修改 5 次",
  },
  {
    icon: "🔒",
    title: "安全合规",
    desc: "数据加密存储，严格隐私保护",
    stat: "企业级安全",
  },
];

const PRODUCT_CARDS = [
  {
    name: "Nexify Safety",
    tagline: "AI 安全问答助手",
    desc: "中英双语，覆盖网络安全、消防安全、出行安全等 9 大领域",
    icon: "🛡️",
    color: "from-emerald-500 to-teal-600",
    status: "在线",
    link: "https://huggingface.co/spaces/FFZwai/nexify-safety-assistant",
  },
  {
    name: "Nexify Video",
    tagline: "智能视频制作",
    desc: "短视频、长视频、AI 字幕、自动剪辑，一键成片",
    icon: "🎬",
    color: "from-violet-500 to-purple-600",
    status: "内测中",
    link: "#waitlist",
  },
  {
    name: "Nexify Flow",
    tagline: "工作流自动化",
    desc: "可视化拖拽编排，AI 智能体协作执行",
    icon: "🔄",
    color: "from-blue-500 to-indigo-600",
    status: "开发中",
    link: "#waitlist",
  },
  {
    name: "Nexify Analytics",
    tagline: "智能数据分析",
    desc: "深度调研、竞品分析、洞察报告自动生成",
    icon: "📊",
    color: "from-orange-500 to-red-600",
    status: "规划中",
    link: "#waitlist",
  },
];

const TESTIMONIALS = [
  {
    quote: "原本需要一周的视频剪辑工作，Nexify 3小时就完成了。质量超出预期！",
    author: "李明",
    role: "内容创作者 · 50万粉丝",
  },
  {
    quote: "把客服自动化后，响应时间从 2 小时缩短到 30 秒，客户满意度反而提升了。",
    author: "王芳",
    role: "电商运营负责人",
  },
  {
    quote: "作为开发者，我用 Nexify 自动化了很多重复性工作，效率提升至少 3 倍。",
    author: "张伟",
    role: "全栈工程师",
  },
];

const PRICING = [
  {
    name: "免费版",
    price: "¥0",
    period: "/月",
    features: ["每月 10 次任务", "基础 AI 模型", "社区支持", "24 小时响应"],
    cta: "开始使用",
    popular: false,
  },
  {
    name: "专业版",
    price: "¥99",
    period: "/月",
    features: ["每月 100 次任务", "高级 AI 模型", "优先队列", "1 小时响应", "免费修改 5 次"],
    cta: "立即升级",
    popular: true,
  },
  {
    name: "企业版",
    price: "定制",
    period: "",
    features: ["无限任务", "专属 AI 模型", "API 接入", "专属客服", "SLA 保障"],
    cta: "联系我们",
    popular: false,
  },
];

// ============================================================
// Components
// ============================================================

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-slate-900/95 backdrop-blur-lg shadow-xl" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl font-black">
            N
          </div>
          <span className="text-xl font-bold tracking-tight">Nexify</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#products" className="text-slate-400 hover:text-white transition-colors text-sm">
            产品
          </a>
          <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm">
            特性
          </a>
          <a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm">
            价格
          </a>
        </div>

        <a
          href="#waitlist"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300"
        >
          免费开始
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-8 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-violet-300 text-sm">全新 AI 安全助手已上线</span>
          <span className="text-violet-400 text-xs">→</span>
        </div>

        {/* 标题 */}
        <h1
          className={`text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6 transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            AI Agent
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            as a Service
          </span>
        </h1>

        {/* 副标题 */}
        <p
          className={`text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {HERO_SUBTITLE}
        </p>

        {/* CTA 按钮 */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href="#waitlist"
            className="group bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base px-8 py-4 rounded-full hover:shadow-2xl hover:shadow-violet-500/30 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {HERO_CTA_PRIMARY}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
          <a
            href="#products"
            className="border border-slate-700 text-slate-300 font-medium text-base px-8 py-4 rounded-full hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>▶</span> {HERO_CTA_SECONDARY}
          </a>
        </div>

        {/* 统计数据 */}
        <div
          className={`mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto transition-all duration-700 delay-400 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="text-center">
            <div className="text-4xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-1">
              10K+
            </div>
            <div className="text-slate-500 text-sm">任务完成</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-1">
              99%
            </div>
            <div className="text-slate-500 text-sm">客户满意</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-1">
              24/7
            </div>
            <div className="text-slate-500 text-sm">全天候服务</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Products() {
  return (
    <section id="products" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              产品矩阵
            </span>
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">为不同场景打造的 AI 智能体产品线</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRODUCT_CARDS.map((product) => (
            <a
              key={product.name}
              href={product.link}
              target={product.link.startsWith("http") ? "_blank" : undefined}
              rel={product.link.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group relative bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8 hover:border-violet-500/50 transition-all duration-300 overflow-hidden"
            >
              {/* 状态标签 */}
              {product.status && (
                <span className="absolute top-6 right-6 text-xs font-medium px-3 py-1 rounded-full bg-slate-700/50 text-slate-300">
                  {product.status}
                </span>
              )}

              {/* 图标 */}
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                {product.icon}
              </div>

              {/* 内容 */}
              <h3 className="text-2xl font-bold mb-2 group-hover:text-violet-300 transition-colors">
                {product.name}
              </h3>
              <p className="text-violet-400 text-sm mb-3">{product.tagline}</p>
              <p className="text-slate-400 leading-relaxed">{product.desc}</p>

              {/* 箭头 */}
              <div className="mt-6 flex items-center gap-2 text-violet-400 text-sm font-medium">
                了解更多 <span className="group-hover:translate-x-2 transition-transform">→</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-slate-800/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            为什么选择 <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Nexify</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/30 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{feature.desc}</p>
              <div className="text-violet-400 font-semibold text-sm">{feature.stat}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            用户怎么说
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8"
            >
              <p className="text-slate-300 leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center font-bold">
                  {t.author[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.author}</div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-slate-800/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            简单透明的定价
          </h2>
          <p className="text-slate-400">选择适合你的方案</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-slate-900/50 border rounded-2xl p-8 ${
                plan.popular ? "border-violet-500" : "border-slate-700/50"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  最受欢迎
                </span>
              )}

              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-slate-400">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>

              <a
                href="#waitlist"
                className={`block text-center py-3 rounded-full font-semibold transition-colors ${
                  plan.popular
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setLoading(true);
    try {
      await supabase.from("waitlist").insert([{ email, source: "landing_page" }]);
      setSubmitted(true);
    } catch {}
    setLoading(false);
  };

  return (
    <section id="waitlist" className="py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-violet-900/50 to-indigo-900/50 border border-violet-500/20 rounded-3xl p-10 text-center">
          {!submitted ? (
            <>
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                加入等待名单
              </h2>
              <p className="text-slate-400 mb-8">
                成为首批用户，享受专属优惠
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="输入你的邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded-full px-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-4 rounded-full transition-colors disabled:opacity-50"
                >
                  {loading ? "提交中..." : "立即加入"}
                </button>
              </form>
            </>
          ) : (
            <div className="py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">加入成功！</h3>
              <p className="text-slate-400">我们会在产品上线时第一时间通知你</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-sm">
            N
          </div>
          <span className="font-bold">Nexify</span>
        </div>
        <p className="text-slate-500 text-sm">© 2026 Nexify · 让 AI 为你工作</p>
      </div>
    </footer>
  );
}

// ============================================================
// App
// ============================================================

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <Navbar />
      <Hero />
      <Products />
      <Features />
      <Testimonials />
      <Pricing />
      <Waitlist />
      <Footer />
    </div>
  );
}
