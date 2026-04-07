import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

// ============================================================
// 常量数据
// ============================================================

const NAV_LINKS = [
  { label: "服务", href: "#services" },
  { label: "工作原理", href: "#how" },
  { label: "用户评价", href: "#testimonials" },
];

const STATS = [
  { num: "500+", label: "任务完成" },
  { num: "24h", label: "平均交付" },
  { num: "4.9★", label: "用户评分" },
];

const SERVICES = [
  {
    icon: "🛡️",
    title: "AI 安全助手",
    desc: "中英双语安全问答，覆盖9大安全领域",
    gradient: "from-green-500 to-teal-500",
    badge: "新品",
    link: "https://huggingface.co/spaces/FFZwai/nexify-safety-assistant",
  },
  {
    icon: "🎬",
    title: "视频剪辑",
    desc: "短视频、长视频、AI字幕，一站式制作",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: "🤖",
    title: "AI 自动化",
    desc: "工作流编排，智能体协作，全自动执行",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: "🎨",
    title: "创意设计",
    desc: "广告物料、品牌视觉、演示文稿",
    gradient: "from-orange-500 to-yellow-500",
  },
  {
    icon: "📊",
    title: "数据分析",
    desc: "深度调研、竞品分析、洞察报告",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: "💻",
    title: "软件开发",
    desc: "应用开发、工具构建、API 集成",
    gradient: "from-indigo-500 to-purple-500",
  },
];

const HOW_STEPS = [
  {
    step: "01",
    title: "说出你的需求",
    desc: "用自然语言描述你想要的结果，无需复杂表单。",
  },
  {
    step: "02",
    title: "AI 智能执行",
    desc: "系统自动规划最优执行路径，高效准确地完成任务。",
  },
  {
    step: "03",
    title: "快速交付成果",
    desc: "获得专业级成果，如有需要随时调整，直到你满意为止。",
  },
];

const TESTIMONIALS = [
  {
    avatar: "👨‍💼",
    quote: "我让他们一周内剪辑50个YouTube短视频。他们3天就完成了，效率惊人！",
    name: "Marcus",
    title: "YouTube创作者 · 240万订阅",
  },
  {
    avatar: "👩‍💻",
    quote: "自动化了我们的客户入职流程，原本4小时的工作现在只要8分钟。",
    name: "Priya",
    title: "B2B SaaS创始人",
  },
  {
    avatar: "👨‍🎨",
    quote: "把产品演示变成了电影级发布视频，整个团队都惊呆了。",
    name: "Jake",
    title: "独立开发者",
  },
];

const WAITLIST_META = {
  badge: "等待名单开放中",
  placeholder: "输入你的邮箱地址",
  buttonLoading: "加入中...",
  buttonDefault: "立即加入",
  successTitle: "恭喜加入成功！",
  successSubtitle: "开放时我们会第一时间通知你",
  referralLabel: "你的专属邀请码",
  copyButton: "复制链接",
  referralHint: "分享给朋友，双方都能获得奖励",
  footer: "© 2026 杭州市上城区乐友信息服务工作室 · 让 AI 服务每个人",
};

// ============================================================
// NavBar
// ============================================================
function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-purple-500/20">
            乐
          </div>
          <span className="text-lg font-bold tracking-tight">乐友信息</span>
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-white/50 hover:text-white text-sm transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="#waitlist"
          className="bg-white text-black font-semibold text-sm px-5 py-2 rounded-full hover:bg-purple-500 hover:text-white transition-all duration-200"
        >
          立即加入
        </a>
      </div>
    </nav>
  );
}

