# 安全对齐数据集说明

## 概述

本项目使用以下开源数据集进行安全对齐训练：

| 数据集 | 来源 | 用途 |
|--------|------|------|
| BeaverTails | PKU-Alignment | 安全对话训练 |
| SafetyBench | thu-coai | 安全评测基准 |
| CValues | FineGENDER | 中文价值观对齐 |

---

## 1. BeaverTails

### 基本信息
- **仓库**: `PKU-Alignment/BeaverTails`
- **许可证**: Apache 2.0
- **类型**: 安全问答对数据集
- **规模**: ~330K 条样本

### 数据格式
```json
{
  "id": "beavertails_0",
  "source": "beavertails",
  "prompt": "问题文本",
  "response": "回答文本",
  "category": "类别标签",
  "metadata": {}
}
```

### 字段说明
- `prompt`: 用户输入/问题
- `response`: 安全回复
- `category`: 安全类别（harmless, helpful 等）

### 使用注意事项
- 数据已过滤不安全回复，仅保留安全回答
- 适用于 RLHF 第一阶段 SFT 训练
- Apache 2.0 许可证，可商用

---

## 2. SafetyBench

### 基本信息
- **仓库**: `thu-coai/SafetyBench`
- **许可证**: CC BY-NC-SA 4.0
- **类型**: 安全评测数据集
- **规模**: ~10K 条样本

### 数据格式
```json
{
  "id": "safetybench_0",
  "source": "safetybench",
  "prompt": "问题文本",
  "response": "回答文本",
  "category": "安全类别",
  "metadata": {}
}
```

### 安全类别
- 多选题形式，包含 7 大安全维度
- 可用于评测模型安全能力

### 使用注意事项
- **非商用**：仅限学术研究
- 需要标注数据来源
- 不可用于商业产品

---

## 3. CValues

### 基本信息
- **仓库**: `FineGENDER/CValues`
- **许可证**: Apache 2.0
- **类型**: 中文价值观对齐数据集
- **规模**: ~50K 条样本

### 数据格式
```json
{
  "id": "cvalues_0",
  "source": "cvalues",
  "prompt": "问题文本",
  "response": "回答文本",
  "category": "价值观类别",
  "metadata": {}
}
```

### 适用场景
- 中文大模型安全对齐
- 符合中国价值观的安全训练
- RLHF / DPO 训练

### 使用注意事项
- Apache 2.0 许可证，可商用
- 中文数据，适合中文模型训练
- 数据已做安全过滤

---

## 合并后数据格式

所有数据集统一转换为以下 JSONL 格式：

```jsonl
{"id": "...", "source": "...", "prompt": "...", "response": "...", "category": "...", "metadata": {}}
```

### 数据划分
- **训练集 (train)**: 80%
- **验证集 (val)**: 10%
- **测试集 (test)**: 10%

### 文件结构
```
data/
├── beavertails.jsonl    # 原始 BeaverTails
├── safetybench.jsonl    # 原始 SafetyBench
├── cvalues.jsonl        # 原始 CValues
├── train.jsonl          # 合并后训练集
├── val.jsonl            # 合并后验证集
└── test.jsonl           # 合并后测试集
```

---

## 许可证汇总

| 数据集 | 许可证 | 商用 | 研究 |
|--------|--------|------|------|
| BeaverTails | Apache 2.0 | ✅ | ✅ |
| SafetyBench | CC BY-NC-SA 4.0 | ❌ | ✅ |
| CValues | Apache 2.0 | ✅ | ✅ |

---

## Colab / Kaggle 使用

```python
# 下载数据
!git clone https://github.com/your-repo/nexify-landing.git
%cd nexify-landing/training
!pip install datasets
!python download_datasets.py

# 合并数据
!python merge_datasets.py

# 检查数据
import json
with open("../data/train.jsonl") as f:
    print(f"训练集: {len(f.readlines())} 条")
```

---

## 注意事项

1. **网络问题**: HuggingFace 下载可能需要代理
2. **磁盘空间**: 预计需要 2-5GB 存储
3. **许可证合规**: 商用前确认各数据集许可证
4. **数据质量**: 使用前建议抽检样本质量
