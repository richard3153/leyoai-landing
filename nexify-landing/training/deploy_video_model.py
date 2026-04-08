#!/usr/bin/env python3
"""
Nexify Video Model - 训练 + 上传 + 部署脚本
一键完成：本地训练 → 上传 LoRA → 部署 HF Space

用法:
  python deploy_video_model.py           # 完整流程（训练+上传+部署）
  python deploy_video_model.py --skip-train  # 仅上传+部署
  python deploy_video_model.py --local-only   # 仅本地训练
"""

import os
import sys
import json
import time
import argparse

# MPS fix
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

HF_TOKEN = os.environ.get("HF_TOKEN", "")
os.environ["HF_TOKEN"] = HF_TOKEN

REPO_ID = "FFZwai/nexify-video-safety-lora"
SPACE_ID = "FFZwai/nexify-video-safety-assistant"
# 项目根目录（training/ 的上一级）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "Qwen2-VL-2B-Instruct")
LORA_DIR = os.path.join(PROJECT_ROOT, "output", "video_model", "lora_adapter")
DATA_FILE = os.path.join(PROJECT_ROOT, "data", "video_train.jsonl")

def run_cmd(cmd, desc=""):
    print(f"\n{'='*55}")
    print(f"  {desc or cmd}")
    print('='*55)
    result = os.system(cmd)
    if result != 0:
        print(f"❌ 命令失败: {cmd}")
        sys.exit(1)
    return result

def check_model():
    """检查模型文件是否完整"""
    required = [
        "config.json",
        "model-00001-of-00002.safetensors",
        "model-00002-of-00002.safetensors",
        "tokenizer.json",
    ]
    missing = [f for f in required if not os.path.exists(f"{MODEL_DIR}/{f}")]
    if missing:
        print(f"❌ 模型文件缺失: {missing}")
        print(f"   请先运行模型下载")
        return False
    size = os.path.getsize(f"{MODEL_DIR}/model-00001-of-00002.safetensors")
    print(f"✅ 模型文件完整（embedding: {size/1e9:.1f}GB）")
    return True

def train():
    """本地训练"""
    print("\n" + "="*55)
    print("  🚀 开始本地训练")
    print("="*55)

    if not os.path.exists(MODEL_DIR):
        print(f"❌ 模型不存在: {MODEL_DIR}")
        sys.exit(1)

    if not os.path.exists(DATA_FILE):
        print(f"❌ 数据不存在: {DATA_FILE}")
        print("   请先运行: python video_prepare_data.py")
        sys.exit(1)

    os.makedirs(LORA_DIR, exist_ok=True)

    print("⚠️ 训练将使用 Mac Studio M2 Max MPS 加速")
    print(f"   数据: {DATA_FILE}")
    print(f"   输出: {LORA_DIR}")
    print("   参数: QLoRA r=16, 2 epochs")
    print()
    confirm = input("继续？(y/N): ").strip().lower()
    if confirm != 'y':
        print("取消训练")
        return

    start = time.time()
    cmd = "KMP_DUPLICATE_LIB_OK=TRUE python3 video_train.py"
    result = os.system(cmd)
    elapsed = time.time() - start

    if result == 0:
        print(f"\n✅ 训练完成！耗时: {elapsed/60:.1f} 分钟")
    else:
        print(f"\n❌ 训练失败 (code: {result})")
        sys.exit(1)

def upload_lora():
    """上传 LoRA adapter 到 HuggingFace"""
    print("\n" + "="*55)
    print("  📤 上传 LoRA Adapter")
    print("="*55)

    if not os.path.exists(LORA_DIR):
        print(f"❌ LoRA 目录不存在: {LORA_DIR}")
        print("   请先运行训练")
        sys.exit(1)

    # 检查文件
    files = os.listdir(LORA_DIR)
    print(f"   待上传: {files}")

    print(f"\n上传到: https://huggingface.co/{REPO_ID}")
    confirm = input("确认上传？(y/N): ").strip().lower()
    if confirm != 'y':
        print("取消上传")
        return

    from huggingface_hub import HfApi
    api = HfApi(token=HF_TOKEN)

    # 创建或更新 repo
    try:
        api.create_repo(repo_id=REPO_ID, repo_type="model", exist_ok=True)
        print(f"✅ Repo 已就绪: {REPO_ID}")
    except Exception as e:
        print(f"⚠️ Repo 创建: {e}")

    # 上传
    print("📤 上传文件...")
    api.upload_folder(
        folder_path=LORA_DIR,
        repo_id=REPO_ID,
        repo_type="model",
    )
    print(f"✅ 上传完成！")
    print(f"   模型地址: https://huggingface.co/{REPO_ID}")

