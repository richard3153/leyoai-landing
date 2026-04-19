/**
 * 配额检查 + 告警逻辑
 *
 * - 检查用户当月用量是否超限
 * - 用量达到 80% / 100% 时触发邮件告警
 * - 通过 alert_logs 表去重（同月同类告警只发一次）
 */
import { supabase, Product } from './supabase';
import { sendQuotaAlert } from './email';

export interface QuotaResult {
  allowed: boolean;
  usage: number;
  limit: number;
  plan: string;
}

/** 查询用户配额 */
export async function checkQuota(
  userId: string,
  product: Product,
  plan: string,
): Promise<QuotaResult> {
  // 1. 查配额上限
  const { data: quotaRow } = await supabase
    .from('plan_quotas')
    .select('monthly_limit')
    .eq('product', product)
    .eq('plan', plan)
    .single();

  const limit = quotaRow?.monthly_limit ?? 100;
  const isUnlimited = limit === -1;

  // 2. 查当月用量
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const iso = monthStart.toISOString();

  const { count } = await supabase
    .from('usage_logs')
    .select('*', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .eq('product', product)
    .gte('created_at', iso);

  const usage = count ?? 0;
  const allowed = isUnlimited || usage < limit;

  return { allowed, usage, limit, plan };
}

/** 记录一次 API 调用 */
export async function logUsage(
  userId: string,
  product: Product,
  action: string,
  tokensUsed: number = 0,
): Promise<void> {
  await supabase.from('usage_logs').insert([{
    user_id: userId,
    product,
    action,
    tokens_used: tokensUsed,
  }]);
}

/** 检查是否需要发配额告警（80%/100%） */
export async function checkAndAlert(
  userId: string,
  email: string,
  product: Product,
  usage: number,
  limit: number,
): Promise<void> {
  if (limit === -1) return; // 无限配额不告警

  const pct = usage / limit;

  // 80% 告警
  if (pct >= 0.8 && pct < 1.0) {
    await maybeSendAlert(userId, email, product, 'quota_80', usage, limit);
  }

  // 100% 告警
  if (pct >= 1.0) {
    await maybeSendAlert(userId, email, product, 'quota_100', usage, limit);
  }
}

/** 去重发送：同月同产品同类型只发一次 */
async function maybeSendAlert(
  userId: string,
  email: string,
  product: string,
  alertType: string,
  usage: number,
  limit: number,
): Promise<void> {
  // 检查是否已发送过
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('alert_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('product', product)
    .eq('alert_type', alertType)
    .gte('sent_at', monthStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return; // 已发过

  // 发送邮件
  const pctLabel = alertType === 'quota_80' ? '80%' : '100%';
  const subject = alertType === 'quota_80'
    ? `[LeyoAI] ${product.toUpperCase()} 配额已用 ${pctLabel}`
    : `[LeyoAI] ${product.toUpperCase()} 配额已用完`;

  const html = alertType === 'quota_80'
    ? `<h2>⚠️ 配额提醒</h2>
       <p>您的 <strong>${product.toUpperCase()}</strong> 本月用量已达 <strong>${usage}/${limit}</strong>（${pctLabel}）。</p>
       <p>如需更多配额，请访问 <a href="https://leyoai.vercel.app/pricing.html">LeyoAI 定价页</a> 升级套餐。</p>
       <hr><p style="color:#999;font-size:12px">LeyoAI — 让 AI 技术真正赋能业务场景</p>`
    : `<h2>🚫 配额用尽</h2>
       <p>您的 <strong>${product.toUpperCase()}</strong> 本月用量已达 <strong>${usage}/${limit}</strong>，已无法继续调用。</p>
       <p>请升级套餐或等待下月自动恢复：</p>
       <p><a href="https://leyoai.vercel.app/pricing.html" style="background:indigo;color:white;padding:10px 24px;border-radius:8px;text-decoration:none">升级套餐</a></p>
       <hr><p style="color:#999;font-size:12px">LeyoAI — 让 AI 技术真正赋能业务场景</p>`;

  const sent = await sendQuotaAlert(email, subject, html);

  // 记录告警日志
  if (sent) {
    await supabase.from('alert_logs').insert([{
      user_id: userId,
      product,
      alert_type: alertType,
    }]);
  }
}
