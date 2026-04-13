# MEMORY.md - Long-Term Memory

## 品牌信息
- **品牌名**: LeyoAI（由公司名"乐友"重组而来：LE+YO+AI）
- **公司全称**: 杭州市上城区乐友信息服务工作室（个体工商户）
- **品牌更名历史**: Nexify → LeyoAI（2026-04-13），原因：Nexify Limited（香港IT公司）同名冲突 + 乐友孕婴童品牌风险
- **官网**: https://nexify-landing.vercel.app （Vercel 域名暂未改，内容已更名）
- **GitHub**: https://github.com/richard3153/nexify-landing

## 产品线状态（2026-04-13）
- 🛡️ Cyber Model → ✅ 已上线 → HF Space: FFZwai/nexify-cyber-assistant
- 🎬 Video Model → ✅ 已上线 → HF Space: FFZwai/nexify-video-safety-v2
- ⚙️ Flow Model → ✅ 已上线 → HF Space: FFZwai/nexify-flow-assistant
- 📊 Analytics Model → ✅ 已上线 → HF Space: FFZwai/nexify-analytics-assistant

## HF 资源
- LoRA 模型仓库: FFZwai/qwen2.5-1.5b-video-safety
- HF 用户: FFZwai

## 技术栈
- 基座模型: Qwen2.5-1.5B-Instruct
- 微调方式: LoRA (rank=16, alpha=32)
- 训练设备: 本地 Mac Studio MPS
- 部署: Vercel (官网) + HuggingFace Spaces (AI助手)

## 教训
- HF Space 构建：Python 3.13 移除了 audioop，gradio 4.x 依赖 pydub 需要 audioop → 用 Docker SDK + Python 3.12
- 批量上传 HF 文件时如果循环中间报错，后续文件不会被上传
- adapter_config.json 中 base_model_name_or_path 必须用 HF 标准 ID（如 Qwen/Qwen2.5-1.5B-Instruct），不能用本地路径
