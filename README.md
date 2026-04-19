# 🤖 LeyoAI - 垂直领域 AI 模型即服务平台

> 基于 Qwen2.5-1.5B + LoRA 微调，四大垂直领域 AI 助手，开箱即用，价格只有大厂的 1/10

[![HF Spaces](https://img.shields.io/badge/🤗%20HuggingFace-Spaces-yellow?style=flat-square)](https://huggingface.co/FFZwai)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black?style=flat-square)](https://leyoai.vercel.app)

---

## 🎯 产品矩阵

LeyoAI 提供四大垂直领域 AI 助手，基于 Qwen2.5-1.5B + LoRA 微调，每个模型都是针对特定场景深度优化的专家：

| 产品 | 功能 | 场景 | 价格 |
|------|------|------|------|
| 🛡️ **Cyber Model** | 网络安全威胁识别、钓鱼检测、应急响应 | 企业 SOC、安全运营 | ¥29/月起 |
| 🎬 **Video Model** | 视频/图像内容安全审核、合规分类 | 内容平台、电商审核 | ¥29/月起 |
| ⚙️ **Flow Model** | 业务流程分析、Python脚本生成、工作流编排 | 运营自动化、DevOps | ¥29/月起 |
| 📊 **Analytics Model** | A/B测试设计、用户行为分析、数据报告生成 | 产品分析、增长团队 | ¥29/月起 |
| 📈 **LeyoQuant** | A股量化分析、价值投资评分、风险监控 | 量化投资、资产管理 | ¥79/月起 |

👉 **[官网 leyoai.vercel.app](https://leyoai.vercel.app)** | **[定价方案](https://leyoai.vercel.app/pricing.html)**

---

## 💰 价格对比

| 服务 | LeyoAI | 阿里云 | 腾讯云 | 节省 |
|------|--------|--------|--------|------|
| 安全分析（Pro/月） | **¥79** | ¥980 | ¥2,400 | **-92%** |
| 内容审核（Pro/月） | **¥79** | — | ¥3,000 | — |
| 流程自动化（Pro/月） | **¥79** | ¥680 | ¥800 | **-88%** |
| 数据分析（Pro/月） | **¥79** | ¥1,200 | ¥1,500 | **-93%** |
| 量化分析（Pro/月） | **¥79** | ¥5,000+ | — | **-98%** |

> 所有方案均含 **Free 免费层**（每月 100 次），永久有效，无需信用卡

---

## 🚀 快速开始

### 在线体验（无需安装）

| AI 助手 | HF Space | 说明 |
|---------|----------|------|
| 🛡️ Cyber 安全助手 | [leyoai-cyber-assistant](https://huggingface.co/spaces/FFZwai/leyoai-cyber-assistant) | 网络安全威胁识别 |
| 🎬 Video 安全助手 | [leyoai-video-safety](https://huggingface.co/spaces/FFZwai/leyoai-video-safety) | 视频内容安全审核 |
| ⚙️ Flow 自动化助手 | [leyoai-flow-assistant](https://huggingface.co/spaces/FFZwai/leyoai-flow-assistant) | 流程自动化 |
| 📊 Analytics 分析助手 | [leyoai-analytics-assistant](https://huggingface.co/spaces/FFZwai/leyoai-analytics-assistant) | 数据分析 |

### 本地部署

```bash
# 安装依赖
pip install transformers accelerate

# 加载模型
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "FFZwai/qwen2.5-1.5b-video-safety"
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True)
```

> 更多本地部署说明请参考 [models/](models/) 目录

---

## 🧠 技术架构

```
用户请求
    ↓
HuggingFace Spaces（免费层）/ API（付费层）
    ↓
Qwen2.5-1.5B-Instruct（基座模型）
    ↓
LoRA Adapter（垂直领域微调）
    ↓
垂直领域 AI 响应
```

**核心技术栈：**
- 基座模型：[Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- 微调方式：LoRA (rank=16, alpha=32)
- 训练设备：Apple Mac Studio (M2 Ultra, MPS)
- 部署平台：HuggingFace Spaces + Vercel

---

## 📋 定价方案

| 方案 | 价格 | 每月额度 | 优先级 |
|------|------|---------|--------|
| **Free** | ¥0 | 100 次 | 普通 |
| **Starter** | ¥29/月 | 3,000 次 | 普通 |
| **Pro** | ¥79/月 | 20,000 次 | 优先 |
| **Enterprise** | ¥299/月起 | 不限 | 最高 |

[查看完整定价 →](https://leyoai.vercel.app/pricing.html)

---

## 🔒 关于数据安全

- ✅ 所有推理数据**仅用于处理**，不持久化存储
- ✅ 企业版支持**私有化部署**，数据完全在自有服务器
- ✅ 符合《个人信息保护法》要求

---

## 📁 项目结构

```
leyoai-landing/          # 官网前端（React + Vite）
├── public/              # 静态资源（HTML页面）
├── src/                 # React 组件
└── dist/                # Vercel 构建输出

leyo-quant/              # 量化分析系统（独立部署）
├── frontend/            # React 前端
├── backend/             # Python 后端（FastAPI）
└── screenshots/        # 页面截图
```

---

## 🛠️ 开发指南

### 本地运行官网

```bash
cd nexify-landing
npm install
npm run dev
```

### 部署到 Vercel

```bash
npm run build
vercel --prod
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 📬 联系方式

- 🌐 官网：[https://leyoai.vercel.app](https://leyoai.vercel.app)
- 📧 邮箱：xuanchen.wu@hotmail.com
- 💬 GitHub Issues：[提交问题](https://github.com/richard3153/leyoai-landing/issues)

---

*LeyoAI 由杭州市上城区乐友信息服务工作室出品*
Sun Apr 19 18:35:51 CST 2026