def create_space():
    """创建/更新 HF Space"""
    print("\n" + "="*55)
    print("  🌐 部署 HuggingFace Space")
    print("="*55)

    from huggingface_hub import HfApi
    api = HfApi(token=HF_TOKEN)

    HF_SPACE_DIR = "./hf_space"

    print(f"Space 目录: {HF_SPACE_DIR}")
    print(f"Space ID: {SPACE_ID}")
    print(f"Space 地址: https://huggingface.co/spaces/{SPACE_ID}")

    confirm = input("确认创建/更新 Space？(y/N): ").strip().lower()
    if confirm != 'y':
        print("取消")
        return

    # 创建 Space
    try:
        api.create_repo(
            repo_id=SPACE_ID,
            repo_type="space",
            space_sdk="streamlit",
            space_title="Nexify Video Safety Assistant",
            space_thumbnail="https://dist-sigma-woad.vercel.app/favicon.svg",
            exist_ok=True,
        )
        print(f"✅ Space 已创建/更新")
    except Exception as e:
        print(f"⚠️ Space 创建: {e}")

    # 上传 Space 文件
    print("📤 上传 Space 文件...")
    api.upload_folder(
        folder_path=HF_SPACE_DIR,
        repo_id=SPACE_ID,
        repo_type="space",
    )
    print(f"✅ Space 部署完成！")
    print(f"   🌐 https://huggingface.co/spaces/{SPACE_ID}")

def update_landing_page():
    """更新落地页 Video Model 状态"""
    print("\n" + "="*55)
    print("  🖥️ 更新落地页状态")
    print("="*55)

    print(f"Cyber Model:  https://huggingface.co/spaces/FFZwai/nexify-safety-assistant")
    print(f"Video Model: https://huggingface.co/spaces/{SPACE_ID}")
    print()
    print("请手动更新落地页 src/App.tsx 中的 Video Model 链接。")
    print("参考:")
    print('  <a href="https://huggingface.co/spaces/FFZwai/nexify-video-safety-assistant">立即体验</a>')

def main():
    parser = argparse.ArgumentParser(description="Nexify Video Model 部署工具")
    parser.add_argument("--skip-train", action="store_true", help="跳过训练，仅上传+部署")
    parser.add_argument("--local-only", action="store_true", help="仅本地训练，不上传")
    args = parser.parse_args()

    print("="*55)
    print("  🎬 Nexify Video Model 部署工具")
    print("="*55)
    print(f"  步骤:")
    if not args.skip_train and not args.local_only:
        print("    [1] 本地训练 QLoRA")
        print("    [2] 上传 LoRA adapter")
        print("    [3] 部署 HF Space")
        print("    [4] 更新落地页")
    elif args.skip_train:
        print("    [1] ⏭️ 跳过训练")
        print("    [2] 上传 LoRA adapter")
        print("    [3] 部署 HF Space")
    elif args.local_only:
        print("    [1] 本地训练 QLoRA")
        print("    [2] ⏭️ 跳过上传")

    # 检查模型
    if not check_model():
        sys.exit(1)

    # 训练
    if not args.skip_train and not args.local_only:
        train()

    # 上传
    if not args.local_only:
        upload_lora()

    # Space
    if not args.local_only:
        create_space()

    # 落地页
    update_landing_page()

    print("\n" + "="*55)
    print("  ✅ 全部完成！")
    print("="*55)

if __name__ == "__main__":
    main()
