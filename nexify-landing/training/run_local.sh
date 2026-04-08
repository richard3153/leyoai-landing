#!/bin/bash
# =====================================================================
# Nexify Video Model - 本地运行脚本
# =====================================================================
# 用法: bash run_local.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  🎬 Nexify Video Model - 本地运行"
echo "============================================"

# 检查模型文件
MODEL_DIR="${PROJECT_DIR}/models/Qwen2-VL-2B-Instruct"
if [ ! -d "$MODEL_DIR" ]; then
    echo "❌ 模型文件不存在: $MODEL_DIR"
    echo "   请先运行模型下载"
    exit 1
fi

# 检查 LoRA adapter
LORA_DIR="${PROJECT_DIR}/output/video_model/lora_adapter"
if [ -d "$LORA_DIR" ]; then
    echo "✅ 发现 LoRA adapter: $LORA_DIR"
    echo "   加载微调版模型"
else
    echo "⚠️ 未找到 LoRA adapter，将使用基座模型"
    echo "   训练完成后会加载微调版本"
fi

# 检查依赖
echo ""
echo "📦 检查依赖..."
python3 -c "import streamlit; import transformers; import peft; import torch; import qwen_vl_utils" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 依赖完整"
else
    echo "❌ 依赖缺失，请运行:"
    echo "   pip install --break-system-packages streamlit transformers peft torch qwen-vl-utils"
    exit 1
fi

# 启动
echo ""
echo "🚀 启动 Streamlit..."
echo "   访问: http://localhost:8501"
echo "   按 Ctrl+C 停止"
echo ""

streamlit run streamlit_video_app.py \
    --server.headless=true \
    --server.port=8501 \
    --browser.gatherUsageStats=false \
    --theme.base=dark
