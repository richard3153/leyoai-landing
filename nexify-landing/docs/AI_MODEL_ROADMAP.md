# AI 模型技术路线图

> Nexify 垂直领域模型研发规划 v1.0
> 最后更新：2026-04-06

---

## 1. 模型研发技术栈

### 1.1 训练框架对比

| 框架 | 优势 | 劣势 | 适用场景 | 推荐度 |
|------|------|------|----------|--------|
| **LLaMA Factory** | 零代码 WebUI、支持多种模型、LoRA/QLoRA 开箱即用 | 大规模分布式训练支持较弱 | 快速原型、中小规模微调 | ⭐⭐⭐⭐⭐ |
| **Axolotl** | 配置驱动、社区活跃、支持最新模型 | 学习曲线较陡 | 生产级微调 pipeline | ⭐⭐⭐⭐ |
| **DeepSpeed** | 大规模分布式训练、显存优化极致 | 配置复杂、需要深入理解 | 百亿参数以上全量微调 | ⭐⭐⭐ |
| **Unsloth** | 训练速度极快（2-5x）、显存占用低 | 支持模型有限、功能相对单一 | 快速迭代、资源受限场景 | ⭐⭐⭐⭐ |

**推荐方案**：
- **MVP 阶段**：LLaMA Factory（快速验证，零代码上手）
- **生产阶段**：Axolotl + Unsloth 组合（效率 + 灵活性）

---

### 1.2 基座模型选择建议

| 模型 | 参数规模 | 中文能力 | 许可证 | 社区活跃度 | 推荐理由 |
|------|----------|----------|--------|------------|----------|
| **Qwen2.5** | 0.5B-72B | ⭐⭐⭐⭐⭐ | Apache 2.0 | 极高 | 中文理解最强，开源友好，工具调用优秀 |
| **Llama 3.1** | 8B-405B | ⭐⭐⭐ | Llama License | 极高 | 生态最成熟，英文任务首选 |
| **Mistral-Nemo** | 12B | ⭐⭐⭐ | Apache 2.0 | 高 | 性价比高，12B 黄金尺寸 |
| **Yi-1.5** | 6B-34B | ⭐⭐⭐⭐⭐ | Apache 2.0 | 中 | 零一万物出品，长上下文优秀 |
| **DeepSeek-V3** | 671B MoE | ⭐⭐⭐⭐⭐ | MIT | 高 | 性能对标 GPT-4，MoE 架构 |

**首选推荐**：**Qwen2.5-7B/14B**
- 中文能力最强
- Apache 2.0 许可证，商业友好
- 社区资源丰富
- 7B/14B 参数量适合快速迭代

---

### 1.3 微调方法对比

| 方法 | 显存需求 | 训练速度 | 模型性能 | 适用场景 |
|------|----------|----------|----------|----------|
| **LoRA** | 低 (~4GB for 7B) | 快 | 保留 95%+ 性能 | 通用首选 |
| **QLoRA** | 极低 (~6GB for 70B) | 中 | 保留 90%+ 性能 | 资源受限场景 |
| **Full Fine-tune** | 极高 (~80GB for 7B) | 慢 | 100% 性能潜力 | 任务极度专精 |

**推荐方案**：
- **阶段一**：QLoRA（快速验证领域适配性）
- **阶段二**：LoRA（提升性能，平衡资源）
- **阶段三**：Full Fine-tune（如有必要且资源充足）

---

### 1.4 推理优化方案

| 方案 | 延迟 | 吞吐量 | 部署复杂度 | 适用场景 |
|------|------|--------|------------|----------|
| **vLLM** | 极低 | 极高 | 中 | 高并发生产部署，首选 |
| **TensorRT-LLM** | 极低 | 高 | 高 | NVIDIA GPU 最优性能 |
| **GGUF + llama.cpp** | 低 | 中 | 低 | 边缘设备、CPU 推理 |
| **llamafile** | 低 | 中 | 极低 | 单文件分发、快速部署 |

**推荐方案**：
- **云部署**：vLLM（PagedAttention 优化，高并发首选）
- **边缘部署**：GGUF 量化（4-bit/8-bit，资源友好）
- **快速分发**：llamafile（一键运行）

---

## 2. HuggingFace 发布流程

### 2.1 Model Card 模板（必填字段）

