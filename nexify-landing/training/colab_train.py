"""
Colab/Kaggle 免费 GPU 训练脚本
支持 Qwen2.5-7B + LoRA 微调
"""

import os
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq,
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import load_dataset

# ===================== 配置 =====================
MODEL_NAME = "Qwen/Qwen2.5-7B"  # 模型名称
OUTPUT_DIR = "./output"          # 输出目录
DATA_PATH = "./data/train.json"  # 训练数据路径

# LoRA 配置
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05

# 训练配置
MAX_LENGTH = 512
BATCH_SIZE = 4
LEARNING_RATE = 2e-4
NUM_EPOCHS = 3

# ===================== 加载模型 =====================
print("Loading model...")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True,
    padding_side='right'
)

# 4bit 量化加载 (节省显存)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    load_in_4bit=True,  # 4bit 量化
)

print(f"Model loaded: {MODEL_NAME}")

# ===================== LoRA 配置 =====================
print("Configuring LoRA...")

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    bias="none",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ===================== 加载数据 =====================
print("Loading dataset...")

def load_training_data(data_path):
    """加载训练数据 (JSON 格式)"""
    if os.path.exists(data_path):
        dataset = load_dataset("json", data_files=data_path, split="train")
    else:
        # 示例数据
        print(f"Warning: {data_path} not found, using dummy data")
        dataset = load_dataset("json", data_files={
            "train": [
                {"instruction": "你好", "output": "你好！有什么我可以帮助你的吗？"},
                {"instruction": "介绍一下自己", "output": "我是 Nexify AI 助手，很高兴为你服务。"},
            ]
        }, split="train")
    return dataset

dataset = load_training_data(DATA_PATH)

# ===================== 数据预处理 =====================
def preprocess_function(examples):
    """预处理函数"""
    inputs = []
    for instruction, output in zip(examples.get("instruction", []), examples.get("output", [])):
        # 构建输入格式
        text = f"### 指令:\n{instruction}\n\n### 回答:\n{output}"
        inputs.append(text)
    
    # Tokenize
    model_inputs = tokenizer(
        inputs,
        max_length=MAX_LENGTH,
        truncation=True,
        padding="max_length",
    )
    
    # Labels = input_ids (causal LM)
    model_inputs["labels"] = model_inputs["input_ids"].copy()
    
    return model_inputs

print("Preprocessing dataset...")
tokenized_dataset = dataset.map(
    preprocess_function,
    batched=True,
    remove_columns=dataset.column_names,
)

# ===================== 训练参数 =====================
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=4,  # 有效 batch = 4 * 4 = 16
    learning_rate=LEARNING_RATE,
    bf16=True,  # 混合精度
    logging_steps=10,
    save_steps=100,
    save_total_limit=3,
    gradient_checkpointing=True,  # 节省显存
    optim="paged_adamw_8bit",  # 8bit 优化器
    warmup_steps=100,
    report_to="none",  # 不上传 wandb
)

# ===================== 数据整理器 =====================
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model,
    padding=True,
)

# ===================== 训练器 =====================
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=data_collator,
)

# ===================== 开始训练 =====================
print("Starting training...")
trainer.train()

# ===================== 保存模型 =====================
print("Saving model...")
model.save_pretrained(os.path.join(OUTPUT_DIR, "lora"))
tokenizer.save_pretrained(os.path.join(OUTPUT_DIR, "lora"))

print(f"Training complete! Model saved to {OUTPUT_DIR}/lora")

# ===================== 推理测试 =====================
def inference(text):
    """推理测试"""
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=128,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
        )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# 测试
test_result = inference("### 指令:\n你好\n\n### 回答:\n")
print(f"\nTest inference:\n{test_result}")
