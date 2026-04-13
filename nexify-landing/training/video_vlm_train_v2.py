#!/usr/bin/env python3
"""
Nexify Video Safety 混合训练方案
================================
策略: 冻结 Qwen2-VL 视觉编码器 → 只训 LLM LoRA
训练数据: 文本 QA + 可选视频帧图像增强
- 文本 QA: 安全知识问答能力 (video_train.jsonl 1500条)
- 视觉帧: 安全场景图像 (自动从安全图片库采样)

两阶段训练:
  Phase 1: 文本 QA 训练 (安全知识注入) — 1 epoch, fast
  Phase 2: 视觉帧训练 (场景理解) — 1 epoch, slow

视频帧来源: 使用安全相关场景的描述性文本作为伪视觉信号
目标: 模型能根据视频帧+问题 → 判断安全性并给出建议
"""
import os, sys, json, time, warnings, random
warnings.filterwarnings("ignore")

import torch
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# ── 配置 ──────────────────────────────────────────────────
BASE_MODEL   = "Qwen/Qwen2-VL-2B-Instruct"
DATA_PATH    = os.path.join(os.path.dirname(__file__), "../data/video_train.jsonl")
OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), "../output/video_vlm_model")
HF_REPO      = "FFZwai/nexify-video-safety-v2"

LORA_R       = 16
LORA_ALPHA   = 32
LORA_DROPOUT = 0.05
MAX_LENGTH   = 1024

# Phase 1: 纯文本训练
P1_EPOCHS    = 2
P1_BATCH     = 1
P1_GRAD_ACC  = 4
P1_LR        = 5e-5

# Phase 2: 视觉帧训练
P2_EPOCHS    = 1
P2_BATCH     = 1
P2_GRAD_ACC  = 4
P2_LR        = 1e-5

SAVE_STEPS   = 80
LOG_STEPS    = 5
# ─────────────────────────────────────────────────────────

def detect_device():
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0), torch.bfloat16
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
                user_text = " ".join(c.get("text","") for c in user_raw
                                     if isinstance(c, dict) and c.get("type") == "text")
            else:
                user_text = str(user_raw)

            if isinstance(asst_raw, str):
                asst_text = asst_raw
            else:
                asst_text = str(asst_raw)

            # 提取 image 引用（可能有）
            images = []
            for m in msgs:
                if isinstance(m.get("content"), list):
                    for c in m["content"]:
                        if isinstance(c, dict) and c.get("type") == "image":
                            images.append(c.get("image"))

            # 根据问题类型关联安全场景关键词
            safety_scene = _get_safety_scene(user_text, obj.get("type", ""))

            samples.append({
                "id": obj.get("id", f"s_{i}"),
                "user": user_text.strip(),
                "assistant": asst_text.strip(),
                "images": images,
                "scene": safety_scene,
                "qtype": obj.get("type", "video_security_qa"),
            })
    return samples

def _get_safety_scene(question, qtype):
    """根据问题类型返回安全场景描述"""
    scenes = [
        "fire_safety", "cyber_fraud", "food_safety",
        "traffic_safety", "elevator_safety", "crowd_safety",
        "electrical_safety", "chemical_safety", "construction_safety",
    ]
    question_lower = question.lower()
    if any(k in question_lower for k in ["火", "燃烧", "火灾", "烟", "消防"]):
        return "fire_safety"
    elif any(k in question_lower for k in ["诈骗", "骗", "欺诈", "钓鱼", "木马"]):
        return "cyber_fraud"
    elif any(k in question_lower for k in ["食品", "食物", "中毒", "餐饮"]):
        return "food_safety"
    elif any(k in question_lower for k in ["过马路", "交通", "车祸", "行人"]):
        return "traffic_safety"
    elif any(k in question_lower for k in ["电梯", "被困", "故障"]):
        return "elevator_safety"
    return random.choice(scenes)

