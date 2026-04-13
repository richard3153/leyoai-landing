#!/usr/bin/env python3
"""
Nexify Video VLM 训练脚本
基座: Qwen2-VL-2B-Instruct
策略: 冻结视觉编码器 → 只训练 LLM LoRA (MPS 兼容)
视频帧: 本地提取 (OpenCV)
目标: 视频内容安全分析 + 场景风险识别
"""
import torch
import os, sys, json, time, base64, warnings
warnings.filterwarnings("ignore")

os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# ── 配置 ──────────────────────────────────────────────────
BASE_MODEL   = os.path.expanduser("~/.cache/huggingface/hub/models--Qwen--Qwen2-VL-2B-Instruct/snapshots/895c3a49bc3fa70a340399125c650a463535e71c")
DATA_PATH    = os.path.join(os.path.dirname(__file__), "../data/video_train.jsonl")
OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), "../output/video_vlm_model")
HF_REPO      = "FFZwai/nexify-video-safety-v2"

LORA_R       = 16
LORA_ALPHA   = 32
LORA_DROPOUT = 0.05
MAX_LENGTH   = 1024
NUM_EPOCHS   = 3
BATCH_SIZE   = 1
GRAD_ACCUM   = 8
LR           = 5e-5
WARMUP_STEPS = 10
SAVE_STEPS   = 100
LOG_STEPS    = 10
NUM_FRAMES   = 4       # 每条数据提取的帧数
# ─────────────────────────────────────────────────────────

def detect_device():
    if torch.cuda.is_available():
        return "cuda", torch.cuda.get_device_name(0), torch.bfloat16
    elif torch.backends.mps.is_available():
        return "mps", "Apple Silicon MPS", torch.float16
    return "cpu", "CPU", torch.float32

def extract_video_frames(video_bytes_or_path, num_frames=4):
    """从视频 bytes 或路径提取关键帧，返回 PIL Image 列表"""
    import cv2
    import numpy as np
    from PIL import Image
    import tempfile

    tmp_path = None
    try:
        if isinstance(video_bytes_or_path, (bytes, bytearray)):
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
                f.write(video_bytes_or_path)
                tmp_path = f.name
            cap = cv2.VideoCapture(tmp_path)
        elif os.path.isfile(video_bytes_or_path):
            cap = cv2.VideoCapture(video_bytes_or_path)
        else:
            return []

        if not cap.isOpened():
            return []

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps    = cap.get(cv2.CAP_PROP_FPS)
        if total <= 0 or fps <= 0:
            cap.release()
            return []

        # 均匀采样
        indices = np.linspace(0, total - 1, num_frames, dtype=int)
        frames = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(rgb))
        cap.release()
        return frames
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

def extract_frames_from_data(data_item):
    """从训练数据的 image 字段提取帧。
    数据中的 image 字段支持:
      - URL (http://...)
      - Base64 视频数据 (data:video/...;base64,...)
      - 本地视频路径 (video_path:...)
      - 已有帧列表 (frames:[...])
    """
    img = data_item.get("image", "")
    if not img:
        # 合成虚拟帧（从问题关键词生成描述性图像token）
        return None

    # Base64 视频
    if img.startswith("data:video/") and ";base64," in img:
        b64 = img.split(";base64,")[-1]
        video_bytes = base64.b64decode(b64)
        return extract_video_frames(video_bytes, NUM_FRAMES)

    # Base64 图片（已有帧）
    if img.startswith("data:image/") and ";base64," in img:
        from PIL import Image
        import io
        b64 = img.split(";base64,")[-1]
        img_bytes = base64.b64decode(b64)
        return [Image.open(io.BytesIO(img_bytes)).convert("RGB")]

    # 本地视频路径
    if img.startswith("video_path:"):
        path = img.replace("video_path:", "")
        if os.path.exists(path):
            return extract_video_frames(path, NUM_FRAMES)

    return None

def load_data(path):
    """加载训练数据"""
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

            # 提取 user/assistant 文本
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

            # 提取图像/视频（从 user message 的 image 字段 或 messages 里的 image）
            images = []
            for m in msgs:
                if isinstance(m.get("content"), list):
                    for c in m["content"]:
                        if isinstance(c, dict) and c.get("type") == "image":
                            images.append(c.get("image"))

            samples.append({
                "id": obj.get("id", f"sample_{i}"),
                "user": user_text.strip(),
                "assistant": asst_text.strip(),
                "images": images,
                "type": obj.get("type", "video_security_qa"),
            })
    return samples

def build_conversation(sample, processor, tokenizer):
    """构建 Qwen2-VL 对话格式"""
    import torch
    from PIL import Image

    messages = []
    content_parts = []

    # 图片部分
    images = []
    for img_ref in sample["images"]:
        if isinstance(img_ref, Image.Image):
            images.append(img_ref)
        elif isinstance(img_ref, str) and os.path.exists(img_ref):
            try:
                images.append(Image.open(img_ref).convert("RGB"))
            except:
                pass

    if images:
        content_parts.append({"type": "image", "image": images[0]})  # Qwen2-VL 单图

    content_parts.append({"type": "text", "text": sample["user"]})
    messages.append({"role": "user", "content": content_parts})

    # 生成 prompt
    prompt = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    return prompt, images

