# Nexify Video Safety Model

视频安全内容理解助手，基于 Qwen2-VL-2B-Instruct + LoRA 微调。

## 快速链接

| 资源 | 链接 |
|------|------|
| 🤗 LoRA Model | https://huggingface.co/FFZwai/nexify-video-safety-lora |
| 🚀 HF Space | https://huggingface.co/spaces/FFZwai/nexify-safety-v2 |
| 🌐 官网 | https://dist-sigma-woad.vercel.app/ |
| 💻 GitHub | https://github.com/richard3153/nexify-landing |

## 模型信息

- **基座模型**: Qwen2-VL-2B-Instruct (2.2B 参数)
- **LoRA 参数**: 9.2M (0.42%)
- **训练数据**: 1500 条安全问答
- **训练步数**: 750 步 (2 epochs)
- **最终 Loss**: 0.52

## 目录结构

```
training/
├── video_train.py          # 训练脚本
├── video_train_resume.py   # 断点续训脚本
└── data/                   # 训练数据

output/video_model/
├── lora_adapter/           # LoRA adapter (35MB)
└── epoch-2/                # 最终模型备份

hf_video_space/
├── app.py                  # Gradio 应用
├── Dockerfile              # Docker 配置
└── requirements.txt        # 依赖
```

## 本地推理

```python
import torch
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from peft import PeftModel

# 加载模型
base_model = Qwen2VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2-VL-2B-Instruct",
    torch_dtype=torch.float16,
    device_map="auto"
)
model = PeftModel.from_pretrained(base_model, "FFZwai/nexify-video-safety-lora")
processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")

# 推理
def ask(question):
    messages = [{"role": "user", "content": [{"type": "text", "text": question}]}]
    text = processor.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor.tokenizer(text, return_tensors="pt").to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=200, do_sample=False)
    
    return processor.tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)

print(ask("油锅着火怎么办？"))
```

## 训练配置

```python
# LoRA 配置
LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
)

# 训练参数
TrainingArguments(
    num_train_epochs=2,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    warmup_steps=50,
    logging_steps=10,
    save_steps=80,
)
```

## 数据集

| 来源 | 数量 | 语言 |
|------|------|------|
| BeaverTails | 1000 | 英文 |
| 自建数据 | 500 | 中文 |

**覆盖领域**: 消防安全、防诈骗、紧急逃生、食品安全、公共场所安全

## 版本历史

### v1.0 (2026-04-09)
- 初始发布
- 750 步训练完成
- HF Space 上线

---

**Nexify** - AI 安全内容理解助手
