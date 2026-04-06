# Nexify Waitlist 数据库设计

## 📊 表结构

### `waitlist` - Waitlist 用户表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | SERIAL | PRIMARY KEY | 自增主键 |
| `email` | VARCHAR(255) | UNIQUE NOT NULL | 用户邮箱 |
| `referral_code` | VARCHAR(20) | UNIQUE | 自动生成的邀请码 (NX + 6位) |
| `referred_by` | VARCHAR(20) | - | 邀请人的邀请码 |
| `referral_count` | INTEGER | DEFAULT 0 | 通过此用户邀请注册的人数 |
| `source` | VARCHAR(50) | - | 注册来源 (optional) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 注册时间 |

---

## 📝 完整 SQL Schema

```sql
-- ============================================
-- Nexify Waitlist Database Schema
-- Version: 1.0
-- Compatible: Supabase (PostgreSQL 15+)
-- ============================================

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

-- 创建索引优化查询性能
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_referral_code ON waitlist(referral_code);
CREATE INDEX idx_waitlist_referred_by ON waitlist(referred_by);
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);

-- ============================================
-- 邀请码生成函数
-- ============================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR AS $$
BEGIN
  -- 生成格式: NX + 6位大写字母数字组合
  -- 示例: NX4K8M2P
  RETURN 'NX' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 触发器：新用户自动生成邀请码
-- ============================================

CREATE TRIGGER generate_code_on_insert
BEFORE INSERT ON waitlist
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();

-- ============================================
-- 触发器：更新邀请人的 referral_count
-- ============================================

CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果有 referred_by，更新邀请人的 referral_count
  IF NEW.referred_by IS NOT NULL THEN
    UPDATE waitlist
    SET referral_count = referral_count + 1
    WHERE referral_code = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_count_on_insert
AFTER INSERT ON waitlist
FOR EACH ROW
EXECUTE FUNCTION update_referral_count();

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户插入数据（Waitlist 注册）
CREATE POLICY "Allow anonymous insert" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 允许公开读取（用于邀请链接验证等）
CREATE POLICY "Allow public read" ON waitlist
  FOR SELECT
  TO public
  USING (true);

-- 禁止公开更新和删除（只有管理员可以操作）
-- 服务端使用 service_role key 可以绕过 RLS

-- ============================================
-- 实用视图（可选）
-- ============================================

-- 邀请排行榜视图
CREATE VIEW referral_leaderboard AS
SELECT
  referral_code,
  email,
  referral_count,
  created_at
FROM waitlist
WHERE referral_count > 0
ORDER BY referral_count DESC;

-- 每日注册统计视图
CREATE VIEW daily_signup_stats AS
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as total_signups,
  COUNT(referred_by) as referred_signups
FROM waitlist
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

---

## 📈 数据关系图

```
┌─────────────────────────────────────────┐
│              waitlist                    │
├─────────────────────────────────────────┤
│ id (PK)                                  │
│ email (UNIQUE)                           │
│ referral_code (UNIQUE) ◄───────┐        │
│ referred_by          ──────────┘        │
│ referral_count                           │
│ source                                   │
│ created_at                               │
└─────────────────────────────────────────┘

关系：
- referred_by 字段存储邀请人的 referral_code
- 形成用户间的推荐关系链
```

---

## 🔍 常用查询示例

### 查看所有用户

```sql
SELECT * FROM waitlist ORDER BY created_at DESC;
```

### 查看某个用户的邀请人信息

```sql
SELECT
  w1.email as user_email,
  w2.email as referrer_email
FROM waitlist w1
LEFT JOIN waitlist w2 ON w1.referred_by = w2.referral_code
WHERE w1.email = 'user@example.com';
```

### 查看邀请排行榜 Top 10

```sql
SELECT * FROM referral_leaderboard LIMIT 10;
```

### 查看每日注册趋势

```sql
SELECT * FROM daily_signup_stats LIMIT 30;
```

### 统计总用户数和平均邀请率

```sql
SELECT
  COUNT(*) as total_users,
  AVG(referral_count) as avg_referrals,
  COUNT(referred_by) as total_referred_signups,
  ROUND(COUNT(referred_by)::DECIMAL / COUNT(*) * 100, 2) as referral_rate_percent
FROM waitlist;
```

### 查找某个邀请码的有效性

```sql
SELECT
  referral_code,
  email,
  referral_count,
  created_at
FROM waitlist
WHERE referral_code = 'NX4K8M2P';
```

---

## ⚡ 性能优化建议

1. **索引已覆盖主要查询**：
   - email 查询（唯一约束自带索引）
   - referral_code 查询
   - created_at 降序排序

2. **大数据量时的分区建议**：
   ```sql
   -- 当数据量超过 10 万条时，考虑按时间分区
   -- (需要升级到 Supabase Pro 或自建 PostgreSQL)
   ```

3. **定期清理测试数据**：
   ```sql
   -- 删除测试数据（生产环境慎用）
   DELETE FROM waitlist WHERE email LIKE '%test%' OR email LIKE '%example%';
   ```

---

## 🛡️ 安全说明

1. **RLS 已启用**：公开 API 只能插入和查询，不能更新或删除
2. **service_role key**：仅服务端使用，拥有完全权限
3. **email 唯一性**：防止重复注册
4. **referral_code 唯一性**：防止邀请码冲突

---

## 📊 扩展字段建议（未来迭代）

```sql
-- 可选：添加更多字段
ALTER TABLE waitlist ADD COLUMN name VARCHAR(100);
ALTER TABLE waitlist ADD COLUMN company VARCHAR(100);
ALTER TABLE waitlist ADD COLUMN phone VARCHAR(20);
ALTER TABLE waitlist ADD COLUMN interests TEXT[];
ALTER TABLE waitlist ADD COLUMN utm_source VARCHAR(50);
ALTER TABLE waitlist ADD COLUMN utm_medium VARCHAR(50);
ALTER TABLE waitlist ADD COLUMN utm_campaign VARCHAR(50);
```

---

Schema 设计完成，可直接在 Supabase SQL Editor 中执行。
