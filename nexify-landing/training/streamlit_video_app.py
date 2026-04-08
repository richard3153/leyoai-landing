"""
Nexify Video Model - Streamlit App
视频内容安全理解助手 / Video Content Safety Analyzer

基于 Qwen2-VL-2B-Instruct 微调模型
支持：图片上传 + 安全问题 → AI 回答
"""

import streamlit as st
import torch
import os
import time
from io import BytesIO
from PIL import Image

# ── 页面配置 ──────────────────────────────────────────
st.set_page_config(
    page_title="Nexify Video Model - 内容安全分析",
    page_icon="🎬",
    layout="wide",
)

# ── 品牌色 ───────────────────────────────────────────
PRIMARY = "#6366F1"   # Nexify 紫
ACCENT  = "#10B981"   # 绿色

# ── 模型路径 ──────────────────────────────────────────
BASE_MODEL = "Qwen/Qwen2-VL-2B-Instruct"   # 基础模型（HuggingFace）
# LoRA adapter 路径（PROJECT_ROOT/output/video_model/lora_adapter）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LOCAL_LORA = os.path.join(PROJECT_ROOT, "output", "video_model", "lora_adapter")

# ── Session 状态初始化 ─────────────────────────────────
@st.cache_resource
def load_model_and_processor():
    """加载模型和处理器（只加载一次）"""
    from transformers import AutoProcessor, AutoModelForCausalLM
    from peft import PeftModel
    import torch

    device = "cuda" if torch.cuda.is_available() else "mps"

    with st.spinner("🔄 正在加载 Qwen2-VL-2B-Instruct 模型..."):
        try:
            # 优先加载本地 LoRA adapter
            if os.path.exists(LOCAL_LORA):
                base_model = AutoModelForCausalLM.from_pretrained(
                    BASE_MODEL,
                    torch_dtype=torch.float16,
                    device_map="auto",
                    trust_remote_code=True,
                )
                processor = AutoProcessor.from_pretrained(BASE_MODEL, trust_remote_code=True)
                model = PeftModel.from_pretrained(base_model, LOCAL_LORA)
                st.success("✅ LoRA adapter 已加载（微调版）")
            else:
                # 无 LoRA，用基座模型
                model = AutoModelForCausalLM.from_pretrained(
                    BASE_MODEL,
                    torch_dtype=torch.float16,
                    device_map="auto",
                    trust_remote_code=True,
                )
                processor = AutoProcessor.from_pretrained(BASE_MODEL, trust_remote_code=True)
                st.info("ℹ️ 使用基座模型（微调版训练中...）")
            return model, processor, device
        except Exception as e:
            st.error(f"模型加载失败: {e}")
            return None, None, None

def analyze_image_safety(image: Image.Image, question: str, model, processor, device):
    """对图片进行安全分析"""
    if model is None:
        return "模型未加载，请稍后重试。"

    # 构建对话
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": question},
            ]
        }
    ]

    # 转文本格式
    text = processor.tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    # 图片处理
    image_inputs, video_inputs = [], []
    for msg in messages:
        for item in msg["content"]:
            if item["type"] == "image":
                image_inputs.append(item["image"])

    inputs = processor(
        text=[text],
        images=image_inputs,
        return_tensors="pt",
    ).to(device)

    # 生成
    start = time.time()
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
            temperature=None,
            top_p=None,
        )
    elapsed = time.time() - start

    # 解码
    response = processor.batch_decode(
        output[:, inputs.input_ids.shape[1]:],
        skip_special_tokens=True,
    )[0]

    return response.strip(), elapsed