// ============================================================
// HeroSection
// ============================================================
function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative pt-36 pb-24 px-6">
      {/* 背景光晕 — 限制在 Hero 区域内 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" style={{ animation: "glow 4s ease-in-out infinite 1s" }} />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        {/* 主标题 */}
        <h1
          className={`text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-8 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            万事皆可
          </span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            使命必达
          </span>
        </h1>

        {/* 副标题 — 精简版 */}
        <p
          className={`text-base sm:text-lg text-white/40 max-w-xl mx-auto mb-14 leading-relaxed transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          一个平台，连接所有 AI 能力。说出你想要，结果即刻呈现。
        </p>

        {/* CTA 按钮组 */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <a
            href="#waitlist"
            className="group bg-white text-black font-bold text-base px-10 py-4 rounded-full hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            抢先体验
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
          <a
            href="https://huggingface.co/spaces/FFZwai/nexify-safety-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="group border border-purple-500/50 text-purple-400 font-bold text-base px-10 py-4 rounded-full hover:bg-purple-500/20 hover:border-purple-500 transition-all duration-300 flex items-center justify-center gap-2"
          >
            🛡️ 在线演示
            <span className="group-hover:translate-x-1 transition-transform duration-200">↗</span>
          </a>
        </div>
      </div>

      {/* 数据统计 */}
      <div
        className={`max-w-3xl mx-auto mt-20 grid grid-cols-3 gap-4 transition-all duration-700 delay-300 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:bg-white/8 transition-colors"
          >
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              {stat.num}
            </div>
            <div className="text-white/40 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// ServicesSection
// ============================================================
function ServicesSection() {
  return (
    <section id="services" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题区 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              服务一览
            </span>
          </h2>
          <p className="text-white/40 text-base max-w-md mx-auto">
            覆盖你能想到的所有服务类型，用 AI 重新定义效率
          </p>
        </div>

        {/* 服务卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s) => (
            <a
              key={s.title}
              href={s.link || "#services"}
              target={s.link ? "_blank" : undefined}
              rel={s.link ? "noopener noreferrer" : undefined}
              className="group bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer relative"
            >
              {s.badge && (
                <span className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {s.badge}
                </span>
              )}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
              >
                {s.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-purple-300 transition-colors flex items-center gap-2">
                {s.title}
                {s.link && <span className="text-xs text-white/40 group-hover:translate-x-1 transition-transform">↗</span>}
              </h3>
              <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HowItWorksSection
// ============================================================
function HowItWorksSection() {
  return (
    <section
      id="how"
      className="py-28 px-6 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent"
    >
      <div className="max-w-6xl mx-auto">
        {/* 标题区 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            三步，<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">零门槛</span>
          </h2>
          <p className="text-white/40 text-base">简单到令人惊叹</p>
        </div>

        {/* 步骤卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_STEPS.map((step, i) => (
            <div key={step.step} className="relative">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-10 h-full">
                <div className="text-7xl font-black text-white/5 mb-4 select-none" aria-hidden>
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-white/45 leading-relaxed text-sm">{step.desc}</p>
              </div>
              {i < 2 && (
                <div
                  className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 text-3xl text-purple-500/40"
                  aria-hidden
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TestimonialsSection
// ============================================================
function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题区 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              用户评价
            </span>
          </h2>
          <p className="text-white/40 text-base">来自真实用户的反馈</p>
        </div>

        {/* 评价卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
            >
              <div className="text-4xl mb-5">{t.avatar}</div>
              <p className="text-white/60 leading-relaxed mb-8 text-sm">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-white/30 text-xs">{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// WaitlistSection
// ============================================================
function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    setError("");

    const refFromUrl = new URLSearchParams(window.location.search).get("ref") || "";

    try {
      const { data, error: sbError } = await supabase
        .from("waitlist")
        .insert([{ email, referred_by: refFromUrl || null, source: "landing_page" }])
        .select("referral_code")
        .single();

      if (sbError) {
        setError(sbError.code === "23505" ? "此邮箱已在等待名单中" : "出了点问题，请重试");
        setLoading(false);
        return;
      }

      setReferralCode(data.referral_code);
      setSubmitted(true);
    } catch {
      setError("出了点问题，请重试");
    }
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${referralCode}`);
  };

  return (
    <section id="waitlist" className="py-36 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-white/5 border border-white/10 rounded-[2rem] p-10 sm:p-14 text-center backdrop-blur-xl overflow-hidden">
          {/* 光晕装饰 */}
          <div
            className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"
            aria-hidden
          />

          <div className="relative">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 text-sm font-medium">{WAITLIST_META.badge}</span>
            </div>

            {/* 标题 */}
            <h2 className="text-3xl sm:text-5xl font-black mb-5">
              成为<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">首批用户</span>
            </h2>

            {/* 描述 */}
            <p className="text-white/40 text-base mb-10 max-w-md mx-auto">
              抢先体验，享受首单 8 折优惠。邀请朋友加入，双方都能获得奖励。
            </p>

            {/* 表单 */}
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={WAITLIST_META.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-7 py-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-black font-bold px-8 py-4 rounded-full hover:bg-purple-500 hover:text-white transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? WAITLIST_META.buttonLoading : WAITLIST_META.buttonDefault}
                </button>
              </form>
            ) : (
              /* 成功状态 */
              <div className="bg-green-500/15 border border-green-500/30 rounded-3xl p-8">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎉</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{WAITLIST_META.successTitle}</h3>
                <p className="text-white/50 mb-6 text-sm">{WAITLIST_META.successSubtitle}</p>

                {referralCode && (
                  <div className="bg-white/10 rounded-2xl p-6">
                    <p className="text-white/40 text-sm mb-3">{WAITLIST_META.referralLabel}</p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <code className="text-xl font-mono font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        {referralCode}
                      </code>
                      <button
                        onClick={copyLink}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-full text-sm transition-colors"
                      >
                        {WAITLIST_META.copyButton}
                      </button>
                    </div>
                    <p className="text-white/25 text-xs mt-3">{WAITLIST_META.referralHint}</p>
                  </div>
                )}
              </div>
            )}

            {/* 错误提示 */}
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

            <p className="text-white/25 text-sm mt-8">
              已有 <span className="text-white/50 font-semibold">847</span> 人加入等待名单
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Footer
// ============================================================
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold">
            乐
          </div>
          <span className="text-base font-bold">乐友信息</span>
        </div>
        <p className="text-white/25 text-sm">{WAITLIST_META.footer}</p>
      </div>
    </footer>
  );
}

// ============================================================
// App
// ============================================================
export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans">
      <NavBar />
      <HeroSection />
      <ServicesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <WaitlistSection />
      <Footer />
    </div>
  );
}