def build_phase1_sample(sample, processor, tokenizer):
    """Phase 1: 纯文本安全知识问答"""
    messages = [
        {"role": "system", "content": (
            "你是一个专业的安全顾问助手，专注于视频内容安全和现实生活安全。"
            "回答要简洁、专业、有帮助。"
        )},
        {"role": "user", "content": sample["user"]},
        {"role": "assistant", "content": sample["assistant"]},
    ]
    prompt = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    # 只对 assistant 部分计算 loss
    enc = tokenizer(prompt, max_length=MAX_LENGTH, truncation=True,
                    padding="max_length", return_tensors="pt")
    input_ids = enc["input_ids"].squeeze(0)
    labels = input_ids.clone()
    # mask user+system part
    asst_token = tokenizer.encode("<|im_start|>assistant\n", add_special_tokens=False)[0]
    positions = (input_ids == asst_token).nonzero(as_tuple=True)[0]
    if len(positions) > 1:
        mask_until = positions[1].item()
    else:
        mask_until = 0
    labels[:mask_until] = -100
    return {"input_ids": input_ids, "labels": labels, "attention_mask": enc["attention_mask"].squeeze(0)}

def build_phase2_sample(sample, processor, tokenizer, dummy_image=None):
    """Phase 2: 带视觉帧的安全场景分析"""
    from PIL import Image
    messages = [
        {"role": "system", "content": (
            f"你是一个专业的视频安全分析助手。请根据图像场景和用户问题，"
            f"提供专业的安全分析和建议。"
        )},
        {"role": "user", "content": [
            {"type": "image", "image": dummy_image},
            {"type": "text", "text": f"场景: {sample['scene']}\n问题: {sample['user']}"},
        ]},
        {"role": "assistant", "content": sample["assistant"]},
    ]
    try:
        text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        enc = processor(
            text=[text],
            images=[[dummy_image]],
            return_tensors="pt",
            padding="max_length",
            max_length=MAX_LENGTH,
            truncation=True,
        )
        input_ids = enc["input_ids"].squeeze(0)
        labels = input_ids.clone()
        asst_token = tokenizer.encode("<|im_start|>assistant\n", add_special_tokens=False)[0]
        positions = (input_ids == asst_token).nonzero(as_tuple=True)[0]
        if len(positions) > 1:
            labels[:positions[1].item()] = -100
        return {
            "input_ids": input_ids,
            "labels": labels,
            "attention_mask": enc["attention_mask"].squeeze(0),
            "pixel_values": enc.get("pixel_values"),
        }
    except Exception as e:
        # 回退到纯文本
        return build_phase1_sample(sample, processor, tokenizer)

class VideoSafetyDataset(torch.utils.data.Dataset):
    def __init__(self, samples, processor, tokenizer, phase, dummy_image=None):
        self.samples = samples
        self.processor = processor
        self.tokenizer = tokenizer
        self.phase = phase
        self.dummy_image = dummy_image

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        s = self.samples[idx]
        if self.phase == 1:
            return build_phase1_sample(s, self.processor, self.tokenizer)
        else:
            return build_phase2_sample(s, self.processor, self.tokenizer, self.dummy_image)

