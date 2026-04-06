#!/bin/bash
# ==========================================
# Nexify 安全对齐训练启动脚本
# ==========================================

set -e  # 遇到错误立即退出

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"

echo "🚀 Nexify 安全对齐训练启动"
echo "============================================"
echo "项目目录: $PROJECT_DIR"
echo "数据目录: $DATA_DIR"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查数据是否存在
check_data() {
    echo "📦 检查数据文件..."

    required_files=("train.jsonl" "val.jsonl" "test.jsonl")
    missing=0

    for file in "${required_files[@]}"; do
        file_path="$DATA_DIR/$file"
        if [[ -f "$file_path" ]]; then
            lines=$(wc -l < "$file_path")
            echo -e "  ✅ $file ($lines 条)"
        else
            echo -e "  ❌ $file 不存在"
            missing=1
        fi
    done

    if [[ $missing -eq 1 ]]; then
        echo ""
        echo -e "${YELLOW}⚠️ 数据文件缺失，需要先下载并合并数据${NC}"
        echo ""
        echo "请运行以下命令："
        echo "  cd $SCRIPT_DIR"
        echo "  pip install datasets"
        echo "  python download_datasets.py"
        echo "  python merge_datasets.py"
        echo ""
        read -p "是否现在下载数据？(y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            download_and_merge
        else
            exit 1
        fi
    fi

    echo -e "${GREEN}✅ 数据检查通过${NC}"
}

# 下载并合并数据
download_and_merge() {
    echo ""
    echo "📥 开始下载数据..."
    echo ""

    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 未安装${NC}"
        exit 1
    fi

    # 安装依赖
    echo "📦 安装依赖..."
    pip install datasets tqdm -q

    # 下载数据
    echo ""
    echo "📥 下载 HuggingFace 数据集..."
    python3 "$SCRIPT_DIR/download_datasets.py"

    # 合并数据
    echo ""
    echo "🔄 合并数据集..."
    python3 "$SCRIPT_DIR/merge_datasets.py"
}

# 安装训练依赖
install_deps() {
    echo ""
    echo "📦 安装训练依赖..."
    echo ""

    pip install -q \
        transformers \
        torch \
        datasets \
        accelerate \
        peft \
        trl \
        deepspeed \
        wandb \
        tensorboard \
        pandas \
        tqdm

    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 启动训练
start_training() {
    echo ""
    echo "🏋️ 开始训练..."
    echo ""

    # 设置环境变量
    export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"
    export WANDB_PROJECT="nexify-safety"
    export DATA_DIR="$DATA_DIR"

    # 启动训练（根据实际情况修改训练脚本路径）
    if [[ -f "$SCRIPT_DIR/train.py" ]]; then
        python3 "$SCRIPT_DIR/train.py" \
            --data_dir "$DATA_DIR" \
            --output_dir "$PROJECT_DIR/outputs" \
            "$@"
    else
        echo -e "${YELLOW}⚠️ train.py 不存在，请先创建训练脚本${NC}"
        echo ""
        echo "请创建 $SCRIPT_DIR/train.py 或修改本脚本"
        exit 1
    fi
}

# 显示使用帮助
show_help() {
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  check      仅检查数据"
    echo "  download   下载并合并数据"
    echo "  deps       仅安装依赖"
    echo "  train      启动训练（默认）"
    echo "  all        完整流程（下载+训练）"
    echo ""
    echo "示例:"
    echo "  $0 check           # 检查数据"
    echo "  $0 download        # 下载数据"
    echo "  $0 train --epochs 3  # 训练 3 轮"
    echo "  $0 all             # 一键启动"
}

# 主流程
main() {
    COMMAND="${1:-train}"

    case "$COMMAND" in
        check)
            check_data
            ;;
        download)
            download_and_merge
            ;;
        deps)
            install_deps
            ;;
        train)
            check_data
            install_deps
            shift
            start_training "$@"
            ;;
        all)
            download_and_merge
            check_data
            install_deps
            start_training
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $COMMAND${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
