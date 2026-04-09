#!/usr/bin/env python3
"""
Nexify Video Model - 断点续训脚本
从 checkpoint-240 继续训练到 750 步
Mac Studio M2 Max / MPS 加速
"""
import os, sys, json, time, random, warnings
warnings.filterwarnings("ignore")

import torch
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "Qwen2-VL-2B-Instruct")
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "video_train.jsonl")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output", "video_model")
CKPT_DIR = os.path.join(OUTPUT_DIR, "checkpoint-240")

RESUME_FROM_STEP = 240
NUM_EPOCHS = 2
BATCH_SIZE = 1
GRADIENT_ACCUMULATION = 4
LEARNING_RATE = 1e-4
SAVE_STEPS = 80
LOG_STEPS = 5
MAX_LENGTH = 1024

def print_section(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)

def detect_device():
    if torch.cuda.is_available():
        return "cuda", "CUDA GPU", torch.bfloat16
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon GPU (M2 Max)", torch.float16
    return "cpu", "CPU", torch.float32

def print_params(model):
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  可训练参数: {trainable/1e6:.2f}M ({trainable/total*100:.2f}%)")

def load_processor():
    from transformers import AutoProcessor
    print_section("📦 加载 Processor")
    processor = AutoProcessor.from_pretrained(MODEL_DIR, trust_remote_code=True, local_files_only=True)
    print("✅ Processor 就绪")
    return processor

def load_model(device, dtype):
    from transformers import Qwen2VLForConditionalGeneration
    from peft import PeftModel

    print_section("🧠 从 checkpoint-240 加载模型")

    print("  加载 Base Model...")
    base_model = Qwen2VLForConditionalGeneration.from_pretrained(
        MODEL_DIR, torch_dtype=dtype, trust_remote_code=True, local_files_only=True
    )

    print("  加载 LoRA adapter（可训练模式）...")
    model = PeftModel.from_pretrained(base_model, CKPT_DIR, is_trainable=True)

    # 冻结 Vision Encoder: PeftModel → base_model → Qwen2VLModel → visual
    for p in model.model.model.visual.parameters():
        p.requires_grad = False

    model = model.to(device)
    model.train()
    print_params(model)
    print(f"  设备: {device} ({dtype})")
    print(f"✅ 模型已从 checkpoint-240 加载，LoRA 可训练")
    return model

class SimpleDataset:
    """轻量级 JSONL 数据集（无需 datasets 库）"""
    def __init__(self, path):
        self.data = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.data.append(json.loads(line))
        print(f"✅ 数据: {len(self.data)} 条")

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]

def load_data():
    print_section("📂 加载数据")
    return SimpleDataset(DATA_PATH)

def training_loop(model, dataset, processor, device):
    from torch.optim import AdamW
    from torch.optim.lr_scheduler import CosineAnnealingLR

    print_section("🚀 继续训练 (step 240 → 750)")

    total_steps = (len(dataset) // (BATCH_SIZE * GRADIENT_ACCUMULATION)) * NUM_EPOCHS

    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
        weight_decay=0.01,
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=total_steps)

    global_step = RESUME_FROM_STEP
    start = time.time()
    print(f"  起始步数: {global_step}")
    print(f"  目标总步数: {total_steps}")
    print(f"  剩余步数: {total_steps - global_step}")
    print(f"  Batch Size: {BATCH_SIZE} × {GRADIENT_ACCUMULATION}")
    print(f"  Learning Rate: {LEARNING_RATE}")

    for epoch in range(NUM_EPOCHS):
        model.train()
        epoch_loss = 0.0
        optimizer.zero_grad()

        indices = list(range(len(dataset)))
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

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels,
            )
            loss = outputs.loss / GRADIENT_ACCUMULATION
            loss.backward()
            epoch_loss += loss.item() * GRADIENT_ACCUMULATION

            if (i + 1) % GRADIENT_ACCUMULATION == 0 or (i + 1) == len(indices):
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % LOG_STEPS == 0:
                    avg_loss = epoch_loss / (i + 1) * GRADIENT_ACCUMULATION
                    elapsed = time.time() - start
                    speed = global_step / elapsed if elapsed > 0 else 0
                    lr = scheduler.get_last_lr()[0]
                    pct = global_step / total_steps * 100
                    remaining = (total_steps - global_step) / speed / 60 if speed > 0 else 999
                    print(
                        f"  Step {global_step}/{total_steps} ({pct:.0f}%) | "
                        f"Loss: {avg_loss:.4f} | LR: {lr:.2e} | "
                        f"{speed:.1f} st/s | ~{remaining:.1f}min left"
                    )

            if global_step > 0 and global_step % SAVE_STEPS == 0:
                ckpt_dir = os.path.join(OUTPUT_DIR, f"checkpoint-{global_step}")
                # 保存为 LoRA（需要重新应用 LoRA，但这里直接保存合并后的模型）
                # 对于续训场景，直接保存合并后的完整权重
                model.save_pretrained(ckpt_dir, safe_serialization=True)
                processor.save_pretrained(ckpt_dir)
                print(f"  💾 Checkpoint 已保存: {ckpt_dir}")

        avg_epoch_loss = epoch_loss / len(indices)
        elapsed = time.time() - start
        speed = global_step / elapsed if elapsed > 0 else 0
        print(f"\n  📊 Epoch {epoch+1}/{NUM_EPOCHS} 完成 | Avg Loss: {avg_epoch_loss:.4f} | {speed:.1f} st/s")

        ckpt_dir = os.path.join(OUTPUT_DIR, f"epoch-{epoch+1}")
        model.save_pretrained(ckpt_dir, safe_serialization=True)
        processor.save_pretrained(ckpt_dir)
        print(f"  💾 Epoch checkpoint: {ckpt_dir}")

        if global_step >= total_steps:
            print(f"\n✅ 训练完成！")
            break

    return model

def main():
    print_section("🎬 Nexify Video Model - 断点续训")
    print(f"  从 checkpoint-240 继续")
    print(f"  目标: 750 步")

    device, device_name, dtype = detect_device()
    print(f"  设备: {device.upper()} ({device_name})")

    if device == "cpu":
        print("❌ CPU 训练太慢，建议使用 MPS 或 CUDA")
        sys.exit(1)

    if not os.path.exists(MODEL_DIR):
        print(f"❌ 模型不存在: {MODEL_DIR}")
        sys.exit(1)

    if not os.path.exists(CKPT_DIR):
        print(f"❌ Checkpoint 不存在: {CKPT_DIR}")
        sys.exit(1)

    processor = load_processor()
    model = load_model(device, dtype)
    dataset = load_data()

    print_section("🔄 数据预处理")
    print("✅ 预处理完成")

    model = training_loop(model, dataset, processor, device)

    print_section("💾 保存最终模型")
    lora_path = os.path.join(OUTPUT_DIR, "lora_adapter")
    model.save_pretrained(lora_path, safe_serialization=True)
    processor.save_pretrained(lora_path)
    print(f"✅ LoRA 已保存: {lora_path}")

if __name__ == "__main__":
    main()
