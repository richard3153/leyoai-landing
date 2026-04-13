#!/bin/bash
LOG="/Users/ffzwai/.qclaw/workspace-agent-877ce267/nexify-landing/training/video_safety_train.log"
CHECKPOINT_DIR="/Users/ffzwai/.qclaw/workspace-agent-877ce267/nexify-landing/output/video_safety_lora"
FINAL_DIR="$CHECKPOINT_DIR/final_lora"
HF_REPO="FFZwai/qwen2.5-1.5b-video-safety"

# 监控进程
while ps aux | grep -q "video_safety_train.py" | grep -v grep; do
    sleep 60
done

# 进程结束
echo "训练进程已结束！"
date

# 检查是否完成
if [ -d "$FINAL_DIR" ]; then
    echo "✅ final_lora 已保存，开始上传..."
    cd /Users/ffzwai/.qclaw/workspace-agent-877ce267/nexify-landing
    python3 -c "
import os, subprocess
from huggingface_hub import HfApi
api = HfApi()
try:
    api.create_repo(repo_id='$HF_REPO', repo_type='model', exist_ok=True)
    api.upload_folder(
        folder_path='$FINAL_DIR',
        repo_id='$HF_REPO',
        repo_type='model',
        commit_message='Nexify Video Safety v1'
    )
    print('✅ 上传完成: https://huggingface.co/$HF_REPO')
except Exception as e:
    print(f'上传失败: {e}')
"
else
    echo "⚠️ 未找到 final_lora，检查 checkpoints..."
    ls -d $CHECKPOINT_DIR/checkpoint-* 2>/dev/null | tail -5
fi
