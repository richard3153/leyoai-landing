# 数据准备指南

> 从原始数据到训练就绪的完整流程

---

## 一、下载开源数据集

### 推荐数据源

| 平台 | 网址 | 特点 |
|------|------|------|
| Hugging Face | huggingface.co/datasets | 最大开源数据集社区 |
| ModelScope | modelscope.cn/datasets | 国内访问友好 |
| GitHub | github.com | 特定领域数据 |

### 常用中文对话数据集

```bash
# Hugging Face 方式
pip install datasets

from datasets import load_dataset
dataset = load_dataset("Hello-SimpleAI/HC3-Chinese")
```

### 推荐数据集

1. **通用对话**
   - `Hello-SimpleAI/HC3-Chinese` - 中文问答
   - `BelleGroup/train_2M_CN` - 200万中文指令
   - `shibing624/alpaca-zh` - Alpaca 中文版

2. **代码能力**
   - `m-a-p/CodeFeedback-Filtered-Instruction` - 代码指令
   - `bigcode/starcoderdata` - 代码预训练

3. **数学推理**
   - `lighteval/MATH` - 数学问题
   - `gsm8k` - 小学数学应用题

---

## 二、数据格式

### 标准格式 (JSONL)

```json
{"instruction": "解释量子计算", "input": "", "output": "量子计算是..."}
{"instruction": "翻译成英文", "input": "你好", "output": "Hello"}
{"instruction": "写一首诗", "input": "关于春天", "output": "春风吹绿了..."}
```

### Alpaca 格式

```json
{
  "instruction": "任务描述",
  "input": "输入内容（可为空）",
  "output": "期望输出"
}
```

### ShareGPT 格式

```json
{
  "conversations": [
    {"from": "human", "value": "用户问题"},
    {"from": "gpt", "value": "助手回答"}
  ]
}
```

---

## 三、数据清洗步骤

### Step 1: 去重

```python
import json
from hashlib import md5

def deduplicate(input_file, output_file):
    """基于 MD5 去重"""
    seen = set()
    with open(input_file, 'r', encoding='utf-8') as f_in, \
         open(output_file, 'w', encoding='utf-8') as f_out:
        for line in f_in:
            data = json.loads(line)
            # 基于 instruction + output 去重
            key = md5(f"{data.get('instruction', '')}{data.get('output', '')}".encode()).hexdigest()
            if key not in seen:
                seen.add(key)
                f_out.write(line)
```

### Step 2: 过滤低质量数据

```python
def filter_quality(data):
    """过滤低质量数据"""
    # 过滤条件
    if len(data.get('output', '')) < 10:  # 输出太短
        return False
    if len(data.get('output', '')) > 4096:  # 输出太长
        return False
    if data.get('output', '').count('？') > 10:  # 疑问句过多
        return False
    if '抱歉' in data.get('output', '') or '对不起' in data.get('output', ''):
        return False  # 包含拒绝回答
    return True
```

### Step 3: 格式转换

```python
def convert_format(data):
    """统一转换为训练格式"""
    text = f"### 指令:\n{data['instruction']}\n\n"
    if data.get('input'):
        text += f"### 输入:\n{data['input']}\n\n"
    text += f"### 回答:\n{data['output']}"
    return {"text": text}
```

### Step 4: 敏感词过滤

```python
SENSITIVE_WORDS = ['敏感词1', '敏感词2']  # 根据需要补充

def filter_sensitive(data):
    """过滤敏感内容"""
    text = f"{data.get('instruction', '')} {data.get('output', '')}"
    for word in SENSITIVE_WORDS:
        if word in text:
            return False
    return True
```

---

## 四、数据集划分

### 标准比例

| 数据集 | 比例 | 用途 |
|--------|------|------|
| 训练集 | 80% | 模型学习 |
| 验证集 | 10% | 调参、早停 |
| 测试集 | 10% | 最终评估 |

### 划分脚本

```python
import json
import random

def split_dataset(input_file, train_ratio=0.8, val_ratio=0.1):
    """划分数据集"""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = [json.loads(line) for line in f]
    
    random.shuffle(data)  # 打乱顺序
    
    n = len(data)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    train_data = data[:train_end]
    val_data = data[train_end:val_end]
    test_data = data[val_end:]
    
    # 保存
    for name, subset in [('train', train_data), ('val', val_data), ('test', test_data)]:
        with open(f'{name}.json', 'w', encoding='utf-8') as f:
            for item in subset:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"Train: {len(train_data)}, Val: {len(val_data)}, Test: {len(test_data)}")

# 使用
split_dataset('raw_data.jsonl')
```

---

## 五、数据增强（可选）

### 回译

```python
# 中文 → 英文 → 中文
from transformers import MarianMTModel, MarianTokenizer

def back_translate(text, src='zh', mid='en'):
    """回译增强"""
    model_name = f'Helsinki-NLP/opus-mt-{src}-{mid}'
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    
    # 翻译到中间语言
    translated = model.generate(**tokenizer(text, return_tensors='pt'))
    mid_text = tokenizer.decode(translated[0])
    
    # 翻译回原语言
    model_name_back = f'Helsinki-NLP/opus-mt-{mid}-{src}'
    tokenizer_back = MarianTokenizer.from_pretrained(model_name_back)
    model_back = MarianMTModel.from_pretrained(model_name_back)
    back = model_back.generate(**tokenizer_back(mid_text, return_tensors='pt'))
    
    return tokenizer_back.decode(back[0])
```

### 改写

```python
# 使用 LLM 改写指令
REWRITE_PROMPT = """请改写以下指令，保持意思不变但换种说法：
原指令：{instruction}
改写后："""

def rewrite_instruction(instruction, model, tokenizer):
    """使用模型改写指令"""
    prompt = REWRITE_PROMPT.format(instruction=instruction)
    # ... 调用模型生成
    return rewritten
```

---

## 六、完整流程

```bash
# 1. 下载数据
python download_data.py

# 2. 清洗数据
python clean_data.py --input raw.jsonl --output cleaned.jsonl

# 3. 划分数据集
python split_dataset.py --input cleaned.jsonl

# 4. 验证数据
python validate_data.py --train train.json --val val.json
```

### 数据验证检查项

- [ ] 数据量是否足够（建议 > 1000 条）
- [ ] 格式是否统一
- [ ] 是否有重复数据
- [ ] 是否有敏感内容
- [ ] 输出长度是否合理
- [ ] 训练/验证/测试是否不重叠

---

## 七、数据统计脚本

```python
import json
from collections import Counter

def analyze_dataset(file_path):
    """分析数据集统计信息"""
    lengths = {'instruction': [], 'output': []}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            lengths['instruction'].append(len(data.get('instruction', '')))
            lengths['output'].append(len(data.get('output', '')))
    
    for key in lengths:
        vals = lengths[key]
        print(f"\n{key} 统计:")
        print(f"  数量: {len(vals)}")
        print(f"  平均长度: {sum(vals)/len(vals):.1f}")
        print(f"  最小长度: {min(vals)}")
        print(f"  最大长度: {max(vals)}")
        print(f"  中位数: {sorted(vals)[len(vals)//2]}")

analyze_dataset('train.json')
```

---

**准备好数据后，运行 `colab_train.py` 开始训练！** 🚀