def main():
    # ── Header ─────────────────────────────────────────
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, {PRIMARY} 0%, #8B5CF6 100%);
                padding: 2rem; border-radius: 16px; margin-bottom: 1.5rem;">
        <h1 style="color: white; margin: 0;">🎬 Nexify Video Model</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 0.5rem 0 0 0; font-size: 1.1rem;">
            视频内容安全理解助手 · 基于 Qwen2-VL-2B 微调 · MaaS 平台
        </p>
    </div>
    """, unsafe_allow_html=True)

    # ── 模型信息 ───────────────────────────────────────
    col_info1, col_info2, col_info3 = st.columns(3)
    with col_info1:
        st.metric("基座模型", "Qwen2-VL-2B", "1.5B 参数")
    with col_info2:
        st.metric("LoRA Adapter", "训练中" if not os.path.exists(LOCAL_LORA) else "已就绪", "r=16")
    with col_info3:
        st.metric("设备", "Apple MPS" if torch.backends.mps.is_available() else "NVIDIA GPU", "M2 Max")

    st.divider()

    # ── 模型加载 ───────────────────────────────────────
    model, processor, device = load_model_and_processor()

    if model is None:
        st.stop()

    # ── 主交互区 ────────────────────────────────────────
    st.subheader("📤 上传图片 / 视频帧截图")

    uploaded_file = st.file_uploader(
        "选择一张图片（支持 JPG/PNG/WebP）",
        type=["jpg", "jpeg", "png", "webp"],
        help="上传视频的关键帧截图进行分析",
    )

    if uploaded_file:
        image = Image.open(uploaded_file).convert("RGB")
        col_preview, col_qa = st.columns([1, 2])

        with col_preview:
            st.image(image, caption="上传的图片", use_container_width=True)
            st.caption(f"尺寸: {image.size[0]}×{image.size[1]}")

        with col_qa:
            # 预设问题
            preset_questions = [
                "请分析这张图片是否存在安全隐患？",
                "这张图片中是否存在违规内容？请详细说明。",
                "作为安全专家，请评价图片中人物行为是否安全规范。",
                "这张图片涉及哪些安全风险点？",
                "自定义问题...",
            ]

            selected = st.selectbox("💬 选择问题类型", preset_questions)

            if selected == "自定义问题...":
                question = st.text_input(
                    "🔍 请输入问题",
                    placeholder="请描述你想问的问题...",
                )
            else:
                question = selected
                st.text_input("🔍 问题", value=question, disabled=True, key="preset_q")

            if st.button("🚀 开始分析", type="primary", use_container_width=True):
                if not question:
                    st.warning("请输入问题")
                else:
                    with st.spinner("🤖 AI 分析中..."):
                        result = analyze_image_safety(image, question, model, processor, device)

                    if isinstance(result, tuple):
                        answer, elapsed = result
                        st.success(f"✅ 分析完成（耗时 {elapsed:.1f}s）")
                        st.markdown("---")
                        st.markdown(f"**📋 AI 分析结果：**")
                        st.info(answer)
                    else:
                        st.info(f"**📋 分析结果：**\n\n{result}")

    # ── 能力展示 ───────────────────────────────────────
    st.divider()
    st.subheader("🎯 模型能力")

    abilities = [
        ("🛡️ 内容安全审核", "涉黄/涉暴/涉政/广告/低质内容检测"),
        ("⚠️ 风险点识别", "识别视频中的安全隐患和风险行为"),
        ("📝 场景描述", "对视频帧进行详细的内容描述"),
        ("❓ 视频问答", "根据视频内容回答相关问题"),
        ("🏷️ 标签分类", "为视频内容自动打标签分类"),
    ]

    cols = st.columns(len(abilities))
    for i, (title, desc) in enumerate(abilities):
        with cols[i]:
            st.markdown(f"""
            <div style="background: #f8fafc; border-radius: 10px; padding: 1rem; text-align: center; border: 1px solid #e2e8f0;">
                <div style="font-size: 1.5rem;">{title}</div>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem;">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

    # ── Footer ─────────────────────────────────────────
    st.divider()
    st.markdown(f"""
    <div style="text-align: center; color: #94a3b8; font-size: 0.85rem;">
        <p>Powered by <b>Qwen2-VL-2B-Instruct</b> + LoRA 微调 | Nexify MaaS Platform</p>
        <p>Cyber Model · Video Model · Flow Model · Analytics Model</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
