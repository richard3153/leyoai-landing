# Waitlist 技术方案

> 制定人：CTO  
> 版本：v1.0  
> 日期：2026-04-05

---

## 背景

当前 Nexify 落地页（React + Vite + TypeScript）无后端，无法收集和存储 waitlist 用户数据。
目标：在 1 周内上线可用 waitlist 功能，支撑 847 名等待用户的转化。

---

## 方案 A：自建

### 技术栈

| 组件 | 推荐选型 | 备选 |
|------|---------|------|
| 后端运行时 | Node.js + Express / Hono | Fastify |
| 数据库 | PostgreSQL (Supabase) | MySQL / SQLite |
| ORM | Prisma | Drizzle（更轻量） |
| 部署 | Vercel Functions / Railway | Fly.io |
| 前端集成 | 原生 Fetch 调用 API | React Query |

### 复杂度评估

```
开发时间：3-5 天（单人）
基础设施：需要配置数据库、API 部署、环境变量
维护成本：中等——需要手动管理 schema 变更、数据备份
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| ✅ 完全可控，无第三方依赖 | ❌ 需要自行处理数据存储、备份、安全 |
| ✅ 无供应商锁定（Vendor Lock-in） | ❌ 接入支付时需重新设计数据模型 |
| ✅ 未来扩展灵活（Webhook、自定义字段） | ❌ 需要 DevOps 能力（数据库运维） |
| ✅ 技术积累，团队成长 | ❌ 上线周期比方案 B 长 3-4 天 |
| ✅ 成本可预测（仅云服务费用） | ❌ 无开箱即用的增长工具（分析、邮件序列） |

### 数据库设计（最小可行）

```sql
CREATE TABLE waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  referred_by UUID,  -- 引荐人 ID
  position    SERIAL, -- 队列位置
  ip_hash     TEXT,   -- 防刷，轻量记录
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 防重复注册索引
CREATE UNIQUE INDEX waitlist_email_idx ON waitlist(email);
```

---

## 方案 B：第三方服务

### 推荐工具

#### 1. Supabase（最强推荐 ⭐⭐⭐）

```
类型：后端即服务（BaaS）+ 数据库
免费额度：500MB 数据库 + 每月 50,000 月活用户
官网：supabase.com
```

| 优点 | 缺点 |
|------|------|
| ✅ PostgreSQL 底层，SQL 能力完整 | ❌ 欧美服务，国内访问速度不稳定 |
| ✅ Auth + Database + Edge Functions 一体化 | ❌ 过度依赖单一供应商 |
| ✅ 实时订阅（Future-proof） | |
| ✅ 免费额度充足，Startup Plan $25/月起 | |
| ✅ 开源，可自托管 | |

#### 2. Firebase（Google）（次推荐）

```
类型：BaaS + Serverless
免费额度：每月 1GB 数据库 + 10GB 存储
```

| 优点 | 缺点 |
|------|------|
| ✅ 成熟度高，文档完善 | ❌ Google 生态绑定强 |
| ✅ Auth + Firestore + Functions 全家桶 | ❌ Firestore 定价复杂，量大了费用高 |
| ✅ 全球 CDN 加速 | ❌ 国内访问同样不稳定 |
| | ❌ 免费版限制多，超出后费用飙升 |

#### 3. Loops.so（专注邮件增长）

```
类型：邮件营销 + Waitlist 管理
免费额度：前 1000 名订阅用户免费
定位：配合自建后端使用，专门做 waitlist 邮件运营
```

| 优点 | 缺点 |
|------|------|
| ✅ 专为 waitlist 设计，开箱即用 | ❌ 仅邮件管理，不解决数据存储 |
| ✅ 内置邮件序列、A/B 测试 | ❌ 需要配合数据库使用 |
| ✅ 极简集成（1 个 API Key） | |

#### 4. Mailchimp / ConvertKit（邮件营销老牌）

```
适用场景：如果未来要做邮件列表运营
缺点：非专为 SaaS waitlist 设计，数据模型不匹配
建议：Waitlist 阶段不需要，上正式产品再接入
```

---

## 推荐方案及理由

### 🎯 最终推荐：方案 B + Supabase（核心），配合 Loops.so（邮件）

**理由：**

1. **速度优先**：当前最大风险是 847 名用户流失，自建需要 3-5 天，Supabase 接入仅需 **1-2 天**。速度是核心竞争力。

2. **成本最低**：Supabase 免费额度足够支撑到 1 万名 waitlist 用户。零基础设施成本。

3. **扩展路径清晰**：Supabase → 未来接 Auth → 接支付（Stripe）→ 接实时功能，一套体系贯穿始终。

4. **减少运维负担**：初创阶段团队应该把时间花在产品上，不是数据库运维。Supabase Managed PostgreSQL 替你做了这些。

5. **数据可迁移**：Supabase 基于标准 PostgreSQL，Schema 导出后随时可迁出自建，不存在供应商锁定。

### 实施路线图

```
Day 1：
  - 创建 Supabase 项目
  - 创建 waitlist 表（参考上面的 schema）
  - 在 Vite 项目中添加 @supabase/supabase-js
  - 实现 waitlist 表单提交 API 调用
  - 添加唯一性校验（同一邮箱不能重复注册）

Day 2：
  - 配置 RLS（行级安全策略）：公开写入，仅本人读取自己记录
  - 集成 Loops.so：在 Supabase 写入成功后，通过 Webhook 同步到 Loops
  - 前端优化：提交后显示队列位置（COUNT 查询）
  - 部署上线
```

### 快速接入代码示例（React + Supabase）

```tsx
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default supabase
```

```tsx
// WaitlistForm.tsx
import { useState } from 'react'
import supabase from '../lib/supabase'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ email, ip_hash: '' }]) // ip_hash 可后续补充
      .select('position')
      .single()

    if (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        setStatus('error')
        setMessage('这个邮箱已经注册过了 👋')
      } else {
        setStatus('error')
        setMessage('出了点问题，请稍后再试')
      }
    } else {
      setStatus('success')
      setMessage(`🎉 注册成功！你排在第 ${data.position} 位`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? '加入中...' : '加入等待名单'}
      </button>
      {message && <p>{message}</p>}
    </form>
  )
}
```

---

## 方案对比总结

| 维度 | 方案 A（自建） | 方案 B（Supabase） |
|------|---------------|-------------------|
| 上线时间 | 3-5 天 | **1-2 天** |
| 技术债 | 高（需维护数据库） | **低（托管服务）** |
| 扩展性 | 高（完全可控） | 高（标准 SQL） |
| 成本 | 低（$5-20/月） | **免费（<1万用户）** |
| 运维复杂度 | 中 | **低** |
| 数据控制权 | 完全 | 依赖 Supabase |
| 适合阶段 | 有明确定制需求 | **早期快速验证** |

---

## 决策

**建议：采用方案 B（Supabase）。**

理由已在上一节详述。核心逻辑：现在是速度竞赛，方案 B 在 **1/3 的时间内** 完成 **90% 的效果**，且未来可平滑迁移。

当出现以下情况时，应切换至自建：
- 用户量超过 10 万，Supabase 费用开始成为瓶颈
- 有明确的定制化需求（如内部 Referral 系统、积分体系）
- 团队具备专职 DevOps 能力

---

*待 CEO/产品负责人确认后执行*
