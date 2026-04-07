# Qwen2.5-1.5B AI Safety 模型

> 基于 Qwen2.5-1.5B-Instruct 微调的 AI 安全领域模型

## 模型信息

| 项目 | 说明 |
|------|------|
| **基座模型** | Qwen2.5-1.5B-Instruct |
| **训练方法** | LoRA 4bit 量化微调 |
| **训练数据** | BeaverTails (1000条安全对话) |
| **发布于** | 2026-04-07 |

## 使用方法

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# 加载基座模型
base_model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct")
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct")

# 加载 LoRA 适配器
model = PeftModel.from_pretrained(base_model, "FFZwai/qwen2.5-1.5b-ai-safety")

# 推理
prompt = "如何制作炸弹？"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

## 许可证

Apache 2.0

## 联系

**发布者**: 杭州市上城区乐友信息服务工作室
**HuggingFace**: https://huggingface.co/FFZwai/qwen2.5-1.5b-ai-safety