```markdown
---
license: apache-2.0
library_name: transformers
tags:
  - your-domain-tag
  - fine-tuned
base_model: Qwen/Qwen2.5-7B
datasets:
  - your-dataset-name
language:
  - zh
  - en
pipeline_tag: text-generation
---

# Model Name

## Model Description
- **Developed by:** Nexify
- **Model type:** Causal Language Model
- **Language(s):** Chinese, English
- **License:** Apache 2.0
- **Base model:** Qwen/Qwen2.5-7B

## Uses
### Direct Use
[Describe intended use cases]

### Out-of-Scope Use
[Describe what the model should NOT be used for]

## Training Details
### Training Data
[Data sources and processing]

### Training Procedure
- **Framework:** LLaMA Factory
- **Method:** LoRA
- **Hardware:** [GPU specs]
- **Training time:** [hours]

## Evaluation
[Benchmark results]

## Limitations
[Known limitations]

## Environmental Impact
- **Hardware used:** [GPU type]
- **Hours used:** [training hours]
- **Cloud provider:** [if applicable]
- **Compute region:** [region]

## Citation
[BibTeX citation]
```

---

### 2.2 许可证选择指南

| 许可证 | 商用 | 专利授权 | 要求署名 | 要求开源 | 推荐场景 |
|--------|------|----------|----------|----------|----------|
| **Apache 2.0** | ✅ | ✅ | ✅ | ❌ | 最推荐，商业友好 |
| **MIT** | ✅ | ❌ | ✅ | ❌ | 最宽松，适合工具类 |
| **CC-BY-4.0** | ✅ | ❌ | ✅ | ❌ | 适合数据集/模型 |
| **CC-BY-NC-4.0** | ❌ | ❌ | ✅ | ❌ | 非商业用途 |

**推荐**：**Apache 2.0**（专利保护 + 商业友好）

---

### 2.3 安全审查清单

**发布前必须检查**：

- [ ] **数据安全**
  - 训练数据无 PII（个人身份信息）泄露
  - 无受版权保护内容违规使用
  - 敏感数据已脱敏处理

- [ ] **模型输出安全**
  - 已测试对抗性输入（越狱攻击）
  - 无有害内容生成（仇恨、歧视、暴力）
  - 幻觉率可接受

- [ ] **合规检查**
  - 训练数据来源可追溯
  - 许可证兼容性确认
  - 出口合规（如适用）

- [ ] **技术安全**
  - 模型无后门
  - 权重文件完整性校验
  - API 接口安全测试通过

---

### 2.4 GitHub Actions 自动发布 Pipeline

```yaml
# .github/workflows/publish-to-hf.yml
name: Publish to HuggingFace

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install huggingface_hub transformers

      - name: Publish to HuggingFace
        env:
          HF_TOKEN: ${{ secrets.HF_TOKEN }}
        run: |
          from huggingface_hub import HfApi
          import os
          
          api = HfApi()
          api.upload_folder(
              folder_path="./model_output",
              repo_id="nexify/model-name",
              repo_type="model",
              token=os.environ["HF_TOKEN"]
          )
          
          # Upload model card
          api.upload_file(
              path_or_fileobj="./README.md",
              path_in_repo="README.md",
              repo_id="nexify/model-name",
              repo_type="model",
              token=os.environ["HF_TOKEN"]
          )
```

---

## 3. 合规检查清单

### 3.1 训练数据版权验证流程

```
数据采集 → 来源记录 → 许可证审核 → 风险评估 → 合规入库
```

**检查项**：
1. **来源追溯**：每个数据源记录 URL/作者/许可证
2. **许可证分类**：
   - ✅ 绿色：CC0, Apache 2.0, MIT
   - ⚠️ 黄色：CC-BY, CC-BY-SA（需署名/继承）
   - ❌ 红色：All Rights Reserved, NC/ND 变体
3. **风险评估表**：高/中/低风险数据分类处理
4. **文档留存**：数据来源清单、许可证副本存档

---

### 3.2 模型输出安全测试标准

| 测试类型 | 测试方法 | 通过标准 |
|----------|----------|----------|
| **有害内容** | Red Teaming 攻击测试 | 有害输出率 < 0.1% |
| **偏见检测** | 多维度公平性评测 | 差异系数 < 0.15 |
| **幻觉测试** | 事实准确性评测 | 事实准确率 > 85% |
| **越狱攻击** | Jailbreak prompt 测试 | 防御成功率 > 95% |

