# Supabase Waitlist 实施文档

> 杭州市上城区乐友信息服务工作室 Landing Page Waitlist 系统技术方案 v1.0
> 最后更新：2026-04-06

---

## 1. 系统概述

Waitlist 系统用于收集早期用户，支持邀请裂变机制，为产品发布积累种子用户。

**核心功能**：
- 用户注册 waitlist
- 邀请码生成与追踪
- 邀请排行榜
- 邮件通知

---

## 2. Supabase 项目初始化步骤

### 2.1 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: `nexify-waitlist`
   - **Database Password**: [生成强密码并保存]
   - **Region**: Northeast Asia (Tokyo) - 最近区域
4. 等待项目初始化（约 2 分钟）

### 2.2 获取 API 密钥

进入 Settings → API，获取：
- **Project URL**: `https://xxxxx.supabase.co`
- **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`
- **service_role key**: [仅服务端使用，需保密]

### 2.3 配置环境变量

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6... # 服务端专用
```

---

## 3. 数据库 Schema

### 3.1 Waitlist 表设计

```sql
-- 创建 waitlist 表
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by UUID REFERENCES waitlist(id),
  referral_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'converted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 创建索引
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_referral_code ON waitlist(referral_code);
CREATE INDEX idx_waitlist_referral_count ON waitlist(referral_count DESC);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 3.2 邀请记录表（可选，用于详细追踪）

```sql
-- 邀请关系表
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES waitlist(id) NOT NULL,
  referee_id UUID REFERENCES waitlist(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
```

### 3.3 邀请码生成函数

```sql
-- 生成唯一邀请码的函数
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 排除易混淆字符
  code VARCHAR(20);
  exists_flag BOOLEAN;
BEGIN
  LOOP
    -- 生成 6 位随机码
    code := 'NX' || '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- 检查唯一性
    SELECT EXISTS(SELECT 1 FROM waitlist WHERE referral_code = code) INTO exists_flag;
    
    IF NOT exists_flag THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 在插入时自动生成邀请码
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_referral_code_trigger
  BEFORE INSERT ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();
```

### 3.4 Row Level Security (RLS) 策略

```sql
-- 启用 RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入（注册）
CREATE POLICY "Allow anonymous insert" ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- 用户只能查看自己的记录
CREATE POLICY "Users can view own data" ON waitlist
  FOR SELECT
  USING (email = auth.email());

-- 允许公开查询（排行榜，脱敏）
CREATE POLICY "Public leaderboard view" ON waitlist
  FOR SELECT
  USING (true);

-- 更新策略（仅服务端）
CREATE POLICY "Service role can update" ON waitlist
  FOR UPDATE
  USING (auth.role() = 'service_role');
```

---

## 4. 前端接入代码示例

### 4.1 安装 Supabase Client

```bash
npm install @supabase/supabase-js
# 或
pnpm add @supabase/supabase-js
```

### 4.2 创建 Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 服务端 client（用于管理操作）
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

### 4.3 Waitlist 注册组件

```tsx
// components/WaitlistForm.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface WaitlistFormProps {
  referralCode?: string // 从 URL 参数获取
}

export default function WaitlistForm({ referralCode }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [myReferralCode, setMyReferralCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. 检查邮箱是否已存在
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id, referral_code')
        .eq('email', email)
        .single()

      if (existing) {
        setMyReferralCode(existing.referral_code)
        setSuccess(true)
        return
      }

      // 2. 创建新用户
      const { data, error: insertError } = await supabase
        .from('waitlist')
        .insert({
          email,
          name: name || null,
          referred_by: referralCode || null,
        })
        .select('referral_code')
        .single()

      if (insertError) throw insertError

      // 3. 更新推荐人的邀请计数
      if (referralCode) {
        await supabase.rpc('increment_referral_count', {
          referrer_code: referralCode,
        })
      }

      setMyReferralCode(data.referral_code)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">🎉 注册成功！</h3>
        <p className="text-gray-600 mb-4">你已加入 Waitlist</p>
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">你的专属邀请码</p>
          <p className="text-2xl font-mono font-bold">{myReferralCode}</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(
            `${window.location.origin}?ref=${myReferralCode}`
          )}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          复制邀请链接
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="姓名（可选）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <input
          type="email"
          required
          placeholder="邮箱地址"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? '注册中...' : '加入 Waitlist'}
      </button>
    </form>
  )
}
```

### 4.4 排行榜组件

```tsx
// components/Leaderboard.tsx
import { supabase } from '@/lib/supabase'

interface LeaderboardEntry {
  id: string
  name: string
  referral_count: number
}

