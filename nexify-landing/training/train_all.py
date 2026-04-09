#!/usr/bin/env python3
"""
Nexify 四大模型训练脚本 - 统一入口
支持 Cyber / Video / Flow / Analytics 四个模型训练
"""
# ⚠️ 必须在任何其他 import 之前设置环境变量！
import os, sys
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import json, time, argparse, warnings, random
warnings.filterwarnings("ignore")
sys.stdout.reconfigure(line_buffering=True)

# ── 路径配置 ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 模型基座（HF缓存路径，无需网络）
Qwen2_1_5B = os.path.expanduser(
    "~/.cache/huggingface/hub/models--Qwen--Qwen2.5-1.5B-Instruct"
    "/snapshots/989aa7980e4cf806f80c7fef2b1adb7bc71aa306"
)  # Cyber/Flow/Analytics
Qwen2_VL_2B = os.path.join(PROJECT_ROOT, "models", "Qwen2-VL-2B-Instruct")  # Video

# 训练数据目录
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")

# ── 超参数配置 ───────────────────────────────────────────
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
MAX_LENGTH = 512
NUM_EPOCHS = 3
BATCH_SIZE = 1
GRADIENT_ACCUMULATION = 4
LEARNING_RATE = 1e-4
SAVE_STEPS = 50
LOG_STEPS = 10
GRADIENT_CHECKPOINTING = True

# ═══════════════════════════════════════════════════════════

def print_section(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)
    sys.stdout.flush()

def detect_device():
    import torch
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0)
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon GPU"
    return "cpu", "CPU"

def print_params(model):
    import torch
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  可训练: {trainable/1e6:.2f}M ({trainable/total*100:.2f}%)")
    sys.stdout.flush()

def get_data_path(filename):
    return os.path.join(DATA_DIR, filename)

# ═══════════════════════════════════════════════════════════
# Cyber / Flow / Analytics 训练 (Qwen2.5-1.5B)
# ═══════════════════════════════════════════════════════════

