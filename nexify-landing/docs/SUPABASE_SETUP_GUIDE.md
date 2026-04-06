# Supabase 部署指南

本指南帮助你在 10 分钟内完成 杭州市上城区乐友信息服务工作室 Waitlist 系统的 Supabase 部署，成本 $0。

---

## 📋 前置条件

- 一个邮箱（用于注册 Supabase）
- 5-10 分钟时间

---

## Step 1: 注册 Supabase 免费账号

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 **"Start your project"** 按钮
3. 选择 **"Sign up with GitHub"** 或使用邮箱注册
4. 完成邮箱验证

**免费套餐包含：**
- 500MB 数据库存储
- 1GB 文件存储
- 50,000 月活用户
- 无需信用卡

---

## Step 2: 创建新项目

1. 登录后点击 **"New Project"**
2. 填写项目信息：
   - **Name**: `nexify-waitlist`
   - **Database Password**: 设置一个强密码（保存好，后面要用）
   - **Region**: 选择 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)` 以获得最佳延迟
3. 点击 **"Create new project"**
4. 等待约 2 分钟，项目初始化完成

---

## Step 3: 创建数据库表

1. 在项目仪表盘左侧菜单，点击 **"SQL Editor"**
2. 点击 **"New Query"**
3. 复制以下 SQL 语句并粘贴：

```sql
-- Waitlist 表
CREATE TABLE waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  referral_code VARCHAR(20) UNIQUE,
  referred_by VARCHAR(20),
  referral_count INTEGER DEFAULT 0,
  source VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引优化查询
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_referral_code ON waitlist(referral_code);

-- 生成邀请码函数
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'NX' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- 触发器：新用户自动生成邀请码
CREATE TRIGGER generate_code_on_insert
BEFORE INSERT ON waitlist
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();

-- 启用 Row Level Security (RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户插入数据（Waitlist 注册）
CREATE POLICY "Allow anonymous insert" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 允许公开读取（可选，用于显示邀请码）
CREATE POLICY "Allow public read" ON waitlist
  FOR SELECT
  TO public
  USING (true);
```

4. 点击 **"Run"** 执行 SQL
5. 看到 "Success. No rows returned" 表示创建成功

---

## Step 4: 获取 API 密钥

1. 在左侧菜单点击 **"Settings"**（齿轮图标）
2. 点击 **"API"**
3. 找到以下信息：
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **anon public key**: 一个很长的字符串，以 `eyJ` 开头

---

## Step 5: 配置环境变量

1. 在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入真实值：

```env
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ 安全提示：**
- `.env` 文件已添加到 `.gitignore`，不会被提交到 Git
- `anon key` 是公开密钥，可以安全地暴露在前端代码中
- 绝对不要泄露 `service_role key`（它有管理员权限）

---

## Step 6: 安装依赖并运行

```bash
# 安装 Supabase 客户端
npm install @supabase/supabase-js

# 启动开发服务器
npm run dev
```

---

## Step 7: 测试 Waitlist 功能

1. 打开浏览器访问 `http://localhost:5173`
2. 滚动到 Waitlist 表单
3. 输入测试邮箱并提交
4. 检查 Supabase 后台：
   - 左侧菜单 → **"Table Editor"** → **"waitlist"**
   - 应该能看到新插入的记录，包含自动生成的邀请码

---

## 📊 查看数据

在 Supabase 后台：

1. **Table Editor** → 查看所有 Waitlist 用户
2. **SQL Editor** → 运行查询，例如：

```sql
-- 查看注册统计
SELECT 
  DATE(created_at) as date,
  COUNT(*) as signups
FROM waitlist
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 查看邀请排行榜
SELECT 
  referral_code,
  referral_count,
  email
FROM waitlist
WHERE referral_count > 0
ORDER BY referral_count DESC
LIMIT 10;
```

---

## 🔧 高级配置（可选）

### 邮件通知

Supabase 免费版支持发送邮件通知：

1. Settings → **Authentication** → **Email**
2. 启用 **"Enable email confirmations"**（可选）

### 自定义域名

1. Settings → **Custom Domains**
2. 需要升级到 Pro 计划（$25/月）

### 数据库备份

免费版每天自动备份，保留 7 天。

---

## 🚨 常见问题

### Q: 提交时报错 "Failed to fetch"

**解决方案：**
1. 检查 `.env` 文件是否正确配置
2. 确保 VITE_SUPABASE_URL 格式正确（包含 `https://`）
3. 重启开发服务器：`npm run dev`

### Q: 邮箱重复提交报错

这是正常的，因为 email 字段设置了 `UNIQUE` 约束。前端会捕获这个错误并提示用户。

### Q: 如何导出 Waitlist 数据

1. Table Editor → waitlist
2. 点击右上角 **"Export"** → 选择 CSV 或 JSON 格式

---

## 📈 后续优化建议

1. **添加 Google Analytics** - 追踪转化率
2. **添加邮件确认** - Supabase 内置支持
3. **添加社交登录** - Google/GitHub 登录
4. **设置 Webhooks** - 新用户注册时通知 Slack/钉钉
5. **添加邀请奖励系统** - 根据 referral_count 发放优惠

---

## ✅ 检查清单

- [ ] Supabase 账号已创建
- [ ] 项目已初始化
- [ ] waitlist 表已创建
- [ ] RLS 策略已配置
- [ ] `.env` 文件已配置
- [ ] 依赖已安装 (`@supabase/supabase-js`)
- [ ] 测试提交成功
- [ ] 数据能在后台看到

---

完成以上步骤后，你的 Waitlist 系统就已经上线了！🎉

如需帮助，请查阅 [Supabase 官方文档](https://supabase.com/docs)。