export default async function Leaderboard() {
  const { data: topUsers } = await supabase
    .from('waitlist')
    .select('id, name, referral_count')
    .order('referral_count', { ascending: false })
    .limit(10)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4">🏆 邀请排行榜</h3>
      <ol className="space-y-3">
        {topUsers?.map((user, index) => (
          <li key={user.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-sm">
                {index + 1}
              </span>
              <span>{user.name || '匿名用户'}</span>
            </div>
            <span className="font-bold text-blue-600">
              {user.referral_count} 邀请
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

---

## 5. 邀请裂变机制实现逻辑

### 5.1 奖励机制设计

| 邀请人数 | 奖励 |
|----------|------|
| 1 人 | 优先体验资格 |
| 3 人 | 高级功能解锁 |
| 5 人 | VIP 会员 1 个月 |
| 10 人 | 终身 VIP + 周边 |

### 5.2 后端逻辑（Supabase RPC）

```sql
-- 增加邀请计数
CREATE OR REPLACE FUNCTION increment_referral_count(referrer_code VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE waitlist
  SET referral_count = referral_count + 1
  WHERE referral_code = referrer_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户排名
CREATE OR REPLACE FUNCTION get_user_rank(user_id UUID)
RETURNS INTEGER AS $$
SELECT rank::INTEGER FROM (
  SELECT id, RANK() OVER (ORDER BY referral_count DESC) as rank
  FROM waitlist
) ranked
WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 获取邀请统计
CREATE OR REPLACE FUNCTION get_referral_stats(user_email VARCHAR)
RETURNS TABLE (
  total_referrals INTEGER,
  rank INTEGER,
  next_reward_level INTEGER
) AS $$
WITH stats AS (
  SELECT 
    w.referral_count,
    (SELECT COUNT(*) + 1 FROM waitlist WHERE referral_count > w.referral_count) as user_rank
  FROM waitlist w
  WHERE w.email = user_email
)
SELECT 
  referral_count as total_referrals,
  user_rank as rank,
  CASE 
    WHEN referral_count < 3 THEN 3
    WHEN referral_count < 5 THEN 5
    WHEN referral_count < 10 THEN 10
    ELSE NULL
  END as next_reward_level
FROM stats;
$$ LANGUAGE sql SECURITY DEFINER;
```

### 5.3 邀请链接追踪流程

```
用户 A 分享链接
    ↓
https://nexify.ai?ref=NXABC123
    ↓
新用户 B 访问页面
    ↓
前端读取 URL 参数 ref=NXABC123
    ↓
用户 B 注册时带上 referred_by 参数
    ↓
后端验证 NXABC123 存在 → 创建关联
    ↓
触发 increment_referral_count
    ↓
用户 A 的 referral_count +1
```

### 5.4 防作弊机制

1. **邮箱验证**
   - 发送验证邮件确认邮箱真实性
   - 使用 Supabase Auth 内置验证

2. **频率限制**
   ```typescript
   // 中间件或 API 路由中实现
   import { Ratelimit } from '@upstash/ratelimit'
   import { Redis } from '@upstash/redis'
   
   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(3, '1 m'), // 每分钟 3 次
   })
   
   // 在注册前检查
   const { success } = await ratelimit.limit(ip)
   if (!success) {
     return { error: '请求过于频繁' }
   }
   ```

3. **IP 限制**
   - 同一 IP 短时间内多次注册触发审核
   - 记录 IP 到 metadata 字段

4. **邀请关系验证**
   - 不能邀请自己
   - 检测异常邀请模式（如短时间内大量邀请）

---

## 6. 邮件通知（可选）

### 6.1 使用 Supabase 内置邮件

```sql
-- 创建邮件发送函数（需要在 Supabase Dashboard 配置邮件模板）
CREATE OR REPLACE FUNCTION send_welcome_email(user_email VARCHAR, user_name VARCHAR, referral_code VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Supabase 会自动处理邮件发送
  -- 需要在 Dashboard → Auth → Email Templates 配置模板
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails', -- 或其他邮件服务
    headers := '{"Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'from', '杭州市上城区乐友信息服务工作室 <hello@nexify.ai>',
      'to', user_email,
      'subject', '欢迎加入 杭州市上城区乐友信息服务工作室 Waitlist!',
      'html', '<h1>Hi ' || COALESCE(user_name, '朋友') || '!</h1>
               <p>你的邀请码: <strong>' || referral_code || '</strong></p>'
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 推荐方案：使用 Resend + React Email

```typescript
// lib/email.ts
import Resend from 'resend'
import WelcomeEmail from '@/emails/Welcome'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(
  email: string,
  name: string,
  referralCode: string
) {
  await resend.emails.send({
    from: '杭州市上城区乐友信息服务工作室 <hello@nexify.ai>',
    to: email,
    subject: '欢迎加入 杭州市上城区乐友信息服务工作室 Waitlist!',
    react: WelcomeEmail({ name, referralCode }),
  })
}
```

---

## 7. 部署清单

### 7.1 Supabase 配置清单

- [ ] 创建项目
- [ ] 执行 SQL Schema
- [ ] 配置 RLS 策略
- [ ] 设置邮件模板
- [ ] 配置自定义域名（可选）
- [ ] 备份策略设置

### 7.2 前端配置清单

- [ ] 安装 `@supabase/supabase-js`
- [ ] 配置环境变量
- [ ] 实现 WaitlistForm 组件
- [ ] 实现排行榜组件
- [ ] 添加防作弊中间件
- [ ] 测试邀请裂变流程

### 7.3 监控告警

- [ ] 配置 Supabase 日志监控
- [ ] 设置异常注册告警
- [ ] 邮件发送失败告警

---

## 附录

### A. 完整 SQL Schema 文件

见 `supabase/schema.sql`（可单独创建）

### B. API 接口文档

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/waitlist` | POST | 注册 waitlist |
| `/api/waitlist/rank` | GET | 获取用户排名 |
| `/api/waitlist/leaderboard` | GET | 获取排行榜 |

---

> 文档维护：杭州市上城区乐友信息服务工作室 CTO
> 版本：v1.0 | 2026-04-06