def train_text_model(model_name, data_file):
    """训练文本模型（Cyber/Flow/Analytics）"""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from torch.optim import AdamW
    from torch.optim.lr_scheduler import LinearLR
    from peft import LoraConfig, get_peft_model
    from datasets import load_dataset

    print_section(f"🎯 训练 {model_name}")

    device, device_name = detect_device()
    print(f"  设备: {device.upper()} ({device_name})")
    sys.stdout.flush()

    # 加载 tokenizer
    print(f"  加载 tokenizer...")
    sys.stdout.flush()
    tok = AutoTokenizer.from_pretrained(Qwen2_1_5B, trust_remote_code=True)
    if tok.pad_token_id is None:
        tok.pad_token_id = tok.eos_token_id
    print(f"  tokenizer OK: vocab={tok.vocab_size}")
    sys.stdout.flush()

    # 加载模型
    print(f"  加载模型...")
    sys.stdout.flush()
    model = AutoModelForCausalLM.from_pretrained(
        Qwen2_1_5B,
        torch_dtype=torch.float16 if device != "cpu" else torch.float32,
        trust_remote_code=True,
    )
    if device != "cpu":
        model = model.to(device)
    print(f"  ✅ 模型加载完成")
    sys.stdout.flush()

    # LoRA 配置
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=LORA_DROPOUT,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    print(f"  LoRA: r={LORA_R}, α={LORA_ALPHA}")
    print_params(model)
    sys.stdout.flush()

    # 加载数据
    data_path = get_data_path(data_file)
    if not os.path.exists(data_path):
        print(f"  ❌ 数据文件不存在: {data_path}")
        sys.exit(1)
    print(f"  加载数据...")
    sys.stdout.flush()
    ds = load_dataset("json", data_files=data_path, split="train")
    print(f"  数据量: {len(ds)} 条")
    sys.stdout.flush()

    # 优化器
    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
        weight_decay=0.01,
    )
    total_steps = (len(ds) // BATCH_SIZE // GRADIENT_ACCUMULATION) * NUM_EPOCHS
    warmup_steps = max(2, total_steps // 20)
    scheduler = LinearLR(optimizer, start_factor=0.1, end_factor=1.0, total_iters=warmup_steps)

    os.makedirs(os.path.join(OUTPUT_DIR, model_name), exist_ok=True)
    model.train()
    global_step = 0
    start_time = time.time()
    best_loss = float("inf")

    print(f"\n  开始训练 (Epochs={NUM_EPOCHS}, Steps={total_steps})")
    sys.stdout.flush()

    for epoch in range(NUM_EPOCHS):
        epoch_loss = 0.0
        indices = list(range(len(ds)))
        random.seed(42 + epoch)
        random.shuffle(indices)

        for i, idx in enumerate(indices):
            example = ds[idx]
            messages = example["messages"]
            prompt = "".join(
                f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>\n"
                for msg in messages
            )
            prompt += "<|im_start|>assistant\n"

            enc = tok(prompt, max_length=MAX_LENGTH, truncation=True,
                      padding="max_length", return_tensors="pt")
            input_ids = enc["input_ids"].to(model.device)
            attention_mask = enc["attention_mask"].to(model.device)
            labels = input_ids.clone()
            labels[labels == tok.pad_token_id] = -100

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss / GRADIENT_ACCUMULATION
            loss.backward()
            epoch_loss += loss.item()

            if (i + 1) % GRADIENT_ACCUMULATION == 0 or (i + 1) == len(indices):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                if global_step < warmup_steps:
                    scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % LOG_STEPS == 0:
                    elapsed = time.time() - start_time
                    speed = global_step / elapsed if elapsed > 0 else 0
                    lr = optimizer.param_groups[0]["lr"]
                    print(
                        f"  Step {global_step}/{total_steps} | "
                        f"Loss: {loss.item()*GRADIENT_ACCUMULATION:.4f} | "
                        f"LR: {lr:.2e} | Speed: {speed:.1f} st/s"
                    )
                    sys.stdout.flush()

                if global_step % SAVE_STEPS == 0:
                    ckpt = os.path.join(OUTPUT_DIR, model_name, f"checkpoint-{global_step}")
                    model.save_pretrained(ckpt)
                    tok.save_pretrained(ckpt)
                    print(f"  💾 Checkpoint: {ckpt}")
                    sys.stdout.flush()

        avg_loss = epoch_loss / len(indices)
        elapsed = time.time() - start_time
        speed = global_step / elapsed if elapsed > 0 else 0
        print(f"\n  📊 Epoch {epoch+1}/{NUM_EPOCHS} 完成 | Avg Loss: {avg_loss:.4f} | Speed: {speed:.1f} st/s")
        sys.stdout.flush()
        if avg_loss < best_loss:
            best_loss = avg_loss

    # 保存最终模型
    final_path = os.path.join(OUTPUT_DIR, model_name, "lora_adapter")
    model.save_pretrained(final_path)
    tok.save_pretrained(final_path)

    elapsed = time.time() - start_time
    print(f"\n  ✅ {model_name} 训练完成!")
    print(f"  总耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"  最终 loss: {best_loss:.4f}")
    print(f"  输出: {final_path}")
    sys.stdout.flush()
    return final_path

# ═══════════════════════════════════════════════════════════
# Video Model 训练 (Qwen2-VL-2B)
# ═══════════════════════════════════════════════════════════

def train_video_model():
    """训练视频模型"""
    import torch
    from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
    from peft import LoraConfig, get_peft_model
    from torch.optim import AdamW
    from torch.optim.lr_scheduler import CosineAnnealingLR
    from datasets import load_dataset

    print_section("🎬 训练 Video Model")
    sys.stdout.flush()

    device, device_name = detect_device()
    torch_dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"  设备: {device.upper()} ({device_name})")
    sys.stdout.flush()

    if device == "cpu":
        print("  ⚠️ CPU 模式跳过训练")
        return None

    if not os.path.exists(Qwen2_VL_2B):
        print(f"  ❌ 模型不存在: {Qwen2_VL_2B}")
        sys.exit(1)

    # 加载
    print(f"  加载 Processor...")
    sys.stdout.flush()
    processor = AutoProcessor.from_pretrained(Qwen2_VL_2B, trust_remote_code=True, local_files_only=True)

    print(f"  加载模型...")
    sys.stdout.flush()
    model = Qwen2VLForConditionalGeneration.from_pretrained(
        Qwen2_VL_2B,
        torch_dtype=torch_dtype,
        trust_remote_code=True,
        local_files_only=True,
    )

    # 冻结 Vision Encoder
    for name, module in model.named_modules():
        if "visual" in name.lower():
            for p in module.parameters():
                p.requires_grad = False
    print("  Vision Encoder 已冻结")
    sys.stdout.flush()

    if GRADIENT_CHECKPOINTING and hasattr(model, "enable_gradient_checkpointing"):
        model.enable_gradient_checkpointing()

    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=[
            "self_attn.q_proj", "self_attn.k_proj",
            "self_attn.v_proj", "self_attn.o_proj",
            "mlp.gate_proj", "mlp.up_proj", "mlp.down_proj",
        ],
        lora_dropout=LORA_DROPOUT,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    print(f"  LoRA: r={LORA_R}, α={LORA_ALPHA}")
    print_params(model)
    model = model.to(device)
    model.train()
    sys.stdout.flush()

    # 数据
    data_path = get_data_path("video_train_v2.jsonl")
    if not os.path.exists(data_path):
        print(f"  ❌ 数据不存在: {data_path}")
        sys.exit(1)
    print(f"  加载数据...")
    sys.stdout.flush()
    ds = load_dataset("json", data_files=data_path, split="train")
    print(f"  数据量: {len(ds)} 条")
    sys.stdout.flush()

    # 优化器
    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
        weight_decay=0.01,
    )
    total_steps = (len(ds) // BATCH_SIZE // GRADIENT_ACCUMULATION) * NUM_EPOCHS
    scheduler = CosineAnnealingLR(optimizer, T_max=total_steps)

    os.makedirs(os.path.join(OUTPUT_DIR, "video_model"), exist_ok=True)
    global_step = 0
    start_time = time.time()

    print(f"\n  开始训练 (Epochs={NUM_EPOCHS}, Steps={total_steps})")
    sys.stdout.flush()

    for epoch in range(NUM_EPOCHS):
        model.train()
        epoch_loss = 0.0
        indices = list(range(len(ds)))
        random.seed(42 + epoch)
        random.shuffle(indices)

        for batch_idx, idx in enumerate(indices):
            try:
                example = ds[idx]
                messages = example["messages"]
                text = processor.tokenizer.apply_chat_template(
                    messages, tokenize=False, add_generation_prompt=False
                )
                tokens = processor.tokenizer(
                    text, max_length=MAX_LENGTH, truncation=True,
                    padding="max_length", return_tensors="pt"
                )
                input_ids = tokens["input_ids"].to(device)
                attention_mask = tokens["attention_mask"].to(device)
                labels = input_ids.clone()
                labels[labels == processor.tokenizer.pad_token_id] = -100

                outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
                loss = outputs.loss / GRADIENT_ACCUMULATION
                loss.backward()
                epoch_loss += loss.item()

                if (batch_idx + 1) % GRADIENT_ACCUMULATION == 0 or (batch_idx + 1) == len(indices):
                    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    optimizer.step()
                    scheduler.step()
                    optimizer.zero_grad()
                    global_step += 1

                    if global_step % LOG_STEPS == 0:
                        elapsed = time.time() - start_time
                        speed = global_step / elapsed if elapsed > 0 else 0
                        lr = scheduler.get_last_lr()[0]
                        print(
                            f"  Step {global_step}/{total_steps} | "
                            f"Loss: {loss.item()*GRADIENT_ACCUMULATION:.4f} | "
                            f"LR: {lr:.2e} | {speed:.1f} st/s"
                        )
                        sys.stdout.flush()

                    if global_step % SAVE_STEPS == 0:
                        ckpt = os.path.join(OUTPUT_DIR, "video_model", f"checkpoint-{global_step}")
                        model.save_pretrained(ckpt)
                        processor.save_pretrained(ckpt)
                        print(f"  💾 {ckpt}")
                        sys.stdout.flush()
            except Exception:
                continue

        avg_loss = epoch_loss / len(indices)
        elapsed = time.time() - start_time
        speed = global_step / elapsed if elapsed > 0 else 0
        print(f"\n  📊 Epoch {epoch+1}/{NUM_EPOCHS} | Avg Loss: {avg_loss:.4f} | Speed: {speed:.1f} st/s")
        sys.stdout.flush()

    final_path = os.path.join(OUTPUT_DIR, "video_model", "lora_adapter")
    model.save_pretrained(final_path)
    processor.save_pretrained(final_path)

    elapsed = time.time() - start_time
    print(f"\n  ✅ Video Model 训练完成! ({elapsed/60:.1f}min)")
    print(f"  输出: {final_path}")
    sys.stdout.flush()
    return final_path

# ═══════════════════════════════════════════════════════════
# 主函数
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="all",
                        choices=["all", "cyber", "video", "flow", "analytics"])
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    models_to_train = []
    if args.model == "all":
        models_to_train = ["cyber", "video", "flow", "analytics"]
    else:
        models_to_train = [args.model]

    results = {}
    for model_name in models_to_train:
        try:
            if model_name == "video":
                results[model_name] = train_video_model()
            else:
                data_map = {
                    "cyber": "cyber_train.jsonl",
                    "flow": "flow_train.jsonl",
                    "analytics": "analytics_train.jsonl",
                }
                results[model_name] = train_text_model(
                    model_name.upper(), data_map[model_name]
                )
        except KeyboardInterrupt:
            print(f"\n  ⚠️ {model_name} 被中断")
            break
        except Exception as e:
            print(f"\n  ❌ {model_name} 失败: {e}")
            import traceback
            traceback.print_exc()
            continue

    print("\n" + "="*55)
    print("  训练汇总")
    print("="*55)
    for name, path in results.items():
        status = "✅" if path else "⚠️"
        print(f"  {status} {name}: {path or '失败'}")
    print()
