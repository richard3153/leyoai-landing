---
title: Nexify Video Safety Classifier
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.36.1
app_file: app.py
pinned: false
license: mit
short_description: Video content safety classifier using LoRA fine-tuned Qwen
---

# Nexify Video Safety Classifier

基于 Qwen2.5-1.5B-Instruct 微调的 LoRA 模型，用于快速判断视频内容的安全性。

## 模型信息

- **基础模型**: Qwen/Qwen2.5-1.5B-Instruct
- **LoRA 适配器**: FFZwai/qwen2.5-1.5b-video-safety
- **训练数据**: Nexify 视频安全标注数据

## 使用方法

1. 输入视频内容描述
2. 点击"分析安全性"按钮
3. 模型会返回以下三种标签之一：
   - `safe`: 安全内容
   - `harmful`: 有害内容
   - `borderline`: 边界内容（需要人工审核）
