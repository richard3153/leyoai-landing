# Vercel 部署指南

> 零成本部署 Nexify 落地页到 Vercel

---

## 1. Vercel 账号注册

1. 访问 [vercel.com](https://vercel.com)
2. 点击 **Sign Up**，选择 **Continue with GitHub**
3. 授权 Vercel 访问你的 GitHub 账号（免费）

---

## 2. 项目导入

1. 登录 Vercel 后，点击 **Add New...** → **Project**
2. 在 **Import Git Repository** 中找到并选择 `nexify-landing` 仓库
3. 配置项目：
   - **Framework Preset**: 选择 `Vite`
   - **Build Command**: `npm run build`（默认）
   - **Output Directory**: `dist`（默认）
4. 点击 **Deploy**

---

## 3. 环境变量配置

部署前或部署后，需要配置 Supabase 环境变量：

1. 进入项目 → **Settings** → **Environment Variables**
2. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase 匿名密钥 |

3. 点击 **Save**，然后重新部署（Redeploy）

> 💡 环境变量值可从 Supabase Dashboard → Project Settings → API 中获取

---

## 4. 部署完成

- 构建时间约 **1-2 分钟**
- 部署成功后，获得免费域名：
  - `https://nexify-landing.vercel.app`
  - 或 `https://nexify-landing-xxx.vercel.app`（自动分配）

---

## 5. 自定义域名（可选）

如果你有自有域名：

1. 进入项目 → **Settings** → **Domains**
2. 输入你的域名（如 `www.nexify.com`）
3. 按提示在域名 DNS 中添加 CNAME 记录
4. 等待 DNS 生效（通常几分钟到几小时）

没有域名可直接使用 Vercel 提供的免费子域名。

---

## 6. 自动部署

Vercel 默认开启自动部署：

- **Push 到 main 分支** → 自动部署到生产环境
- **创建 Pull Request** → 自动生成预览链接（Preview Deployment）

---

## 7. 故障排查

| 问题 | 解决方案 |
|------|----------|
| 构建失败 | 检查 `package.json` 中的 `build` 脚本 |
| 环境变量未生效 | 确认变量名以 `VITE_` 开头，并重新部署 |
| 页面空白 | 检查 `dist` 目录是否正确生成 |
| 404 错误 | 确认 `vercel.json` 配置了路由重写 |

---

## 快速检查清单

- [ ] GitHub 仓库已推送最新代码
- [ ] Vercel 账号已绑定 GitHub
- [ ] 项目已导入 Vercel
- [ ] 环境变量 `VITE_SUPABASE_URL` 已配置
- [ ] 环境变量 `VITE_SUPABASE_ANON_KEY` 已配置
- [ ] 首次部署成功
- [ ] （可选）自定义域名已绑定

---

**预计时间**: 5-10 分钟  
**预计成本**: $0（免费额度内）
