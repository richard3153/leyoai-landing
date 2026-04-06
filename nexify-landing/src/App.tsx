import { useState } from "react";
import { supabase } from "./lib/supabase";

const services = [
  {
    icon: "◈",
    title: "视频剪辑",
    desc: "短视频、长视频、AI字幕、精彩片段——任何风格，任何平台。",
  },
  {
    icon: "◉",
    title: "AI自动化",
    desc: "工作流、智能体、集成。如果能自动化，我们就自动化。",
  },
  {
    icon: "◎",
    title: "创意制作",
    desc: "广告、内容、演示文稿、视觉素材。专业级输出。",
  },
  {
    icon: "◇",
    title: "研究与整合",
    desc: "深度调研、竞品分析、数据整合——任何研究任务。",
  },
  {
    icon: "◫",
    title: "软件开发",
    desc: "构建工具、脚本、应用、集成。从想法到产品。",
  },
  {
    icon: "◰",
    title: "其他一切",
    desc: "如果你能描述，我们就能做。没有太奇怪或太大的任务。",
  },
];

const testimonials = [
  {
    quote:
      "我让他们一周内剪辑50个YouTube短视频。他们3天就完成了。不可思议。",
    name: "Marcus T.",
    role: "YouTube创作者，240万订阅",
  },
  {
    quote:
      "杭州市上城区乐友信息服务工作室自动化了我们整个客户入职流程。原本需要4小时，现在只需8分钟。",
    name: "Priya S.",
    role: "B2B SaaS创始人",
  },
  {
    quote:
      "他们把原始产品演示变成了电影级发布视频。感觉就像随时待命的整个工作室。",
    name: "Jake W.",
    role: "独立开发者",
  },
];

