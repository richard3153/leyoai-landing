#!/usr/bin/env python3
"""
Nexify Video Model 重训脚本
基座: Qwen2.5-1.5B-Instruct (纯文本，MPS 完全支持)
数据: 1500 条视频安全 QA
目标: 上传至 FFZwai/nexify-video-safety-v2
"""
import os, sys, json, time, warnings
warnings.filterwarnings("ignore")

import torch
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

# ── 配置 ──────────────────────────────────────────────────
BASE_MODEL   = "Qwen/Qwen2.5-1.5B-Instruct"   # 从 HF 缓存加载
DATA_PATH    = os.path.join(os.path.dirname(__file__), "../data/video_train.jsonl")
OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), "../output/video_model_v2")
HF_REPO      = "FFZwai/nexify-video-safety-v2"

LORA_R       = 16
LORA_ALPHA   = 32
LORA_DROPOUT = 0.05
MAX_LENGTH   = 512
NUM_EPOCHS   = 3
BATCH_SIZE   = 2
GRAD_ACCUM   = 4
LR           = 2e-4
WARMUP_STEPS = 10
SAVE_STEPS   = 100
LOG_STEPS    = 10
# ─────────────────────────────────────────────────────────

def detect_device():
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0)
        return "cuda", name, torch.bfloat16
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon MPS", torch.float16
    return "cpu", "CPU", torch.float32

def load_data(path):
    samples = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            msgs = obj.get("messages", [])
            if len(msgs) >= 2:
                user_msg = msgs[0]
                asst_msg = msgs[1]
                # 提取文本
                if isinstance(user_msg["content"], list):
                    user_text = " ".join(
                        c.get("text", "") for c in user_msg["content"]
                        if isinstance(c, dict) and c.get("type") == "text"
                    )
                else:
                    user_text = str(user_msg["content"])
                asst_text = asst_msg["content"] if isinstance(asst_msg["content"], str) else str(asst_msg["content"])
                samples.append({"user": user_text.strip(), "assistant": asst_text.strip()})
    return samples

def main():
    device, device_name, dtype = detect_device()
    print(f"\n{'='*55}")
    print(f"  Nexify Video Model 重训")
    print(f"  设备: {device_name}")
    print(f"  基座: {BASE_MODEL}")
    print(f"  数据: {DATA_PATH}")
    print(f"{'='*55}\n")

    # 加载数据
    samples = load_data(DATA_PATH)
    print(f"✅ 数据加载: {len(samples)} 条")

    # 加载 tokenizer
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    print(f"✅ Tokenizer 就绪")

    # 加载模型
    from transformers import AutoModelForCausalLM
    from peft import LoraConfig, get_peft_model, TaskType

    print(f"⏳ 加载模型 ({dtype})...")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=dtype,
        trust_remote_code=True,
    )
    model = model.to(device)

    # LoRA 配置
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"✅ LoRA 就绪: {trainable/1e6:.2f}M 可训练 / {total/1e9:.2f}B 总参数 ({trainable/total*100:.2f}%)")

    # 构建 Dataset
    import torch
    from torch.utils.data import Dataset, DataLoader

    class VideoSafetyDataset(Dataset):
        def __init__(self, samples, tokenizer, max_length):
            self.items = []
            for s in samples:
                prompt = (
                    f"<|im_start|>system\n你是 Nexify Video Safety AI，专注视频内容安全分析。"
                    f"<|im_end|>\n<|im_start|>user\n{s['user']}<|im_end|>\n"
                    f"<|im_start|>assistant\n{s['assistant']}<|im_end|>"
                )
                enc = tokenizer(
                    prompt,
                    max_length=max_length,
                    truncation=True,
                    padding="max_length",
                    return_tensors="pt",
                )
                input_ids = enc["input_ids"].squeeze(0)
                labels = input_ids.clone()
                # 只对 assistant 部分计算 loss
                asst_start = prompt.rfind("<|im_start|>assistant\n") + len("<|im_start|>assistant\n")
                asst_token_start = len(tokenizer(prompt[:asst_start], add_special_tokens=False)["input_ids"])
                labels[:asst_token_start] = -100
                self.items.append({"input_ids": input_ids, "labels": labels,
                                   "attention_mask": enc["attention_mask"].squeeze(0)})

        def __len__(self): return len(self.items)
        def __getitem__(self, i): return self.items[i]

    dataset = VideoSafetyDataset(samples, tokenizer, MAX_LENGTH)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    print(f"✅ Dataset: {len(dataset)} 条, {len(loader)} batches/epoch")

    # 训练
    from torch.optim import AdamW
    from transformers import get_linear_schedule_with_warmup

    optimizer = AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total_steps = len(loader) * NUM_EPOCHS // GRAD_ACCUM
    scheduler = get_linear_schedule_with_warmup(optimizer, WARMUP_STEPS, total_steps)

    model.train()
    global_step = 0
    best_loss = float("inf")
    start_time = time.time()

    print(f"\n{'='*55}")
    print(f"  开始训练: {NUM_EPOCHS} epochs, {total_steps} steps")
    print(f"{'='*55}")

    for epoch in range(NUM_EPOCHS):
        epoch_loss = 0.0
        epoch_steps = 0
        optimizer.zero_grad()

        for batch_idx, batch in enumerate(loader):
            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)
            attention_mask = batch["attention_mask"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss / GRAD_ACCUM
            loss.backward()

            epoch_loss += outputs.loss.item()
            epoch_steps += 1

            if (batch_idx + 1) % GRAD_ACCUM == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % LOG_STEPS == 0:
                    avg = epoch_loss / epoch_steps
                    elapsed = time.time() - start_time
                    print(f"  Epoch {epoch+1}/{NUM_EPOCHS} | Step {global_step}/{total_steps} | "
                          f"Loss {avg:.4f} | {elapsed:.0f}s")

                if global_step % SAVE_STEPS == 0:
                    ckpt = os.path.join(OUTPUT_DIR, f"checkpoint-{global_step}")
                    model.save_pretrained(ckpt)
                    tokenizer.save_pretrained(ckpt)
                    print(f"  💾 Checkpoint 保存: {ckpt}")

        avg_epoch_loss = epoch_loss / epoch_steps
        print(f"\n  ✅ Epoch {epoch+1} 完成 | Avg Loss: {avg_epoch_loss:.4f}")
        if avg_epoch_loss < best_loss:
            best_loss = avg_epoch_loss

    # 保存最终模型
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    final_path = os.path.join(OUTPUT_DIR, "final_lora")
    model.save_pretrained(final_path)
    tokenizer.save_pretrained(final_path)
    elapsed = time.time() - start_time
    print(f"\n{'='*55}")
    print(f"  ✅ 训练完成!")
    print(f"  最终 Loss: {best_loss:.4f}")
    print(f"  总耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"  模型保存: {final_path}")
    print(f"{'='*55}")

    # 上传 HF
    print(f"\n⏳ 上传至 HuggingFace: {HF_REPO} ...")
    from huggingface_hub import HfApi
    api = HfApi()
    try:
        api.create_repo(repo_id=HF_REPO, repo_type="model", exist_ok=True)
        api.upload_folder(folder_path=final_path, repo_id=HF_REPO, repo_type="model")
        print(f"✅ 上传完成: https://huggingface.co/{HF_REPO}")
    except Exception as e:
        print(f"⚠️  上传失败: {e}")
        print(f"   手动上传: huggingface-cli upload {HF_REPO} {final_path}")

if __name__ == "__main__":
    main()
