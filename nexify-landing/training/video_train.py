#!/usr/bin/env python3
"""
Nexify Video Model 训练脚本 - Qwen2-VL-2B-Instruct + QLoRA
Mac Studio M2 Max / Linux CUDA / Google Colab
"""
import os
import sys
import json
import time
import math
import warnings
warnings.filterwarnings("ignore")

import torch
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

# ── 路径配置 ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "Qwen2-VL-2B-Instruct")
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "video_train.jsonl")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output", "video_model")

# ── 训练超参数 ────────────────────────────────────────────
LORA_R = 8
LORA_ALPHA = 16
LORA_DROPOUT = 0.05
MAX_LENGTH = 1024
NUM_EPOCHS = 2
BATCH_SIZE = 1
GRADIENT_ACCUMULATION = 4
LEARNING_RATE = 1e-4
WARMUP_STEPS = 5
SAVE_STEPS = 80
LOG_STEPS = 5
GRADIENT_CHECKPOINTING = True   # 降低显存

# ─────────────────────────────────────────────────────────

def print_section(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)

def detect_device():
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0), torch.bfloat16
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon GPU (M2 Max)", torch.float16
    return "cpu", "CPU", torch.float32

def print_params(model):
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  可训练参数: {trainable/1e6:.2f}M ({trainable/total*100:.2f}%)")
    print(f"  总参数: {total/1e9:.2f}B")

def load_processor():
    from transformers import AutoProcessor
    print_section(f"📦 加载 Processor")
    processor = AutoProcessor.from_pretrained(
        MODEL_DIR, trust_remote_code=True, local_files_only=True
    )
    print(f"✅ Processor 就绪")
    return processor

def load_model(device, torch_dtype):
    from transformers import Qwen2VLForConditionalGeneration
    from peft import LoraConfig, get_peft_model

    print_section("🧠 加载模型")

    # 先在 CPU 加载，再移到 MPS
    model = Qwen2VLForConditionalGeneration.from_pretrained(
        MODEL_DIR,
        torch_dtype=torch_dtype,
        trust_remote_code=True,
        local_files_only=True,
    )
    print(f"  模型类型: {type(model).__name__}")
    total_params = sum(p.numel() for p in model.parameters()) / 1e9
    print(f"  参数量: {total_params:.2f}B")

    # 冻结 Vision Encoder（节省显存，我们只做文本微调）
    # 安全遍历：逐层检查，避免 AttributeError
    def freeze_visual_encoder(model):
        try:
            # 尝试多种路径
            if hasattr(model, 'base_model') and hasattr(model.base_model, 'model'):
                base = model.base_model.model
                if hasattr(base, 'visual'):
                    for p in base.visual.parameters():
                        p.requires_grad = False
                    print(f"  ✅ 冻结 Vision Encoder (path: base_model.model.visual)")
                    return
            if hasattr(model, 'model') and hasattr(model.model, 'visual'):
                for p in model.model.visual.parameters():
                    p.requires_grad = False
                print(f"  ✅ 冻结 Vision Encoder (path: model.model.visual)")
                return
            # 遍历寻找 visual
            for name, module in model.named_modules():
                if 'visual' in name.lower():
                    for p in module.parameters():
                        p.requires_grad = False
                    print(f"  ✅ 冻结 Vision Encoder (found: {name})")
                    return
            print(f"  ⚠️ 未找到 Vision Encoder，跳过冻结")
        except Exception as e:
            print(f"  ⚠️ 冻结 Vision Encoder 失败: {e}")

    freeze_visual_encoder(model)
    print(f"  Vision Encoder 已冻结（节省显存）")

    # Gradient Checkpointing
    if GRADIENT_CHECKPOINTING and hasattr(model, 'enable_gradient_checkpointing'):
        model.enable_gradient_checkpointing()
        print(f"  Gradient Checkpointing: ✅")

    # QLoRA 配置（针对 Qwen2-VL 的注意力层）
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=[
            # 文本注意力层（Qwen2-VL 内部命名为 self_attn.*）
            "self_attn.q_proj",
            "self_attn.k_proj",
            "self_attn.v_proj",
            "self_attn.o_proj",
            # FFN 层
            "mlp.gate_proj",
            "mlp.up_proj",
            "mlp.down_proj",
        ],
        task_type=None,
        lora_dropout=LORA_DROPOUT,
        bias="none",
    )

    model = get_peft_model(model, lora_config)
    print(f"\n  LoRA 配置: r={LORA_R}, α={LORA_ALPHA}")
    print_params(model)

    # 移到设备
    model = model.to(device)
    model.train()
    print(f"  设备: {device} ({torch_dtype})")
    print(f"✅ 模型加载完成")
    return model

def load_data():
    from datasets import load_dataset
    print_section("📂 加载数据")
    if not os.path.exists(DATA_PATH):
        print(f"❌ 数据文件不存在: {DATA_PATH}")
        print("   请先运行: python video_prepare_data.py")
        sys.exit(1)

    ds = load_dataset("json", data_files=DATA_PATH, split="train")
    print(f"✅ 数据: {len(ds)} 条")
    return ds

def preprocess(example, processor):
    """将对话消息转为训练文本格式"""
    messages = example["messages"]
    text = processor.tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=False
    )
    return {"text": text}

def tokenize_fn(example, processor):
    """Tokenize 文本"""
    result = processor.tokenizer(
        example["text"],
        max_length=MAX_LENGTH,
        truncation=True,
        padding="max_length",
        return_tensors=None,
    )
    result["labels"] = result["input_ids"].copy()
    return result

