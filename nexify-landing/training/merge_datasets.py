#!/usr/bin/env python3
"""
合并安全对齐数据集，统一格式并划分 train/val/test
"""

import os
import json
import random
from pathlib import Path

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_DIR = DATA_DIR

SPLITS = {"train": 0.8, "val": 0.1, "test": 0.1}


def load_jsonl(file_path: str):
    """加载 JSONL 文件"""
    records = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def split_data(records: list, train_ratio=0.8, val_ratio=0.1, test_ratio=0.1, seed=42):
    """划分数据集"""
    random.seed(seed)
    data = records.copy()
    random.shuffle(data)

    n = len(data)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)

    return {
        "train": data[:n_train],
        "val": data[n_train:n_train + n_val],
        "test": data[n_train + n_val:]
    }


def standardize_record(record: dict) -> dict:
    """统一数据格式"""
    return {
        "id": record.get("id", ""),
        "source": record.get("source", "unknown"),
        "prompt": record.get("prompt", ""),
        "response": record.get("response", ""),
        "category": record.get("category", "unknown"),
        "metadata": record.get("metadata", {})
    }


def save_jsonl(records: list, file_path: str):
    """保存 JSONL 文件"""
    with open(file_path, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def main():
    print("🔄 开始合并数据集")
    print(f"📁 数据目录: {os.path.abspath(DATA_DIR)}")

    all_records = []

    # 加载所有数据集
    jsonl_files = list(Path(DATA_DIR).glob("*.jsonl"))
    print(f"📂 找到 {len(jsonl_files)} 个数据文件")

    for file_path in jsonl_files:
        print(f"   加载: {file_path.name}")
        records = load_jsonl(str(file_path))
        print(f"      -> {len(records)} 条样本")
        all_records.extend(records)

    print(f"\n📊 合并后总计: {len(all_records)} 条样本")

    # 统一格式
    print("\n🔧 统一数据格式...")
    standardized = [standardize_record(r) for r in all_records]

    # 划分数据集
    print("📐 划分 train/val/test (80/10/10)...")
    splits = split_data(standardized)

    # 保存
    for split_name, split_data in splits.items():
        output_path = os.path.join(OUTPUT_DIR, f"{split_name}.jsonl")
        save_jsonl(split_data, output_path)
        print(f"   ✅ {split_name}: {len(split_data)} 条 -> {output_path}")

    # 统计信息
    print(f"\n📊 最终数据划分:")
    for split_name, split_data in splits.items():
        ratio = len(split_data) / len(all_records) * 100
        print(f"   {split_name}: {len(split_data)} ({ratio:.1f}%)")

    print("\n🎉 数据合并完成！")


if __name__ == "__main__":
    main()
