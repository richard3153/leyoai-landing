#!/usr/bin/env python3
"""
Mac Studio 本地训练脚本 - Apple MPS 加速
"""
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer, DataCollatorForSeq2Seq
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training

# 配置
MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
DATA_PATH = "./data/train.json"
OUTPUT_DIR = "./output"
MAX_LENGTH = 256
NUM_EPOCHS = 2
BATCH_SIZE = 4

print("=" * 50)
print("🍎 Mac Studio 本地训练")
print("=" * 50)
print(f"MPS 可用: {torch.backends.mps.is_available()}")

# 1. 加载 tokenizer
print("\n📦 1/5 加载 tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True, padding_side='right')
print("✅ Tokenizer 加载完成")

# 2. 加载模型
print("\n📦 2/5 加载模型...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True,
    torch_dtype=torch.float16,
    device_map="mps"
)
print("✅ 模型加载完成")

# 3. 配置 LoRA
print("\n⚙️ 3/5 配置 LoRA...")
model = prepare_model_for_kbit_training(model)
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    bias="none",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# 4. 加载数据
print("\n📊 4/5 加载数据...")
def format_example(example):
    text = f"Q: {example['instruction']}\nA: {example['output']}"
    return {"text": text}

def tokenize(example):
    o = tokenizer(example["text"], max_length=MAX_LENGTH, truncation=True, padding="max_length")
    o["labels"] = o["input_ids"].copy()
    return o

dataset = load_dataset("json", data_files=DATA_PATH, split="train")
dataset = dataset.map(format_example, remove_columns=["instruction","output","id","lang"])
dataset = dataset.map(tokenize, remove_columns=["text"])
print(f"训练数据: {len(dataset)} 条")

# 5. 训练
print("\n🔥 5/5 开始训练...")
args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=False,
    logging_steps=20,
    save_steps=200,
    save_total_limit=2,
    warmup_steps=50,
    report_to="none",
    dataloader_num_workers=0,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=dataset,
    data_collator=DataCollatorForSeq2Seq(tokenizer, model, padding=True),
)
print("🚀 训练中...")
trainer.train()
print("✅ 训练完成!")

# 保存
print("\n💾 保存模型...")
model.save_pretrained(f"{OUTPUT_DIR}/lora_adapter")
tokenizer.save_pretrained(f"{OUTPUT_DIR}/lora_adapter")
print(f"✅ 已保存到 {OUTPUT_DIR}/lora_adapter")
