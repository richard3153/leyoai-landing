# Video Model 训练规划

> 版本：v1.0 | 日期：2026-04-08 | 作者：CTO/Nexify

---

## 一、目标定位

### 产品目标
在 Nexify MaaS 平台上推出 **Video Model**，提供视频内容理解能力，与 Cyber Model 形成互补：
- Cyber Model = 文字/语音安全（问与答）
- **Video Model = 视频内容安全分析（图+文）**

### MVP 定位
**视频内容安全审核助手**：给定视频URL或视频帧序列，输出内容安全分析报告（涉黄/涉暴/涉政/广告/低质检测）。

### 竞品参考
| 产品 | 方向 | Nexify Video Model 差异点 |
|------|------|--------------------------|
| AWS Rekognition | 通用视频分析 | 专注中文+垂直场景 |
| 腾讯云视频理解 | 企业API | 面向开发者+免费tier |
| LLaVA视频 | 开源视频理解 | 已微调可直接部署 |

---

## 二、技术方案

### 2.1 基座模型选型

**约束条件：Mac Studio M2 Max（34.4GB 统一内存）**

| 模型 | 参数量 | FP16 显存 | 4-bit QLoRA 显存 | 可行性 | 推荐 |
|------|--------|-----------|-----------------|--------|------|
| Qwen2-VL-2B | 2B | ~6GB | ~3GB | ✅ 充裕 | ⭐ **首选** |
| LLaVA-1.5-7B | 7B | ~16GB | ~7GB | ✅ 可行 | 次选（更大更好） |
| Phi-3.5-Vision | 4.9B | ~10GB | ~5GB | ✅ 可行 | 备选 |
| CogVLM-17B | 17B | 超内存 | ~14GB | ⚠️ 紧张 | 不推荐 |

**最终选择：Qwen2-VL-2B-Instruct**
- 阿里开源，小身材，强中文
- 天然支持视频帧输入（多图）
- 4-bit QLoRA 后约 3GB，适合 M2 Max 留足余量

### 2.2 训练方法

```
基座：Qwen2-VL-2B-Instruct
方式：QLoRA（LoRA r=16, alpha=32）
     + MPS 加速（Mac Studio）
     + DeepSpeed ZeRO-2（可选，分担内存）
训练时长：预计 800-1500 秒（Mac Studio）
模型大小：约 400MB LoRA adapter
```

### 2.3 数据策略

#### 数据来源（开源 + 自制）

| 数据集 | 来源 | 条数 | 用途 |
|--------|------|------|------|
| Video-Instruct | Qwen team's video instruction data | 1K | 视频QA |
| ShareGPT4V caption | ShareGPT4V/LAION | 1K | 视频描述 |
| 视频安全审核问答 | **自建** | 500 | 安全垂直领域 |
| 中文字幕视频QA | Bilibili 字幕 + GPT | 500 | 中文视频理解 |

#### 自建安全审核数据格式
```json
{
  "id": "vid_safe_001",
  "type": "video",
  "frames": ["frame1.jpg", "frame2.jpg", ...],
  "prompt": "请分析这段视频中是否存在违规内容？",
  "response": "该视频内容安全，未检测到违规元素。",
  "label": "safe",
  "source": "manual"
}
```

---

## 三、训练流程（分阶段）

### Phase 1：环境准备（Day 1）

**任务 1.1：升级 Python 环境**
```bash
# 检查现有依赖
pip show transformers accelerate peft bitsandbytes datasets huggingface_hub

# 升级到最新（支持 Qwen2-VL）
pip install --upgrade transformers>=4.45.0 accelerate peft bitsandbytes datasets huggingface_hub qwen-vl-utils
```

**任务 1.2：下载 Qwen2-VL-2B 基座模型**
```bash
# 方法A：HuggingFace CLI（需登录）
huggingface-cli download Qwen/Qwen2-VL-2B-Instruct --local-dir ./models/Qwen2-VL-2B-Instruct

# 方法B：Python（需要 HF_TOKEN）
from huggingface_hub import snapshot_download
snapshot_download(repo_id="Qwen/Qwen2-VL-2B-Instruct", local_dir="./models/Qwen2-VL-2B-Instruct")
```

**任务 1.3：下载/准备视频数据集**
```bash
# 视频指令数据
git clone https://huggingface.co/datasets/Qwen/Qwen2-VL-Datasets
# 或使用 webdataset 格式
```