def data_collator(features, device):
    """自定义 collator，支持 MPS"""
    batch = {}
    for key in ["input_ids", "attention_mask", "labels"]:
        if key in features[0]:
            tensors = [torch.tensor(f[key]) for f in features]
            batch[key] = torch.stack(tensors).to(device)
    return batch

def training_loop(model, dataset, processor, device, torch_dtype):
    from torch.optim import AdamW
    from torch.optim.lr_scheduler import CosineAnnealingLR

    print_section("🔧 训练配置")
    print(f"  Epochs: {NUM_EPOCHS}")
    print(f"  Batch Size: {BATCH_SIZE} × {GRADIENT_ACCUMULATION} = {BATCH_SIZE * GRADIENT_ACCUMULATION}")
    print(f"  Max Length: {MAX_LENGTH}")
    print(f"  Learning Rate: {LEARNING_RATE}")
    print(f"  LoRA r={LORA_R}, α={LORA_ALPHA}")

    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
        weight_decay=0.01,
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS * len(dataset))

    total_steps = (len(dataset) // (BATCH_SIZE * GRADIENT_ACCUMULATION)) * NUM_EPOCHS
    print(f"  总步数: {total_steps}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    best_loss = float("inf")
    global_step = 0
    start = time.time()

    for epoch in range(NUM_EPOCHS):
        model.train()
        epoch_loss = 0.0
        optimizer.zero_grad()

        indices = list(range(len(dataset)))
        # 简单 shuffle
        import random
        random.seed(42 + epoch)
        random.shuffle(indices)

        for i, idx in enumerate(indices):
            example = dataset[idx]
            text = processor.tokenizer.apply_chat_template(
                example["messages"], tokenize=False, add_generation_prompt=False
            )
            tokens = processor.tokenizer(
                text, max_length=MAX_LENGTH, truncation=True,
                padding="max_length", return_tensors="pt"
            )
            input_ids = tokens["input_ids"].to(device)
            attention_mask = tokens["attention_mask"].to(device)
            labels = input_ids.clone()
            labels[labels == processor.tokenizer.pad_token_id] = -100

            # 前向传播
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels,
            )
            loss = outputs.loss / GRADIENT_ACCUMULATION
            loss.backward()

            epoch_loss += loss.item() * GRADIENT_ACCUMULATION

            # Gradient accumulation step
            if (i + 1) % GRADIENT_ACCUMULATION == 0 or (i + 1) == len(indices):
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % LOG_STEPS == 0:
                    avg_loss = epoch_loss / (i + 1) * GRADIENT_ACCUMULATION
                    elapsed = time.time() - start
                    lr = scheduler.get_last_lr()[0]
                    speed = global_step / elapsed if elapsed > 0 else 0
                    print(
                        f"  Step {global_step}/{total_steps} | "
                        f"Loss: {avg_loss:.4f} | "
                        f"LR: {lr:.2e} | "
                        f"Speed: {speed:.1f} st/s"
                    )

            # Checkpoint 保存
            if global_step > 0 and global_step % SAVE_STEPS == 0:
                ckpt_dir = os.path.join(OUTPUT_DIR, f"checkpoint-{global_step}")
                model.save_pretrained(ckpt_dir)
                processor.save_pretrained(ckpt_dir)
                print(f"  💾 Checkpoint 已保存: {ckpt_dir}")

        # Epoch 结束
        avg_epoch_loss = epoch_loss / len(indices)
        elapsed = time.time() - start
        speed = global_step / elapsed if elapsed > 0 else 0
        print(f"\n  📊 Epoch {epoch+1}/{NUM_EPOCHS} 完成 | Avg Loss: {avg_epoch_loss:.4f} | Speed: {speed:.1f} st/s")

        # 保存 epoch checkpoint
        ckpt_dir = os.path.join(OUTPUT_DIR, f"epoch-{epoch+1}")
        model.save_pretrained(ckpt_dir)
        processor.save_pretrained(ckpt_dir)
        print(f"  💾 Epoch checkpoint: {ckpt_dir}")

    return model

def main():
    print_section("🎬 Nexify Video Model 训练")
    print(f"  模型: Qwen2-VL-2B-Instruct")
    print(f"  数据: {DATA_PATH}")
    print(f"  输出: {OUTPUT_DIR}")

    device, device_name, torch_dtype = detect_device()
    print(f"  设备: {device.upper()} ({device_name})")

    if device == "cpu":
        print("❌ CPU 训练太慢，建议使用 MPS 或 CUDA")
        sys.exit(1)

    if not os.path.exists(MODEL_DIR):
        print(f"❌ 模型不存在: {MODEL_DIR}")
        sys.exit(1)

    processor = load_processor()
    model = load_model(device, torch_dtype)
    dataset = load_data()

    # 预处理
    print_section("🔄 数据预处理")
    dataset = dataset.map(
        lambda ex: preprocess(ex, processor),
        remove_columns=[col for col in dataset.column_names if col != "messages"],
    )
    print(f"✅ 预处理完成")

    # 开始训练
    print_section("🚀 开始训练")
    train_start = time.time()
    model = training_loop(model, dataset, processor, device, torch_dtype)

    # 保存最终模型
    print_section("💾 保存模型")
    lora_path = os.path.join(OUTPUT_DIR, "lora_adapter")
    model.save_pretrained(lora_path)
    processor.save_pretrained(lora_path)
    print(f"✅ LoRA 已保存: {lora_path}")

    total_time = time.time() - train_start
    print(f"\n🎉 训练完成！总耗时: {total_time:.0f}s ({total_time/60:.1f}min)")

if __name__ == "__main__":
    main()