export default function App() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // 从 URL 获取邀请码
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("请输入有效的邮箱地址。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 插入到 Supabase
      const { data, error: supabaseError } = await supabase
        .from("waitlist")
        .insert([
          {
            email,
            referred_by: refFromUrl || null,
            source: "landing_page",
          },
        ])
        .select("referral_code")
        .single();

      if (supabaseError) {
        // 检查是否是重复邮箱错误
        if (supabaseError.code === "23505") {
          setError("此邮箱已在等待名单中！");
        } else {
          setError("出了点问题，请重试。");
          console.error("Supabase error:", supabaseError);
        }
        setLoading(false);
        return;
      }

      // 成功
      setReferralCode(data.referral_code);
      setSubmitted(true);

    } catch (err) {
      console.error("Error:", err);
      setError("出了点问题，请重试。");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-2xl font-bold tracking-tighter">乐</span>
            <span className="text-xl font-black tracking-tighter">乐友信息</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#services" className="text-white/50 hover:text-white text-sm transition-colors hidden sm:block">
              服务
            </a>
            <a href="#how" className="text-white/50 hover:text-white text-sm transition-colors hidden sm:block">
              工作流程
            </a>
            <a href="#waitlist" className="bg-blue-500 hover:bg-blue-400 text-black font-bold text-sm px-5 py-2 transition-colors">
              加入等待名单
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-white/60 text-xs tracking-wider uppercase">即将上线</span>
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.88] mb-8">
              万事皆可<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                使命必达。
              </span>
            </h1>
            <p className="text-white/50 text-lg sm:text-xl leading-relaxed max-w-2xl mb-12">
              一个服务，任何任务。视频剪辑、AI自动化、创意制作、开发工作——如果你能描述，我们就能实现。无限可能，不设门槛。
            </p>
            <div className="flex flex-col sm:flex-row gap-4" id="waitlist">
              <a
                href="#waitlist-form"
                className="bg-white text-black font-black text-base px-8 py-4 hover:bg-blue-400 transition-colors text-center"
              >
                抢先体验 ↓
              </a>
              <a
                href="#services"
                className="border border-white/20 text-white/70 font-bold text-base px-8 py-4 hover:border-white/50 hover:text-white transition-colors text-center"
              >
                了解我们的服务
              </a>
            </div>
          </div>

          {/* Decorative grid */}
          <div className="mt-24 grid grid-cols-3 gap-px bg-white/5 border border-white/5">
            {["500+ 任务完成", "平均24小时交付", "4.9 / 5 评分"].map((stat, i) => (
              <div key={i} className="bg-[#0d0d0d] p-8 text-center">
                <div className="text-3xl font-black tracking-tight mb-1">
                  {["500+", "< 24h", "4.9"][i]}
                </div>
                <div className="text-white/40 text-xs tracking-wider uppercase">{stat.split(" ")[0] + " " + stat.split(" ").slice(1).join(" ")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="border-y border-white/5 overflow-hidden py-5 bg-[#0d0d0d]">
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="flex gap-12 text-white/20 text-sm tracking-[0.3em] uppercase font-medium">
              <span>视频剪辑</span><span>×</span>
              <span>AI自动化</span><span>×</span>
              <span>创意制作</span><span>×</span>
              <span>研究</span><span>×</span>
              <span>软件开发</span><span>×</span>
              <span>其他一切</span><span>×</span>
            </span>
          ))}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-blue-400 text-xs tracking-[0.3em] uppercase font-medium mb-4">我们的服务</p>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">
              没有任务<br />太大或太奇怪。
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {services.map((s, i) => (
              <div
                key={i}
                className="bg-[#0d0d0d] p-10 group hover:bg-[#111] transition-colors cursor-default"
              >
                <div className="text-blue-400 text-3xl mb-6">{s.icon}</div>
                <h3 className="text-white font-black text-lg mb-3 tracking-tight">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-32 px-6 bg-[#0d0d0d] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-blue-400 text-xs tracking-[0.3em] uppercase font-medium mb-4">工作流程</p>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">
              三步搞定。<br />零阻力。
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 gap-px bg-white/5">
            {[
              {
                num: "01",
                title: "描述你的任务",
                desc: "告诉我们你需要什么。详细或粗略都可以。没有表单，没有下拉菜单——直接说。",
              },
              {
                num: "02",
                title: "我们匹配并执行",
                desc: "我们的团队和AI系统开始工作。你会收到更新、预览，全程直接沟通。",
              },
              {
                num: "03",
                title: "审阅并迭代",
                desc: "直到满意为止。快速修改，无限反馈循环，直到你100%满意。",
              },
            ].map((step, i) => (
              <div key={i} className="bg-[#0d0d0d] p-10">
                <div className="text-white/10 text-7xl font-black tracking-tighter mb-6">{step.num}</div>
                <h3 className="text-white font-black text-xl mb-3">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-400 text-xs tracking-[0.3em] uppercase font-medium mb-12">早期用户反馈</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="border border-white/10 p-8 hover:border-blue-500/30 transition-colors"
              >
                <div className="text-blue-400 text-2xl mb-4">"</div>
                <p className="text-white/70 text-sm leading-relaxed mb-6">{t.quote}</p>
                <div>
                  <div className="text-white font-bold text-sm">{t.name}</div>
                  <div className="text-white/30 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist-form" className="py-40 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 border border-blue-500/20 rounded-full px-4 py-1.5 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span className="text-blue-400 text-xs tracking-wider uppercase">等待名单开放</span>
            </div>
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter mb-6">
              抢先体验。<br />无所不能。
            </h2>
            <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
              加入等待名单，抢先体验 + 首单8折优惠。绝不发送垃圾邮件，随时退订。
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 px-5 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                  {error && (
                    <p className="absolute -bottom-6 left-0 text-red-400 text-xs">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-400 text-black font-black text-sm px-8 py-4 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "加入中..." : "加入等待名单"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-blue-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-bold">你已成功加入！🎉</p>
                <p className="text-white/40 text-sm">开放时会联系你。</p>
                
                {referralCode && (
                  <div className="mt-4 p-4 bg-white/5 border border-blue-500/20 rounded-lg w-full max-w-md">
                    <p className="text-white/60 text-xs mb-2">你的邀请码：</p>
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-blue-400 font-mono font-bold text-lg">{referralCode}</code>
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}?ref=${referralCode}`;
                          navigator.clipboard.writeText(shareUrl);
                        }}
                        className="text-white/40 hover:text-white text-xs px-3 py-1 border border-white/20 rounded hover:border-white/40 transition-colors"
                      >
                        复制链接
                      </button>
                    </div>
                    <p className="text-white/30 text-xs mt-2">分享此链接获得奖励！</p>
                  </div>
                )}
              </div>
            )}

            <p className="text-white/20 text-xs mt-8">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="inline-block w-2 h-2 rounded-full bg-white/10 mr-2 mb-2 align-middle" />
              ))}
              已有847人加入等待名单
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xl font-bold">乐</span>
            <span className="font-black tracking-tighter uppercase text-sm">乐友信息</span>
          </div>
          <p className="text-white/20 text-xs">© 2026 杭州市上城区乐友信息服务工作室。保留所有权利。</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
