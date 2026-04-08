#!/usr/bin/env python3
"""
Video Model 训练脚本 - Qwen2-VL-2B + QLoRA (MPS/CUDA)
用于：Mac Studio M2 Max / Linux CUDA / Google Colab
"""
import os
import sys
import json
import time
import torch

# 设置 MPS 兼容和 OMP
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

# ── 配置 ──────────────────────────────────────────────
MODEL_DIR = "./models/Qwen2-VL-2B-Instruct"
DATA_PATH = "./data/video_train.jsonl"
OUTPUT_DIR = "./output/video_model"
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
MAX_LENGTH = 1536          # Qwen2-VL 用像素而非token长度
NUM_EPOCHS = 2
BATCH_SIZE = 1
GRADIENT_ACCUMULATION = 8  # 等效 batch=8
LEARNING_RATE = 1e-4
WARMUP_STEPS = 10
SAVE_STEPS = 100
LOG_STEPS = 5
# ─────────────────────────────────────────────────────

def print_section(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)

def detect_device():
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0)
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon GPU"
    return "cpu", "CPU (slow)"

def load_processor():
    from transformers import AutoProcessor
    print_section(f"📦 加载 Processor: {MODEL_DIR}")
    processor = AutoProcessor.from_pretrained(
        MODEL_DIR,
        trust_remote_code=True,
        local_files_only=True,
    )
    print(f"✅ Processor 加载成功")
    return processor

def load_model(device):
    from transformers import AutoModelForCausalLM
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    print_section("🧠 加载模型")
    torch_dtype = torch.float16

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        torch_dtype=torch_dtype,
        device_map="auto",
        trust_remote_code=True,
        local_files_only=True,
    )
    print(f"✅ 模型加载成功 ({model.num_parameters()/1e9:.2f}B params)")

    # QLoRA 准备
    model = prepare_model_for_kbit_training(model)

    # LoRA 配置
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
            # Qwen2-VL 额外层
            "qkv_proj", "o_proj", "gate_proj",
        ],
        task_type=None,
        lora_dropout=LORA_DROPOUT,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    return model

def load_data(data_path):
    from datasets import load_dataset

    print_section(f"📂 加载数据: {data_path}")
    if not os.path.exists(data_path):
        print(f"❌ 数据文件不存在: {data_path}")
        print("   请先运行 python video_prepare_data.py 生成数据")
        sys.exit(1)

    ds = load_dataset("json", data_files=data_path, split="train")
    print(f"✅ 数据加载成功: {len(ds)} 条")
    return ds

def preprocess_for_qwen2vl(example, processor):
    """将数据转换为 Qwen2-VL 训练格式"""
    messages = example["messages"]
    text = processor.tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
    )
    return {"text": text}

def main():
    start_time = time.time()

    print_section("🎬 Nexify Video Model 训练")
    print(f"  基座: Qwen2-VL-2B-Instruct")
    print(f"  方法: QLoRA (r={LORA_R}, α={LORA_ALPHA})")
    print(f"  数据: {DATA_PATH}")
    print(f"  输出: {OUTPUT_DIR}")

    # 设备检测
    device, device_name = detect_device()
    print(f"\n  设备: {device.upper()} ({device_name})")
    print(f"  FP16: {(device == 'cuda')}")
    print(f"  BF16: {(device == 'mps')}")

    # 检查模型是否存在
    if not os.path.exists(MODEL_DIR):
        print(f"\n❌ 模型目录不存在: {MODEL_DIR}")
        print("   请先运行下载脚本")
        sys.exit(1)

    # 加载
    processor = load_processor()
    model = load_model(device)
    dataset = load_data(DATA_PATH)

    # 预处理
    print_section("🔄 数据预处理")
    dataset = dataset.map(
        lambda ex: preprocess_for_qwen2vl(ex, processor),
        remove_columns=dataset.column_names,
    )
    print(f"✅ 预处理完成: {len(dataset)} 条")

    # Tokenize
    def tokenize(example):
        result = processor.tokenizer(
            example["text"],
            max_length=MAX_LENGTH,
            truncation=True,
            padding="max_length",
        )
        result["labels"] = result["input_ids"].copy()
        return result

    dataset = dataset.map(tokenize, batched=False, remove_columns=["text"])
    print(f"✅ Tokenize 完成")

    # 训练参数
    from transformers import TrainingArguments, Trainer

    fp16_flag = (device == "cuda")
    bf16_flag = (device == "mps")

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION,
        num_train_epochs=NUM_EPOCHS,
        learning_rate=LEARNING_RATE,
        fp16=fp16_flag,
        bf16=bf16_flag,
        warmup_steps=WARMUP_STEPS,
        logging_steps=LOG_STEPS,
        save_steps=SAVE_STEPS,
        report_to="none",
        save_total_limit=3,
        remove_unused_columns=False,
        dataloader_num_workers=0,
        dataloader_pin_memory=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=lambda batch: {
            "input_ids": torch.tensor(batch["input_ids"]),
            "attention_mask": torch.tensor(batch["attention_mask"]),
            "labels": torch.tensor(batch["labels"]),
        },
    )

    print_section("🚀 开始训练")
    trainer.train()

    # 保存
    print_section("💾 保存模型")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(f"{OUTPUT_DIR}/lora_adapter")
    processor.save_pretrained(f"{OUTPUT_DIR}/lora_adapter")
    print(f"✅ 已保存到 {OUTPUT_DIR}/lora_adapter")

    elapsed = time.time() - start_time
    print_section(f"✅ 训练完成！总耗时: {elapsed:.0f} 秒")

if __name__ == "__main__":
    main()
