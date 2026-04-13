#!/usr/bin/env python3
"""
Nexify Video Safety 模型训练
基座: Qwen2.5-1.5B-Instruct (MPS 完美支持)
LoRA: rank=16, 训练注意力+MLP层
数据: video_train.jsonl (1500条视频安全QA)
目标: 专业的视频内容安全分析助手
"""
import os, sys, json, time, warnings
warnings.filterwarnings("ignore")
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# ── 配置 ──────────────────────────────────────────────────
BASE_MODEL = os.path.expanduser(
    "~/.cache/huggingface/hub/models--Qwen--Qwen2.5-1.5B-Instruct/snapshots/"
    + os.listdir(os.path.expanduser("~/.cache/huggingface/hub/models--Qwen--Qwen2.5-1.5B-Instruct/snapshots"))[0]
)
DATA_PATH   = os.path.join(os.path.dirname(__file__), "../data/video_train.jsonl")
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "../output/video_safety_lora")
HF_REPO     = "FFZwai/qwen2.5-1.5b-video-safety"

LORA_R       = 16
LORA_ALPHA   = 32
LORA_DROPOUT = 0.05
MAX_LENGTH   = 512
NUM_EPOCHS   = 3
BATCH_SIZE   = 2
GRAD_ACCUM   = 4       # effective batch = 8
LR           = 5e-5
WARMUP_STEPS = 10
SAVE_STEPS   = 80
LOG_STEPS    = 5
# ─────────────────────────────────────────────────────────

def detect_device():
    import torch
    if torch.cuda.is_available():
        return "cuda", "NVIDIA GPU", torch.bfloat16
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon MPS", torch.float16
    return "cpu", "CPU", torch.float32

def load_data(path):
    samples = []
    with open(path) as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            msgs = obj.get("messages", [])
            if len(msgs) < 2:
                continue

            user_raw = msgs[0]["content"]
            asst_raw = msgs[1]["content"]

            if isinstance(user_raw, list):
                user_text = " ".join(
                    c.get("text", "") for c in user_raw
                    if isinstance(c, dict) and c.get("type") == "text"
                )
            else:
                user_text = str(user_raw)

            if isinstance(asst_raw, str):
                asst_text = asst_raw
            else:
                asst_text = str(asst_raw)

            samples.append({
                "id":     obj.get("id", f"s_{i}"),
                "user":   user_text.strip(),
                "assistant": asst_text.strip(),
                "type":   obj.get("type", "video_security_qa"),
            })
    return samples

def build_sample(sample, tokenizer, max_len=MAX_LENGTH):
    """构建训练样本: system + user + assistant"""
    messages = [
        {"role": "system", "content": (
            "你是一个专业的视频内容安全分析助手。分析视频中的人物行为、场景元素和潜在安全风险，"
            "给出简洁、专业、有帮助的安全建议。回答要针对具体内容，避免泛泛而谈。"
        )},
        {"role": "user", "content": sample["user"]},
        {"role": "assistant", "content": sample["assistant"]},
    ]

    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=False
    )
    enc = tokenizer(
        prompt, max_length=max_len, truncation=True,
        padding="max_length", return_tensors="pt"
    )
    input_ids = enc["input_ids"].squeeze(0)
    labels = input_ids.clone()

    # mask user+system → 只对 assistant 部分计算 loss
    asst_start_id = tokenizer.encode(
        "<|im_start|>assistant\n", add_special_tokens=False
    )[0]
    positions = (input_ids == asst_start_id).nonzero(as_tuple=True)[0]
    if len(positions) > 1:
        labels[:positions[1].item()] = -100
    else:
        labels[:5] = -100

    return {
        "input_ids":      input_ids,
        "attention_mask": enc["attention_mask"].squeeze(0),
        "labels":         labels,
    }

class VideoSafetyDataset:
    def __init__(self, samples, tokenizer):
        self.samples = samples
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return build_sample(self.samples[idx], self.tokenizer)

def collate(batch):
    import torch
    return {
        "input_ids":      torch.stack([b["input_ids"] for b in batch]),
        "attention_mask": torch.stack([b["attention_mask"] for b in batch]),
        "labels":         torch.stack([b["labels"] for b in batch]),
    }

