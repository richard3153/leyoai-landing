#!/usr/bin/env python3
"""
下载 HuggingFace 安全对齐数据集
支持: BeaverTails, SafetyBench, CValues
"""

import os
import sys
from datasets import load_dataset

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

DATASETS = {
    "beavertails": {
        "repo_id": "PKU-Alignment/BeaverTails",
        "split": "train",
        "description": "BeaverTails 安全对话数据集",
    },
    "safetybench": {
        "repo_id": "thu-coai/SafetyBench",
        "split": "test",
        "description": "SafetyBench 安全评测数据集",
    },
    "cvalues": {
        "repo_id": "FineGENDER/CValues",
        "split": "train",
        "description": "CValues 中文价值观对齐数据集",
    },
}


def download_dataset(name: str, config: dict):
    """下载单个数据集"""
    print(f"\n{'='*60}")
    print(f"📥 下载数据集: {name} ({config['description']})")
    print(f"   Repo: {config['repo_id']}")
    print(f"{'='*60}")

    try:
        ds = load_dataset(config["repo_id"], split=config["split"])
        print(f"   ✅ 下载成功，共 {len(ds)} 条样本")

        output_path = os.path.join(DATA_DIR, f"{name}.jsonl")
        with open(output_path, "w", encoding="utf-8") as f:
            for i, item in enumerate(ds):
                # 统一转换为字典格式
                record = {
                    "id": f"{name}_{i}",
                    "source": name,
                    "prompt": item.get("prompt", item.get("question", "")),
                    "response": item.get("response", item.get("answer", "")),
                    "category": item.get("category", item.get("label", "unknown")),
                    "metadata": {
                        k: v for k, v in item.items()
                        if k not in ("prompt", "response", "question", "answer", "category", "label")
                    }
                }
                f.write(__import__("json").dumps(record, ensure_ascii=False) + "\n")

        print(f"   💾 保存至: {output_path}")
        return True

    except Exception as e:
        print(f"   ❌ 下载失败: {e}")
        return False


def main():
    print("🚀 开始下载安全对齐数据集")
    print(f"📁 保存目录: {os.path.abspath(DATA_DIR)}")

    results = {}
    for name, config in DATASETS.items():
        results[name] = download_dataset(name, config)

    print(f"\n{'='*60}")
    print("📊 下载汇总:")
    for name, success in results.items():
        status = "✅ 成功" if success else "❌ 失败"
        print(f"   {name}: {status}")

    if all(results.values()):
        print("\n🎉 所有数据集下载完成！")
    else:
        print("\n⚠️ 部分数据集下载失败，请检查网络或 HuggingFace 访问")
        sys.exit(1)


if __name__ == "__main__":
    main()