**预计时间：2-4 小时（下载）**
**预计资源：约 5-8GB 磁盘**

---

### Phase 2：数据准备（Day 1-2）

**任务 2.1：构建视频安全审核数据集**

方案 A（推荐）：**用 Cyber Model 数据 + Qwen2-VL 做图片生成**
- 用 Cyber Model 的安全问答 prompt
- 随机生成描述性文本作为"帧描述"
- 构造多轮对话格式

方案 B：**手动标注少量视频帧**
- 下载开源视频（如 VoxCeleb、Pexels）
- 截图关键帧
- 手工标注安全/违规标签

```python
# 数据格式（参考 Qwen2-VL chat template）
{
    "messages": [
        {"role": "user", "content": [
            {"type": "image", "image": "frame_001.jpg"},
            {"type": "image", "image": "frame_002.jpg"},
            {"type": "text", "text": "请分析视频内容是否安全？"}
        ]},
        {"role": "assistant", "content": "该视频内容安全..."}
    ]
}
```

**任务 2.2：合并数据集并格式化**
```python
# video_prepare.py
import json

def format_for_qwen2vl(record):
    """将记录转换为 Qwen2-VL 训练格式"""
    content_parts = []
    for frame in record.get("frames", []):
        content_parts.append({
            "type": "image",
            "image": frame
        })
    content_parts.append({
        "type": "text",
        "text": record["prompt"]
    })
    return {
        "messages": [
            {"role": "user", "content": content_parts},
            {"role": "assistant", "content": record["response"]}
        ]
    }
```

**预计时间：3-6 小时（数据处理）**

---

### Phase 3：训练脚本开发（Day 2）

创建 `video_train.py`：

```python
#!/usr/bin/env python3
"""
Video Model 训练脚本 - Qwen2-VL-2B + QLoRA
支持：Mac Studio MPS / Linux CUDA / Colab GPU
"""
import os
import torch
from transformers import (
    AutoProcessor,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollator
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from qwen_vl_utils import process_vision_info
import json
from dataclasses import dataclass

# ── 配置 ──────────────────────────────────────────────
MODEL_NAME = "Qwen/Qwen2-VL-2B-Instruct"
DATA_PATH = "./data/video_train.jsonl"
OUTPUT_DIR = "./output/video_model"
MAX_LENGTH = 2048
LORA_R = 16
LORA_ALPHA = 32
NUM_EPOCHS = 2
BATCH_SIZE = 1          # Qwen2-VL 显存占用大，batch=1
GRADIENT_ACCUMULATION = 8  # 等效 batch=8
LEARNING_RATE = 1e-4
# ──────────────────────────────────────────────────────

@dataclass
class VideoDataset:
    def __init__(self, data_path):
        with open(data_path) as f:
            self.data = [json.loads(line) for line in f]

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]

def collator_video(batch, processor):
    """自定义 collator，处理多图输入"""
    texts = []
    images = []
    for item in batch:
        messages = item["messages"]
        text = processor.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=False
        )
        texts.append(text)
        images.append([item.get("frames", [])])

    inputs = processor(
        text=texts,
        images=images,
        return_tensors="pt",
        padding=True
    )
    return inputs

def main():
    print("=" * 50)
    print("🎬 Nexify Video Model 训练")
    print("=" * 50)

    # 检测设备
    if torch.cuda.is_available():
        device = "cuda"
        print(f"✅ CUDA: {torch.cuda.get_device_name(0)}")
    elif torch.backends.mps.is_available():
        device = "mps"
        print("✅ Apple MPS")
    else:
        device = "cpu"
        print("⚠️ CPU 模式（极慢，不推荐）")

    # 加载 processor
    print(f"\n📦 加载 Processor: {MODEL_NAME}")
    processor = AutoProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)

    # 加载模型（QLoRA）
    print("\n🧠 加载模型...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    # LoRA 配置
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        task_type=TaskType.CAUSAL_LM,
        lora_dropout=0.05,
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 加载数据
    print(f"\n📂 加载数据: {DATA_PATH}")
    dataset = VideoDataset(DATA_PATH)

    # 训练参数
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION,
        num_train_epochs=NUM_EPOCHS,
        learning_rate=LEARNING_RATE,
        fp16=(device == "cuda"),
        bf16=(device == "mps"),
        logging_steps=10,
        save_steps=100,
        warmup_steps=20,
        report_to="none",
        remove_unused_columns=False,
    )

    # 训练器
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=lambda batch: collator_video(batch, processor),
    )

    print("\n🚀 开始训练...")
    trainer.train()

    # 保存
    model.save_pretrained(f"{OUTPUT_DIR}/lora_adapter")
    processor.save_pretrained(f"{OUTPUT_DIR}/lora_adapter")
    print(f"\n✅ 已保存到 {OUTPUT_DIR}/lora_adapter")

if __name__ == "__main__":
    main()
```