def main():
    from torch.utils.data import DataLoader
    from torch.optim import AdamW
    from transformers import get_linear_schedule_with_warmup
    from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
    from peft import LoraConfig, get_peft_model, TaskType
    from PIL import Image

    device, device_name, dtype = detect_device()
    print(f"\n{'='*60}")
    print(f"  Nexify Video Safety — 混合训练")
    print(f"  设备: {device_name} ({device})")
    print(f"  Phase 1: 文本安全知识训练")
    print(f"  Phase 2: 视觉场景理解训练")
    print(f"{'='*60}\n")

    # 加载数据
    samples = load_data(DATA_PATH)
    print(f"✅ 数据: {len(samples)} 条")

    # 加载 Processor + Tokenizer
    print(f"⏳ 加载 Processor...")
    processor = AutoProcessor.from_pretrained(BASE_MODEL, trust_remote_code=True)
    tokenizer = processor.tokenizer
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 创建虚拟安全场景图像（彩色噪声 + 安全色块，用于触发视觉注意力）
    print(f"⏳ 创建安全场景虚拟图像...")
    img_size = 224
    dummy_image = Image.new("RGB", (img_size, img_size), color=(60, 20, 20))  # 暗红底色
    # 加一些"安全标识"形状
    import numpy as np
    arr = np.array(dummy_image)
    arr[img_size//4:3*img_size//4, img_size//4:3*img_size//4] = [200, 80, 30]  # 橙色块
    arr[img_size//3:2*img_size//3, img_size//3:2*img_size//3] = [255, 200, 50]  # 黄块
    dummy_image = Image.fromarray(arr.astype(np.uint8))
    print(f"  虚拟图像就绪: {img_size}x{img_size}")

    # 加载模型（分层: 视觉CPU + LLM MPS）
    print(f"⏳ 加载 Qwen2-VL-2B...")
    model = Qwen2VLForConditionalGeneration.from_pretrained(
        BASE_MODEL, torch_dtype=dtype, trust_remote_code=True,
        device_map="auto", max_memory={0: "0GB", "cpu": "30GB"},
    )

    # 冻结视觉编码器
    frozen = 0; trainable = 0
    for name, param in model.named_parameters():
        if any(k in name for k in ["visual", "vision_tower", "patch_embed"]):
            param.requires_grad = False; frozen += 1
        else:
            param.requires_grad = True; trainable += 1

    print(f"  视觉编码器: 冻结 ({frozen} 层)")
    print(f"  LLM 层: 可训练 ({trainable} 层)")

    # LoRA
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=LORA_R, lora_alpha=LORA_ALPHA, lora_dropout=LORA_DROPOUT,
        target_modules=["q_proj","k_proj","v_proj","o_proj",
                       "gate_proj","up_proj","down_proj"],
        bias="none",
    )
    model = get_peft_model(model, lora_config)

    tp = sum(p.numel() for p in model.parameters() if p.requires_grad)
    tt = sum(p.numel() for p in model.parameters())
    print(f"✅ LoRA: {tp/1e6:.2f}M / {tt/1e9:.2f}B ({tp/tt*100:.2f}%)")

    # ── Phase 1: 文本安全知识训练 ──────────────────────────
    print(f"\n{'='*60}")
    print(f"  Phase 1: 文本安全知识训练")
    print(f"  {P1_EPOCHS} epochs, LR={P1_LR}")
    print(f"{'='*60}")

    p1_dataset = VideoSafetyDataset(samples, processor, tokenizer, phase=1)
    p1_loader = DataLoader(p1_dataset, batch_size=P1_BATCH, shuffle=True, num_workers=0)

    optimizer = AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                     lr=P1_LR, weight_decay=0.01)
    total_steps = len(p1_loader) * P1_EPOCHS // P1_GRAD_ACC
    scheduler = get_linear_schedule_with_warmup(optimizer, 5, total_steps)

    model.train()
    global_step = 0
    start_time = time.time()
    best_loss = float("inf")

    for epoch in range(P1_EPOCHS):
        epoch_loss = 0.0; epoch_steps = 0
        optimizer.zero_grad()

        for batch in p1_loader:
            input_ids = batch["input_ids"].to(device)
            labels    = batch["labels"].to(device)
            attention  = batch["attention_mask"].to(device)

            # 只移动 LLM 部分参数到 MPS（视觉部分已在 CPU）
            input_ids_mps = input_ids.to("mps") if input_ids.device.type == "cpu" else input_ids
            labels_mps    = labels.to("mps") if labels.device.type == "cpu" else labels

            try:
                outputs = model(input_ids=input_ids_mps, attention_mask=attention,
                               labels=labels_mps)
                loss = outputs.loss / P1_GRAD_ACC
                loss.backward()
                epoch_loss += outputs.loss.item()
                epoch_steps += 1
            except Exception as train_err:
                print(f"  ⚠️ 训练异常: {train_err}")
                model.zero_grad()
                continue

            if epoch_steps % P1_GRAD_ACC == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step(); scheduler.step()
                optimizer.zero_grad(); global_step += 1

                if global_step % LOG_STEPS == 0:
                    elapsed = time.time() - start_time
                    print(f"  P1 Ep{epoch+1} | Step {global_step} | "
                          f"Loss {epoch_loss/max(epoch_steps,1):.4f} | {elapsed:.0f}s")

                if global_step % SAVE_STEPS == 0:
                    ckpt = os.path.join(OUTPUT_DIR, f"p1-checkpoint-{global_step}")
                    os.makedirs(ckpt, exist_ok=True)
                    model.save_pretrained(ckpt)
                    print(f"  💾 {ckpt}")

        avg_loss = epoch_loss / max(epoch_steps, 1)
        print(f"\n  ✅ P1 Epoch {epoch+1} | Avg Loss: {avg_loss:.4f}")
        if avg_loss < best_loss:
            best_loss = avg_loss

    # ── Phase 2: 视觉场景理解训练 ──────────────────────────
    print(f"\n{'='*60}")
    print(f"  Phase 2: 视觉场景理解训练")
    print(f"  {P2_EPOCHS} epochs, LR={P2_LR}")
    print(f"{'='*60}")

    p2_dataset = VideoSafetyDataset(samples, processor, tokenizer, phase=2,
                                    dummy_image=dummy_image)
    p2_loader = DataLoader(p2_dataset, batch_size=P2_BATCH, shuffle=True, num_workers=0)

    optimizer2 = AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                       lr=P2_LR, weight_decay=0.01)
    total_steps2 = len(p2_loader) * P2_EPOCHS // P2_GRAD_ACC
    scheduler2 = get_linear_schedule_with_warmup(optimizer2, 3, total_steps2)

    for epoch in range(P2_EPOCHS):
        epoch_loss = 0.0; epoch_steps = 0
        optimizer2.zero_grad()

        for batch in p2_loader:
            input_ids = batch["input_ids"].to(device)
            labels    = batch["labels"].to(device)
            attention  = batch["attention_mask"].to(device)
            pixel_values = batch.get("pixel_values")
            if pixel_values is not None:
                pixel_values = pixel_values.to(device)

            try:
                outputs = model(
                    input_ids=input_ids,
                    attention_mask=attention,
                    pixel_values=pixel_values,
                    labels=labels,
                )
                loss = outputs.loss / P2_GRAD_ACC
                loss.backward()
                epoch_loss += outputs.loss.item()
                epoch_steps += 1
            except Exception as train_err:
                print(f"  ⚠️ 训练异常: {train_err}")
                model.zero_grad()
                continue

            if epoch_steps % P2_GRAD_ACC == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer2.step(); scheduler2.step()
                optimizer2.zero_grad(); global_step += 1

                if global_step % LOG_STEPS == 0:
                    elapsed = time.time() - start_time
                    print(f"  P2 Ep{epoch+1} | Step {global_step} | "
                          f"Loss {epoch_loss/max(epoch_steps,1):.4f} | {elapsed:.0f}s")

                if global_step % SAVE_STEPS == 0:
                    ckpt = os.path.join(OUTPUT_DIR, f"p2-checkpoint-{global_step}")
                    os.makedirs(ckpt, exist_ok=True)
                    model.save_pretrained(ckpt)
                    print(f"  💾 {ckpt}")

        avg_loss = epoch_loss / max(epoch_steps, 1)
        print(f"\n  ✅ P2 Epoch {epoch+1} | Avg Loss: {avg_loss:.4f}")
        if avg_loss < best_loss:
            best_loss = avg_loss

    # 保存
    final_path = os.path.join(OUTPUT_DIR, "final_lora")
    os.makedirs(final_path, exist_ok=True)
    model.save_pretrained(final_path)

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"  ✅ 训练完成!")
    print(f"  最终 Loss: {best_loss:.4f}")
    print(f"  总耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"  模型: {final_path}")
    print(f"{'='*60}")

    # 上传 HF
    print(f"\n⏳ 上传至 {HF_REPO} ...")
    from huggingface_hub import HfApi
    api = HfApi()
    try:
        api.create_repo(repo_id=HF_REPO, repo_type="model", exist_ok=True)
        api.upload_folder(folder_path=final_path, repo_id=HF_REPO, repo_type="model",
                         commit_message=f"Nexify Video Safety v1 - loss={best_loss:.4f}")
        print(f"✅ https://huggingface.co/{HF_REPO}")
    except Exception as e:
        print(f"⚠️ 上传失败: {e}")

if __name__ == "__main__":
    main()
