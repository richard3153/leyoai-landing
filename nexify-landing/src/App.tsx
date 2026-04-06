import { useState } from "react";
import { supabase } from "./lib/supabase";

const services = [
  {
    icon: "◈",
    title: "Video Editing",
    desc: "Short-form, long-form, AI captions, highlights — any style, any platform.",
  },
  {
    icon: "◉",
    title: "AI Automation",
    desc: "Workflows, agents, integrations. If it can be automated, we automate it.",
  },
  {
    icon: "◎",
    title: "Creative Production",
    desc: "Ads, content, presentations, visual assets. Production-quality output.",
  },
  {
    icon: "◇",
    title: "Research & Synthesis",
    desc: "Deep dives, competitive analysis, data synthesis — any research task.",
  },
  {
    icon: "◫",
    title: "Software & Dev",
    desc: "Build tools, scripts, apps, integrations. Ship from idea to product.",
  },
  {
    icon: "◰",
    title: "Everything Else",
    desc: "If you can describe it, we can do it. No task too weird or too big.",
  },
];

const testimonials = [
  {
    quote:
      "I asked them to edit 50 YouTube shorts in a week. They delivered in 3 days. Unreal.",
    name: "Marcus T.",
    role: "YouTube Creator, 2.4M subs",
  },
  {
    quote:
      "Nexify automated our entire customer onboarding flow. What used to take 4 hours now takes 8 minutes.",
    name: "Priya S.",
    role: "Founder, B2B SaaS",
  },
  {
    quote:
      "They turned a raw product demo into a cinematic launch video. Felt like having a whole studio on speed dial.",
    name: "Jake W.",
    role: "Indie Hacker",
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
      setError("Please enter a valid email address.");
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
          setError("This email is already on the waitlist!");
        } else {
          setError("Something went wrong. Please try again.");
          console.error("Supabase error:", supabaseError);
        }
        setLoading(false);
        return;
      }

      // 成功
      setReferralCode(data.referral_code);
      setSubmitted(true);
    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-2xl font-bold tracking-tighter">N</span>
            <span className="text-xl font-black tracking-tighter uppercase">Nexify</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#services" className="text-white/50 hover:text-white text-sm transition-colors hidden sm:block">
              Services
            </a>
            <a href="#how" className="text-white/50 hover:text-white text-sm transition-colors hidden sm:block">
              How It Works
            </a>
            <a href="#waitlist" className="bg-blue-500 hover:bg-blue-400 text-black font-bold text-sm px-5 py-2 transition-colors">
              Join Waitlist
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
              <span className="text-white/60 text-xs tracking-wider uppercase">Launching Soon</span>
            </div>
            <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.88] mb-8">
              Anything<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                Possible.
              </span>
            </h1>
            <p className="text-white/50 text-lg sm:text-xl leading-relaxed max-w-2xl mb-12">
              One service. Any task. Video editing, AI automation, creative production, dev work — if you can describe it, we make it happen. No limits, no gatekeeping.
            </p>
            <div className="flex flex-col sm:flex-row gap-4" id="waitlist">
              <a
                href="#waitlist-form"
                className="bg-white text-black font-black text-base px-8 py-4 hover:bg-blue-400 transition-colors text-center"
              >
                Get Early Access ↓
              </a>
              <a
                href="#services"
                className="border border-white/20 text-white/70 font-bold text-base px-8 py-4 hover:border-white/50 hover:text-white transition-colors text-center"
              >
                See What We Do
              </a>
            </div>
          </div>

          {/* Decorative grid */}
          <div className="mt-24 grid grid-cols-3 gap-px bg-white/5 border border-white/5">
            {["500+ Tasks Completed", "Avg. 24h Delivery", "4.9 / 5 Rating"].map((stat, i) => (
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
              <span>Video Editing</span><span>×</span>
              <span>AI Automation</span><span>×</span>
              <span>Creative Production</span><span>×</span>
              <span>Research</span><span>×</span>
              <span>Software Dev</span><span>×</span>
              <span>Everything Else</span><span>×</span>
            </span>
          ))}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-blue-400 text-xs tracking-[0.3em] uppercase font-medium mb-4">What We Do</p>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">
              No task is<br />too big or too weird.
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
            <p className="text-blue-400 text-xs tracking-[0.3em] uppercase font-medium mb-4">The Process</p>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">
              Three steps.<br />Zero friction.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 gap-px bg-white/5">
            {[
              {
                num: "01",
                title: "Describe Your Task",
                desc: "Tell us what you need. Be as detailed or as loose as you want. No forms, no dropdowns — just talk.",
              },
              {
                num: "02",
                title: "We Match & Execute",
                desc: "Our team and AI systems get to work. You'll get updates, previews, and direct communication throughout.",
              },
              {
                num: "03",
                title: "Review & Iterate",
                desc: "We don't stop until it's right. Fast revisions, unlimited feedback cycles until you're 100% satisfied.",
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
          <p className="text-blue-400 text-xs tracking-[0.3em] uppercase font-medium mb-12">Early Access Voices</p>
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
              <span className="text-blue-400 text-xs tracking-wider uppercase">Waitlist Open</span>
            </div>
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter mb-6">
              Be first.<br />Do anything.
            </h2>
            <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
              Join the waitlist and get priority access + 20% off your first task. No spam, ever. Unsubscribe anytime.
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
                  {loading ? "Joining..." : "Join Waitlist"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-blue-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-bold">You're on the list! 🎉</p>
                <p className="text-white/40 text-sm">We'll reach out when we open the doors.</p>
                
                {referralCode && (
                  <div className="mt-4 p-4 bg-white/5 border border-blue-500/20 rounded-lg w-full max-w-md">
                    <p className="text-white/60 text-xs mb-2">Your referral code:</p>
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-blue-400 font-mono font-bold text-lg">{referralCode}</code>
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}?ref=${referralCode}`;
                          navigator.clipboard.writeText(shareUrl);
                        }}
                        className="text-white/40 hover:text-white text-xs px-3 py-1 border border-white/20 rounded hover:border-white/40 transition-colors"
                      >
                        Copy Link
                      </button>
                    </div>
                    <p className="text-white/30 text-xs mt-2">Share this link to earn rewards!</p>
                  </div>
                )}
              </div>
            )}

            <p className="text-white/20 text-xs mt-8">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="inline-block w-2 h-2 rounded-full bg-white/10 mr-2 mb-2 align-middle" />
              ))}
              847 people already on the waitlist
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xl font-bold">N</span>
            <span className="font-black tracking-tighter uppercase text-sm">Nexify</span>
          </div>
          <p className="text-white/20 text-xs">© 2026 Nexify. All rights reserved.</p>
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
