-- alert_logs: 配额告警记录表
-- 用于去重：同月同产品同类型告警只发一次

CREATE TABLE IF NOT EXISTS public.alert_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product TEXT NOT NULL,           -- cyber | video | flow | analytics
  alert_type TEXT NOT NULL,        -- quota_80 | quota_100 | monthly_report
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同月同产品同类型唯一约束
  UNIQUE (user_id, product, alert_type, DATE_TRUNC('month', sent_at))
);

-- RLS: 用户只能看自己的告警记录
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.alert_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_product ON public.alert_logs (user_id, product);
CREATE INDEX IF NOT EXISTS idx_alert_logs_sent_at ON public.alert_logs (sent_at);

-- 给 service_role 完整访问权限（API Gateway 用）
GRANT ALL ON public.alert_logs TO service_role;