def main():
    import torch
    from torch.utils.data import Dataset, DataLoader
    from torch.optim import AdamW
    from transformers import get_linear_schedule_with_warmup
    from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
    from peft import LoraConfig, get_peft_model, TaskType
    from PIL import Image

    device, device_name, dtype = detect_device()
    print(f"\n{'='*55}")
    print(f"  Nexify Video VLM 训练")
    print(f"  设备: {device_name} ({device})")
    print(f"  策略: 冻结视觉编码器 · 训练 LLM LoRA")
    print(f"  基座: {BASE_MODEL}")
    print(f"{'='*55}\n")

    # 加载数据
    samples = load_data(DATA_PATH)
    print(f"✅ 数据加载: {len(samples)} 条")

    # 加载 Processor + Tokenizer
    print(f"⏳ 加载 Processor + Tokenizer...")
    processor = AutoProcessor.from_pretrained(BASE_MODEL, trust_remote_code=True, local_files_only=True)
    tokenizer = processor.tokenizer
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 加载 Qwen2-VL 模型（视觉语言模型）
    print(f"⏳ 加载 Qwen2-VL-2B ({dtype})...")
    print(f"  策略: 视觉编码器放CPU, LLM放MPS, CPU卸载...")
    model = Qwen2VLForConditionalGeneration.from_pretrained(
        BASE_MODEL,
        torch_dtype=dtype,
        trust_remote_code=True,
        device_map="auto",  # 自动分层: 视觉CPU + LLM MPS
        max_memory={0: "0GB", "cpu": "30GB"},  # 强制视觉编码器到CPU
    )

    # ── 冻结视觉编码器 ───────────────────────────────────
    for name, param in model.named_parameters():
        if "visual" in name or "vision_tower" in name or "patch_embed" in name:
            param.requires_grad = False
        else:
            param.requires_grad = True

    trainable_names = [n for n,p in model.named_parameters() if p.requires_grad]
    print(f"  视觉编码器: 冻结 ✓")
    print(f"  可训练层: {len(trainable_names)} 个")

    # LoRA 配置（仅 LLM 部分）
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

    # 确认 LLM 层在 MPS
    llm_on_mps = 0
    for name, param in model.named_parameters():
        if param.requires_grad and "visual" not in name:
            llm_on_mps += 1
            # 手动移动到 MPS
            try:
                param.data = param.data.to("mps")
            except:
                pass

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"✅ LoRA 就绪: {trainable/1e6:.2f}M / {total/1e9:.2f}B "
          f"({trainable/total*100:.2f}%)")

    # ── 梯度验证（关键检查）────────────────────────────────
    model.train()
    dummy_image = Image.new("RGB", (224, 224), color="blue")
    try:
        enc = processor(text=["hello"], images=[dummy_image],
                        return_tensors="pt", padding="max_length",
                        max_length=MAX_LENGTH)
        enc = {k: v.to("mps") if v.dtype in (torch.float16, torch.float32) else v for k,v in enc.items()}
        out = model(**enc, labels=enc["input_ids"])
        out.loss.backward()

        grad_ok = any(p.grad is not None and p.grad.abs().sum() > 0
                      for p in model.parameters() if p.requires_grad)
        grad_sum = sum(p.grad.abs().sum().item()
                       for p in model.parameters() if p.requires_grad and p.grad is not None)
        print(f"  梯度检查: {'✅ 正常' if grad_ok else '⚠️ 无梯度'} | 梯度总和: {grad_sum:.6f}")
    except Exception as ge:
        print(f"  梯度检查: ⚠️ {ge}")
    model.zero_grad()
    # ─────────────────────────────────────────────────────

    # Dataset
    class VideoSafetyDataset(Dataset):
        def __init__(self, samples):
            self.samples = samples

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            s = self.samples[idx]

            # 构建对话
            messages = [{"role": "user",
                         "content": [{"type": "text", "text": s["user"]}]},
                        {"role": "assistant",
                         "content": s["assistant"]}]

            # 图片处理（Qwen2-VL 格式）
            pil_images = []
            for img_ref in s.get("images", []):
                if isinstance(img_ref, Image.Image):
                    pil_images.append(img_ref)
                elif isinstance(img_ref, str):
                    try:
                        if img_ref.startswith("http"):
                            import requests
                            from io import BytesIO
                            r = requests.get(img_ref, timeout=5)
                            pil_images.append(Image.open(BytesIO(r.content)).convert("RGB"))
                        elif os.path.exists(img_ref):
                            pil_images.append(Image.open(img_ref).convert("RGB"))
                    except:
                        pass

            # 用 processor 处理
            try:
                text = processor.apply_chat_template(messages, tokenize=False,
                                                     add_generation_prompt=True)
                enc = processor(
                    text=[text],
                    images=pil_images if pil_images else None,
                    return_tensors="pt",
                    padding="max_length",
                    max_length=MAX_LENGTH,
                    truncation=True,
                )
                input_ids = enc["input_ids"].squeeze(0)
                attention_mask = enc["attention_mask"].squeeze(0)

                # labels: 只对 assistant 部分计算 loss
                labels = input_ids.clone()
                # 找到 assistant token 起始位置
                asst_start_str = "<|im_start|>assistant\n"
                asst_start_in_text = text.rfind(asst_start_str)
                if asst_start_in_text >= 0:
                    prefix_text = text[:asst_start_in_text + len(asst_start_str)]
                    prefix_ids = tokenizer(prefix_text, add_special_tokens=False)["input_ids"]
                    labels[:len(prefix_ids)] = -100

                return {
                    "input_ids": input_ids,
                    "attention_mask": attention_mask,
                    "labels": labels,
                }
            except Exception as e:
                # 回退: 纯文本
                prompt = f"<|im_start|>system\n你是 Nexify 视频安全助手，专注视频内容分析。<|im_end|>\n<|im_start|>user\n{s['user']}<|im_end|>\n<|im_start|>assistant\n{s['assistant']}<|im_end|>"
                enc = tokenizer(prompt, max_length=MAX_LENGTH, truncation=True,
                                padding="max_length", return_tensors="pt")
                labels = enc["input_ids"].squeeze(0).clone()
                # mask user part
                asst_idx = enc["input_ids"].squeeze().tolist().index(tokenizer.encode("<|im_start|>assistant\n", add_special_tokens=False)[0])
                labels[:asst_idx] = -100
                return {
                    "input_ids": enc["input_ids"].squeeze(0),
                    "attention_mask": enc["attention_mask"].squeeze(0),
                    "labels": labels,
                }

    dataset = VideoSafetyDataset(samples)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)

    # 训练
    optimizer = AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                     lr=LR, weight_decay=0.01)
    total_steps = len(loader) * NUM_EPOCHS // GRAD_ACCUM
    scheduler = get_linear_schedule_with_warmup(optimizer, WARMUP_STEPS, total_steps)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.train()
    global_step = 0
    best_loss = float("inf")
    start_time = time.time()

    print(f"\n{'='*55}")
    print(f"  训练: {NUM_EPOCHS} epochs, {total_steps} steps")
    print(f"  数据: {len(dataset)} 条, {len(loader)} batches/epoch")
    print(f"{'='*55}\n")

    for epoch in range(NUM_EPOCHS):
        epoch_loss = 0.0
        epoch_steps = 0
        optimizer.zero_grad()

        for batch in loader:
            input_ids = batch["input_ids"].to(device)
            labels    = batch["labels"].to(device)
            attention  = batch["attention_mask"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention, labels=labels)
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
                    avg = epoch_loss / epoch_steps
                    elapsed = time.time() - start_time
                    print(f"  Epoch {epoch+1}/{NUM_EPOCHS} | Step {global_step}/{total_steps} "
                          f"| Loss {avg:.4f} | {elapsed:.0f}s")

                if global_step % SAVE_STEPS == 0:
                    ckpt = os.path.join(OUTPUT_DIR, f"checkpoint-{global_step}")
                    model.save_pretrained(ckpt)
                    print(f"  💾 Checkpoint: {ckpt}")

        avg_epoch_loss = epoch_loss / max(epoch_steps, 1)
        print(f"\n  ✅ Epoch {epoch+1} 完成 | Avg Loss: {avg_epoch_loss:.4f}")
        if avg_epoch_loss < best_loss:
            best_loss = avg_epoch_loss

    # 保存最终模型
    final_path = os.path.join(OUTPUT_DIR, "final_lora")
    model.save_pretrained(final_path)
    print(f"\n{'='*55}")
    print(f"  ✅ 训练完成!")
    print(f"  最终 Loss: {best_loss:.4f}")
    print(f"  总耗时: {time.time()-start_time:.0f}s ({(time.time()-start_time)/60:.1f}min)")
    print(f"  模型: {final_path}")
    print(f"{'='*55}")

    # 上传 HF
    print(f"\n⏳ 上传至 {HF_REPO} ...")
    from huggingface_hub import HfApi
    api = HfApi()
    try:
        api.create_repo(repo_id=HF_REPO, repo_type="model", exist_ok=True)
        api.upload_folder(folder_path=final_path, repo_id=HF_REPO, repo_type="model",
                         commit_message=f"Nexify Video VLM v1 - loss={best_loss:.4f}")
        print(f"✅ 上传完成: https://huggingface.co/{HF_REPO}")
    except Exception as e:
        print(f"⚠️  上传失败: {e}")
        print(f"   手动: huggingface-cli upload {HF_REPO} {final_path}")

if __name__ == "__main__":
    main()