**预计时间：1-2 小时（开发和调试）**

---

### Phase 4：训练执行（Day 2-3）

```bash
cd nexify-landing/training

# 单次运行
python video_train.py

# 或在 Colab（如果本地内存不足）
# 上传 video_train.py + 数据到 Colab
# Runtime → Change runtime → GPU T4
```

**训练监控指标：**
- Loss 曲线（目标：< 0.5 稳定）
- 显存/内存占用（目标：< 30GB）
- 每 epoch 时间（目标：< 15 分钟）

**预计总时长：800-1500 秒（Mac Studio M2 Max）**

---

### Phase 5：模型测试与部署（Day 3）

**测试项：**
1. 视频帧 + 安全问题 → 检查回答质量
2. 与 Cyber Model 对比：Cyber=文字安全，Video=视频安全
3. 边界 case：模糊帧、夜景、动画

**部署到 HuggingFace Space（参考 Cyber Model）：**
```bash
# 1. 上传 LoRA adapter
huggingface-cli upload FFZwai/nexify-video-assistant ./output/video_model/lora_adapter/

# 2. 创建 Space（复用 Streamlit 模板）
# 3. 更新落地页 Video Model 状态：训练中 → 已上线
```

---

## 四、替代方案（若 Qwen2-VL-2B 显存不足）

### Plan B：LLaVA-1.5-7B（Colab GPU）

若 Mac Studio 内存不够，切换 Colab：

```python
# Colab 版本
MODEL_NAME = "llava-hf/llava-1.5-7b-hf"
# T4 GPU (16GB) → batch_size=2 可行
# P100/V100 → batch_size=4
```

### Plan C：Image Model → Video（轻量方案）

若视频模型训练过于复杂，先做**图片安全审核**：

```python
# 用已训练好的 Cyber Model（文字）+ 新训练的 Image Safety Model（图片）
# 两个模型组合 = 视频理解（逐帧分析）
MODEL_NAME = "Qwen/Qwen2.5-VL-2B-Split"  # 或其他 image model
```

### Plan D：API 调用（零训练）

完全不做训练，调用现成 API：
- 腾讯云视频理解 API
- 阿里云视频AI
- 百度智能云视频分析

> ⚠️ 缺点：无品牌差异，无数据护城河，依赖第三方

---

## 五、资源清单

| 资源 | 数量/规格 | 备注 |
|------|-----------|------|
| Mac Studio M2 Max | 34.4GB 统一内存 | 主要训练机器 |
| HuggingFace Token | FFZwai 账号 | 已配置 |
| 磁盘空间 | 需要 ~15GB | 模型+数据+输出 |
| Colab Pro（备选） | T4/A100 | 若本地不够 |

---

## 六、里程碑

| 阶段 | 内容 | 目标时间 |
|------|------|----------|
| Day 1 | 环境准备 + 数据下载 | 2026-04-09 |
| Day 2 | 数据处理 + 训练脚本调试 | 2026-04-10 |
| Day 3 | 执行训练 + 测试验证 | 2026-04-11 |
| Day 4 | HF Space 部署 + 官网更新 | 2026-04-12 |

**总目标：2026-04-12 前 Video Model 上线**

---

## 七、风险与备选

| 风险 | 概率 | 应对 |
|------|------|------|
| Qwen2-VL-2B Mac Studio 显存不足 | 低 | 切换 batch=1 或 Colab |
| 视频数据集下载失败 | 中 | 使用 Bilibili 字幕+GPT 生成 |
| 训练 loss 不收敛 | 低 | 降低 learning rate 到 5e-5 |
| HF Space 部署报错 | 中 | 参考 Cyber Model 的 Streamlit 经验 |
