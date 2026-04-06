# Colab/Kaggle 免费 GPU 训练指南

> 成本: $0 | 适合: 学习、原型验证、小规模训练

---

## 一、注册账号

### Google Colab
1. 访问 [colab.research.google.com](https://colab.research.google.com)
2. 使用 Gmail 账号登录
3. 无需额外注册，直接可用

### Kaggle
1. 访问 [kaggle.com](https://www.kaggle.com)
2. 点击 Register 注册账号
3. 验证邮箱后即可使用

---

## 二、Google Colab 使用步骤

### Step 1: 新建笔记本
```
文件 → 新建笔记本
```

### Step 2: 连接免费 GPU
1. 点击右上角「连接」
2. 点击「更改运行时类型」
3. 选择 `T4 GPU`
4. 点击保存，等待连接成功

### Step 3: 验证 GPU
```python
!nvidia-smi
```
看到 Tesla T4 信息即成功。

### Step 4: 安装依赖
```python
!pip install transformers accelerate peft bitsandbytes
```

### Step 5: 上传训练代码
- 方式1: 直接在 Colab 单元格中编写
- 方式2: 从 Google Drive 挂载
```python
from google.colab import drive
drive.mount('/content/drive')
```
- 方式3: 从 GitHub 克隆

### Step 6: 运行训练
执行训练脚本，监控 GPU 使用率。

### Colab 免费额度
- **会话时长**: 最长 12 小时
- **GPU 类型**: T4 (16GB 显存)
- **断线重连**: 超时或断线需重新运行

---

## 三、Kaggle 使用步骤

### Step 1: 创建 Notebook
1. 登录 Kaggle
2. 点击 `Code` → `New Notebook`

### Step 2: 启用 GPU
1. 右侧面板 `Accelerator`
2. 选择 `GPU P100` 或 `GPU T4 x2`
3. 保存设置

### Step 3: 验证 GPU
```python
!nvidia-smi
```

### Step 4: 添加数据集
- 点击 `Add Data` 添加公开数据集
- 或上传自己的数据

### Kaggle 免费额度
- **GPU 时长**: 30 小时/周
- **GPU 类型**: P100 (16GB) 或 T4 (16GB)
- **会话时长**: 最长 12 小时（可设置更长）
- **持久化**: Output 文件可下载保存

---

## 四、平台对比

| 特性 | Colab | Kaggle |
|------|-------|--------|
| 免费额度 | 无明确限制 | 30小时/周 |
| GPU 类型 | T4 | P100 / T4 |
| 会话时长 | 12小时 | 12小时 |
| 数据持久化 | Google Drive | Kaggle Datasets |
| 协作功能 | 支持 | 支持 |
| 适合场景 | 快速实验 | 竞赛、长期项目 |

---

## 五、省钱技巧

1. **数据预处理好再上传** - 减少 GPU 计算时间
2. **使用小模型验证** - 先用小参数量验证流程
3. **checkpoint 定期保存** - 防止断线丢失进度
4. **batch size 调优** - 最大化利用显存
5. **混合精度训练** - `fp16` 或 `bf16` 加速

---

## 六、常见问题

### Q: 训练中断怎么办?
A: 保存 checkpoint，重连后加载继续训练。

### Q: 显存不够怎么办?
A: 
- 减小 batch size
- 使用 gradient checkpointing
- 使用 4bit/8bit 量化加载模型

### Q: 如何保存模型?
A: 
```python
model.save_pretrained("/content/drive/MyDrive/model")
tokenizer.save_pretrained("/content/drive/MyDrive/model")
```

---

## 七、推荐工作流

```
1. 本地编写代码 → 推送 GitHub
2. Colab/Kaggle 克隆代码
3. 连接 GPU，安装依赖
4. 运行训练，保存 checkpoint 到云端
5. 训练完成，下载模型
```

---

**Happy Training!** 🚀
