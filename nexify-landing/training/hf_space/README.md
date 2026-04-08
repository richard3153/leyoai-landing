---
title: Nexify Video Safety Assistant
emoji: 🎬
colorFrom: purple
colorTo: green
sdk: streamlit
sdk_version: 1.40.0
app_file: app.py
pinned: false
suggested_hardware: t4-small
suggested_storage: large
suggested_memory: 16GB
license: apache-2.0
tags:
  - video-understanding
  - safety
  - qwen2-vl
  - multimodal
  - chinese
  - streamlit
---

# Nexify Video Safety Assistant 🎬

基于 **Qwen2-VL-2B-Instruct** 微调的**视频内容安全理解助手**，由 Nexify MaaS 平台提供。

## 功能

- 🛡️ **内容安全审核**：涉黄/涉暴/涉政/广告/低质内容检测
- ⚠️ **风险点识别**：识别视频帧中的安全隐患和风险行为
- 📝 **场景描述**：对视频帧进行详细的内容描述
- ❓ **视频问答**：根据视频内容回答相关问题
- 🏷️ **标签分类**：为视频内容自动打标签

## 使用方法

1. 上传一张图片（视频关键帧截图）
2. 选择预设问题或自定义问题
3. 点击「开始分析」获得 AI 安全评估

## 模型信息

- **基座模型**：Qwen2-VL-2B-Instruct（阿里通义千问）
- **微调方法**：QLoRA (r=16, α=32)
- **硬件**：Apple M2 Max (Mac Studio) / NVIDIA A100 (训练)
- **平台**：Nexify MaaS

## Nexify 产品线

| 产品 | 状态 | 说明 |
|------|------|------|
| 🎬 Video Model | ✅ 已上线 | 视频内容安全理解 |
| 🛡️ Cyber Model | ✅ 已上线 | 文字/语音安全问答 |
| ⚡ Flow Model | 🔨 规划中 | 工作流自动化 |
| 📊 Analytics Model | 🔨 规划中 | 数据分析洞察 |

官网：https://dist-sigma-woad.vercel.app/
