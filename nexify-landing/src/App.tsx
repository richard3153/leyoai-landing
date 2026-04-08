import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

// ============================================================
// Nexify MaaS 平台 - 杭州市上城区乐友信息服务工作室
// ============================================================

const COMPANY_NAME = "杭州市上城区乐友信息服务工作室（个体工商户）";
const BRAND_NAME = "Nexify";
const BRAND_TAGLINE = "Model as a Service — 让 AI 模型服务每个人";

// ============================================================
// 4大产品线
// ============================================================
const PRODUCTS = [
  {
    id: "cyber",
    name: "Cyber Model",
    nameCn: "网络安全模型",
    desc: "智能威胁检测、漏洞分析、安全合规检查，保障数字资产安全",
    icon: "🛡️",
    color: "from-green-500 to-emerald-600",
    badge: "已上线",
    badgeColor: "bg-green-500",
    features: ["威胁情报分析", "漏洞扫描检测", "合规自动审查", "应急响应建议"],
    link: "https://huggingface.co/spaces/FFZwai/nexify-safety-assistant",
  },
  {
    id: "video",
    name: "Video Model",
    nameCn: "视频生成模型",
    desc: "AI 驱动的视频创作、剪辑、特效自动化，让创意无限",
    icon: "🎬",
    color: "from-purple-500 to-violet-600",
    badge: "训练中",
    badgeColor: "bg-amber-500",
    features: ["智能剪辑", "特效生成", "字幕自动", "风格迁移"],
    link: null,
  },
  {
    id: "flow",
    name: "Flow Model",
    nameCn: "流程自动化模型",
    desc: "理解业务流程，自动化执行复杂任务，提升企业效率",
    icon: "⚙️",
    color: "from-blue-500 to-cyan-600",
    badge: "规划中",
    badgeColor: "bg-slate-500",
    features: ["流程编排", "任务调度", "跨系统协同", "智能决策"],
    link: null,
  },
  {
    id: "analytics",
    name: "Analytics Model",
    nameCn: "数据分析模型",
    desc: "深度数据分析、趋势预测、洞察报告，数据驱动决策",
    icon: "📊",
    color: "from-orange-500 to-red-500",
    badge: "规划中",
    badgeColor: "bg-slate-500",
    features: ["数据可视化", "趋势预测", "异常检测", "报告生成"],
    link: null,
  },
];

const STATS = [
  { label: "模型数量", value: "4+" },
  { label: "服务领域", value: "9+" },
  { label: "训练数据", value: "5000+" },
  { label: "服务客户", value: "100+" },
];

const NAV_ITEMS = [
  { label: "模型", href: "#products" },
  { label: "文档", href: "#docs" },
  { label: "定价", href: "#pricing" },
  { label: "关于", href: "#about" },
];

