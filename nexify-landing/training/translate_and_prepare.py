#!/usr/bin/env python3
"""
翻译脚本：将英文数据集翻译成中文
运行方式：python translate_and_prepare.py
"""
import os
import json
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

# 配置
NUM_SAMPLES = 3000  # 数据条数
BATCH_SIZE = 8       # 批大小
OUT_DIR = "/content/data"

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # 1. 加载英文数据
    print("📥 加载英文数据...")
    en_data = load_dataset("PKU-Alignment/BeaverTails", split=f"330k_train[:{NUM_SAMPLES}]")
    en_records = [
        {"id": f"en_{i}", "instruction": x["prompt"], "output": x["response"], "lang": "en"}
        for i, x in enumerate(en_data)
    ]
    print(f"✅ 英文数据: {len(en_records)} 条")

    # 2. 加载翻译模型
    print("🔄 加载NLLB翻译模型...")
    tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")
    model = AutoModelForSeq2SeqLM.from_pretrained(
        "facebook/nllb-200-distilled-600M",
        torch_dtype=torch.float16,
        device_map="auto"
    )
    ZH_TOKEN = tokenizer.convert_tokens_to_ids("zho_Hans")
    print(f"✅ 模型加载完成! 中文token ID: {ZH_TOKEN}")

    # 3. 批量翻译
    print("📝 开始翻译...")
    zh_records = []
    all_instr = [r["instruction"] for r in en_records]
    count = 0

    while count < len(en_records):
        idx = count
        b_instr = all_instr[idx:idx+BATCH_SIZE]
        if idx % 500 == 0:
            print(f"   进度: {idx}/{len(en_records)}")
        inputs = tokenizer(b_instr, return_tensors="pt", padding=True, truncation=True, max_length=512)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        trans = model.generate(**inputs, forced_bos_token_id=ZH_TOKEN, max_length=512)
        trans_texts = tokenizer.batch_decode(trans, skip_special_tokens=True)
        for j in range(len(b_instr)):
            zh_records.append({
                "id": f"zh_{idx+j}",
                "instruction": trans_texts[j],
                "output": en_records[idx+j]["output"],
                "lang": "zh"
            })
        count = count + BATCH_SIZE

    print(f"✅ 中文数据: {len(zh_records)} 条")

    # 4. 保存
    all_records = en_records + zh_records
    out_path = os.path.join(OUT_DIR, "train.json")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(json.dumps(r, ensure_ascii=False) for r in all_records))

    print(f"💾 总数据: {len(all_records)} 条 (英文:{len(en_records)}, 中文:{len(zh_records)})")
    print(f"✅ 已保存到 {out_path}")

if __name__ == "__main__":
    main()