def main():
    import torch
    from torch.utils.data import DataLoader
    from torch.optim import AdamW
    from transformers import get_linear_schedule_with_warmup
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import LoraConfig, get_peft_model, TaskType
    import gc

    device, device_name, dtype = detect_device()
    print(f"\n{'='*60}")
    print(f"  Nexify Video Safety LoRA 训练")
    print(f"  设备: {device_name} ({device})")
    print(f"  基座: Qwen2.5-1.5B-Instruct")
    print(f"  数据: video_train.jsonl")
    print(f"{'='*60}\n")

    # 加载 tokenizer
    print("⏳ 加载 Tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL, local_files_only=True, use_fast=False
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 加载数据
    samples = load_data(DATA_PATH)
    print(f"✅ 数据: {len(samples)} 条")

    # 构建 dataset
    dataset = VideoSafetyDataset(samples, tokenizer)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE,
                       shuffle=True, num_workers=0, collate_fn=collate)
    print(f"   Batches: {len(loader)} (batch_size={BATCH_SIZE}, "
          f"grad_accum={GRAD_ACCUM}, effective={BATCH_SIZE*GRAD_ACCUM})")

    # 加载模型（两步：CPU加载 → MPS移动，避免device_map卡死）
    print("⏳ Step 1/2: CPU 加载...")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, local_files_only=True,
        torch_dtype=dtype,
    )
    print(f"  ✅ CPU 加载完成 | {model.get_memory_footprint()/1e9:.2f}GB")

    print("⏳ Step 2/2: 移动到 MPS...")
    model = model.to(device)
    print(f"✅ 模型就绪 ({device})")

    # LoRA
    print("⏳ 应用 LoRA...")
    lora_cfg = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
        bias="none",
    )
    model = get_peft_model(model, lora_cfg)

    # 移动到设备
    model = model.to(device)
    tp = sum(p.numel() for p in model.parameters() if p.requires_grad)
    tt = sum(p.numel() for p in model.parameters())
    print(f"✅ LoRA: {tp/1e6:.2f}M 参数 ({tp/tt*100:.3f}% of {tt/1e9:.2f}B)")

    # 梯度验证
    print("🔍 梯度验证...")
    model.train()
    batch0 = collate([dataset[0]])
    for k, v in batch0.items():
        batch0[k] = v.to(device)
    try:
        out = model(**batch0)
        out.loss.backward()
        grad_ok = any(
            p.grad is not None and p.grad.abs().sum() > 0
            for p in model.parameters() if p.requires_grad
        )
        if grad_ok:
            grad_sum = sum(p.grad.abs().sum().item()
                         for p in model.parameters() if p.requires_grad and p.grad is not None)
            print(f"  ✅ 梯度正常 | 梯度总和: {grad_sum:.6f}")
        else:
            print("  ⚠️  无有效梯度")
    except Exception as ge:
        print(f"  ⚠️  梯度验证异常: {ge}")
    model.zero_grad()
    gc.collect()

    # 训练
    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR, weight_decay=0.01
    )
    total_steps = len(loader) * NUM_EPOCHS // GRAD_ACCUM
    scheduler = get_linear_schedule_with_warmup(optimizer, WARMUP_STEPS, total_steps)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.train()
    global_step = 0
    best_loss = float("inf")
    epoch_losses = []
    start_time = time.time()

    print(f"\n{'='*60}")
    print(f"  训练开始")
    print(f"  Epochs: {NUM_EPOCHS} | Steps: {total_steps}")
    print(f"  LR: {LR} | Batch(effective): {BATCH_SIZE*GRAD_ACCUM}")
    print(f"{'='*60}\n")

    for epoch in range(NUM_EPOCHS):
        epoch_loss = 0.0
        epoch_steps = 0
        optimizer.zero_grad()

        for batch in loader:
            input_ids  = batch["input_ids"].to(device)
            labels     = batch["labels"].to(device)
            attention  = batch["attention_mask"].to(device)

            outputs = model(input_ids=input_ids,
                          attention_mask=attention,
                          labels=labels)
            loss = outputs.loss / GRAD_ACCUM
            loss.backward()
            epoch_loss += outputs.loss.item()
            epoch_steps += 1

            if epoch_steps % GRAD_ACCUM == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % LOG_STEPS == 0:
                    elapsed = time.time() - start_time
                    avg_loss = epoch_loss / max(epoch_steps, 1)
                    print(f"  Epoch {epoch+1}/{NUM_EPOCHS} | "
                          f"Step {global_step}/{total_steps} | "
                          f"Loss {avg_loss:.4f} | {elapsed:.0f}s | "
                          f"{device.upper()}")

                if global_step % SAVE_STEPS == 0:
                    ckpt = os.path.join(OUTPUT_DIR, f"checkpoint-{global_step}")
                    model.save_pretrained(ckpt)
                    print(f"  💾 保存: {ckpt}")

        avg_epoch_loss = epoch_loss / max(epoch_steps, 1)
        epoch_losses.append(avg_epoch_loss)
        print(f"\n  ✅ Epoch {epoch+1}/{NUM_EPOCHS} 完成 | "
              f"Avg Loss: {avg_epoch_loss:.4f}")
        if avg_epoch_loss < best_loss:
            best_loss = avg_epoch_loss

    # 保存最终模型
    final_path = os.path.join(OUTPUT_DIR, "final_lora")
    model.save_pretrained(final_path)
    elapsed = time.time() - start_time

    print(f"\n{'='*60}")
    print(f"  ✅ 训练完成!")
    print(f"  最终 Loss: {best_loss:.4f}")
    print(f"  总耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"  模型: {final_path}")
    print(f"{'='*60}")

    # 推理验证
    print("\n🔍 推理验证 (保存前)...")
    model.eval()
    test_input = (
        "请分析这段视频：电脑突然弹窗说中了病毒要求付费修复，这是安全风险吗？"
    )
    ids = tokenizer(test_input, return_tensors="pt").to(device)
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=100,
                           do_sample=True, temperature=0.7)
    reply = tokenizer.decode(out[0], skip_special_tokens=True)
    print(f"  问题: {test_input[:40]}...")
    print(f"  回答: {reply[-200:]}")
    model.train()

    # 上传 HuggingFace
    print(f"\n⏳ 上传至 {HF_REPO} ...")
    from huggingface_hub import HfApi
    api = HfApi()
    try:
        api.create_repo(repo_id=HF_REPO, repo_type="model", exist_ok=True)
        api.upload_folder(
            folder_path=final_path,
            repo_id=HF_REPO,
            repo_type="model",
            commit_message=f"Nexify Video Safety LoRA v1 - loss={best_loss:.4f}",
        )
        print(f"✅ https://huggingface.co/{HF_REPO}")
    except Exception as e:
        print(f"⚠️  上传失败: {e}")

if __name__ == "__main__":
    main()