// ============================================================
// 定价方案
// ============================================================
const PRICING_PLANS = [
  {
    name: "免费版",
    price: "¥0",
    period: "永久",
    desc: "适合个人探索和学习",
    features: ["基础模型访问", "100次/日调用", "社区支持", "公开模型"],
    cta: "免费开始",
    highlight: false,
  },
  {
    name: "专业版",
    price: "¥199",
    period: "/月",
    desc: "适合开发者和创作者",
    features: ["全部模型访问", "无限调用", "优先推理", "邮件支持", "私有部署选项"],
    cta: "立即升级",
    highlight: true,
  },
  {
    name: "企业版",
    price: "¥1999",
    period: "/月",
    desc: "适合企业和团队",
    features: ["专业版全部功能", "专属模型定制", "SLA保障", "7×24支持", "私有化部署"],
    cta: "联系销售",
    highlight: false,
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
    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="text-xl font-bold text-green-700 mb-2">注册成功！</h3>
      <p className="text-green-600 text-sm">我们会在产品上线时第一时间通知你</p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email" placeholder="输入邮箱获取内测资格" value={email}
        onChange={e => setEmail(e.target.value)} disabled={loading}
        className="flex-1 px-5 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      />
      <button
        type="submit" disabled={loading}
        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap disabled:opacity-50"
      >
        {loading ? "提交中..." : "获取内测"}
      </button>
      {err && <p className="text-red-500 text-sm mt-1 text-center w-full">{err}</p>}
    </form>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── 顶部导航 ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Logo区 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              N
            </div>
            <div>
              <span className="font-bold text-base">{BRAND_NAME}</span>
              <span className="hidden sm:inline text-gray-400 text-xs ml-1.5">MaaS</span>
            </div>
          </div>

          {/* 导航 */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
                {item.label}
              </a>
            ))}
          </nav>

          {/* 右侧操作 */}
          <div className="flex items-center gap-3">
            <a href="#waitlist"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
              申请内测
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-20 pb-24">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-purple-200 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className={`inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {BRAND_TAGLINE}
          </div>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {BRAND_NAME}
            </span>
            <span className="text-gray-900 block mt-2 text-3xl sm:text-4xl lg:text-5xl">
              AI 模型即服务平台
            </span>
          </h1>
          <p className={`text-gray-500 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {COMPANY_NAME} 旗下品牌。专注 Cyber、Video、Flow、Analytics 四大垂直领域 AI 模型研发与服务，让 AI 技术真正赋能千行百业。
          </p>
          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <a href="#products" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 text-base">
              探索模型
            </a>
            <a href="#waitlist" className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition-all text-base">
              申请内测
            </a>
          </div>
        </div>
      </section>

      {/* ── 统计数据 ── */}
      <section className="bg-white border-y border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black text-indigo-600">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 四大产品线 ── */}
      <section id="products" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">四大垂直模型矩阵</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">深耕垂直领域，打造专业级 AI 模型，服务企业真实场景</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PRODUCTS.map(p => (
              <div key={p.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group">

                {/* 产品头部 */}
                <div className={`bg-gradient-to-r ${p.color} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                      {p.icon}
                    </div>
                    <span className={`${p.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-black mb-1">{p.name}</h3>
                  <p className="text-white/80 text-sm font-medium">{p.nameCn}</p>
                </div>

                {/* 产品详情 */}
                <div className="p-6">
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">{p.desc}</p>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {p.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:gap-3 transition-all">
                      立即体验 →
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-400 text-sm">
                      🔒 即将上线
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 为什么选择 Nexify ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">为什么选择 Nexify</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: "🎯", title: "垂直领域深度优化", desc: "不追求通用，专注细分领域。Cyber Model 专注安全、Video Model 专注创作，每个模型都是领域专家。" },
              { icon: "🚀", title: "极速部署，开箱即用", desc: "基于 Qwen/LLaMA 等顶级开源基座，LoRA 微调技术，30分钟即可上线专属模型。" },
              { icon: "💰", title: "零成本起步", desc: "使用 Colab 免费 GPU 训练、Kaggle 免费算力、Vercel 免费部署，零成本验证模型效果。" },
            ].map(item => (
              <div key={item.title} className="text-center">
                <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 定价 ── */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">简单透明的定价</h2>
            <p className="text-gray-500 text-base">无隐藏费用，按需付费</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRICING_PLANS.map(plan => (
              <div key={plan.name}
                className={`rounded-2xl border-2 p-8 transition-all ${plan.highlight ? "border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100" : "border-gray-100 bg-white"}`}>
                {plan.highlight && (
                  <div className="text-center mb-4">
                    <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">最受欢迎</span>
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="text-indigo-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="#waitlist"
                  className={`block text-center py-3.5 rounded-xl font-semibold text-sm transition-colors ${plan.highlight ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 等待名单 ── */}
      <section id="waitlist" className="py-24 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">抢先体验 Nexify</h2>
          <p className="text-indigo-100 text-base mb-10">填写邮箱，获取内测资格。我们会优先通知你每个模型的最新进展。</p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── 文档区 ── */}
      <section id="docs" className="py-16 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">快速开始</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Cyber Model 使用指南", icon: "📖", time: "5 分钟" },
              { title: "本地模型训练教程", icon: "🖥️", time: "10 分钟" },
              { title: "HuggingFace Space 部署", icon: "🚀", time: "5 分钟" },
              { title: "API 调用文档", icon: "🔌", time: "3 分钟" },
            ].map(doc => (
              <div key={doc.title}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer group">
                <span className="text-2xl">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700 transition-colors truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.time}</p>
                </div>
                <span className="text-gray-300 group-hover:text-indigo-400 transition-colors">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 页脚 ── */}
      <footer id="about" className="bg-gray-900 text-gray-400 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-12">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">N</div>
                <span className="font-bold text-white text-base">{BRAND_NAME}</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">{COMPANY_NAME} 旗下 AI 模型服务品牌，专注垂直领域模型研发与商业化。</p>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-4">产品</h4>
              <ul className="space-y-2.5 text-sm">
                {PRODUCTS.map(p => <li key={p.id}><span className="text-gray-500">{p.icon}</span> {p.nameCn}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-4">公司</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer">关于我们</li>
                <li className="hover:text-white transition-colors cursor-pointer">加入团队</li>
                <li className="hover:text-white transition-colors cursor-pointer">联系方式</li>
                <li className="hover:text-white transition-colors cursor-pointer">隐私政策</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <span>© 2026 {COMPANY_NAME}</span>
            <span>{BRAND_NAME} — 让 AI 模型服务每个人</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