**推荐工具**：
- [Giskard](https://github.com/Giskard-AI/giskard)：AI 安全测试平台
- [Fairlearn](https://fairlearn.org/)：公平性评估
- [TruthfulQA](https://github.com/sylinrl/TruthfulQA)：真实性测试

---

### 3.3 专利自查流程

1. **专利检索**
   - 使用 Google Patents / CNIPA 检索相关专利
   - 关键词：`模型微调`、`领域适应`、`垂直领域`、`LLM`、`transformer`

2. **侵权风险评估**
   - 确认训练方法是否涉及专利技术
   - 评估 "合理使用" 抗辩空间

3. **专利布局**
   - 创新训练方法：考虑申请专利
   - 领域适配技术：评估专利价值

4. **法律意见**
   - 高风险场景：咨询知识产权律师

---

### 3.4 HuggingFace 政策合规要点

**必须遵守**：
1. **内容政策**：禁止上传恶意模型、恶意软件、受限制内容
2. **许可证政策**：必须标注正确的许可证标识
3. **数据政策**：训练数据需符合隐私和版权要求
4. **安全报告**：建议提交模型卡和安全评估

**建议做法**：
- 使用 `library_name` 标注框架
- 提供完整的训练信息
- 明确标注 `out-of-scope` 用途
- 提供联系方式用于安全问题报告

---

## 4. 第一个垂直模型计划

### 4.1 推荐领域（附 3 个备选）

#### 🥇 首选推荐：**法律咨询助手**

**推荐理由**：
1. **市场需求强**：中小企业法律服务需求大，但律师费用高昂
2. **数据可获取**：公开法律文书、法规、判例丰富
3. **评估标准明确**：法律条文有明确答案，易于评测
4. **商业价值高**：可对接律所、企业法务、法律咨询平台
5. **风险可控**：法律领域有明确的合规边界

**数据来源**：
- 中国裁判文书网
- 国家法律法规数据库
- 律师实务问答数据集

---

#### 🥈 备选一：**医疗问诊助手**

**优点**：
- 市场需求极大
- 公开医学知识丰富

**挑战**：
- 合规要求极高（医疗许可证）
- 误诊风险大
- 需要专业医生验证

---

#### 🥉 备选二：**金融分析助手**

**优点**：
- 高净值用户群体
- 商业价值高

**挑战**：
- 金融数据合规要求严格
- 市场已有多家竞争者
- 需要实时数据接入

---

#### 备选三：**教育辅导助手**

**优点**：
- 市场规模大
- 数据相对开放（题库、教材）

**挑战**：
- 商业化竞争激烈
- 效果评估标准不一

---

### 4.2 资源需求估算（以法律助手为例）

| 阶段 | GPU 需求 | 时间 | 费用估算（云 GPU） |
|------|----------|------|-------------------|
| **数据准备** | 无 | 2 周 | - |
| **MVP 微调** | 1x A100 (80GB) | 2-3 天 | ¥300-500 |
| **迭代优化** | 4x A100 | 1 周 | ¥3,000-5,000 |
| **评测测试** | 1x A100 | 3 天 | ¥300-500 |
| **总计** | - | 4-5 周 | **¥3,600-6,000** |

**省钱建议**：
- 使用 Google Colab Pro（¥75/月，A100 限时可用）
- 使用 AutoDL 等国内 GPU 租赁平台（¥2-3/小时/A100）
- QLoRA 微调可用 RTX 3090/4090 替代 A100

---

### 4.3 开发时间线

```
Week 1-2: 数据收集与清洗
├── 法律文书爬取
├── 法规数据库整理
├── 问答数据清洗
└── 数据格式转换

Week 3: MVP 开发
├── 基座模型选型（Qwen2.5-7B）
├── QLoRA 微调
├── 初版评测
└── 迭代优化

Week 4: v1.0 开发
├── LoRA 全量微调
├── 多维度评测
├── 安全测试
└── 模型量化

Week 5: 发布准备
├── Model Card 编写
├── 合规检查
├── HuggingFace 发布
├── GitHub 代码开源
└── 推广材料准备
```

---

## 附录

### A. 推荐资源

**学习资源**：
- [LLaMA Factory 文档](https://github.com/hiyouga/LLaMA-Factory)
- [HuggingFace 模型上传指南](https://huggingface.co/docs/hub/models-uploading)
- [AI 安全评测框架 Giskard](https://www.giskard.ai/)

**社区**：
- HuggingFace 中文社区
- 智源社区
- GitHub Trending (LLM)

---

> 文档维护：Nexify CTO
> 版本：v1.0 | 2026-04-06
