"""
Nexify Video Safety Assistant - HuggingFace Space
视频内容安全理解助手 / Video Content Safety Analyzer

加载方式：
- 基座：Qwen/Qwen2-VL-2B-Instruct (HuggingFace)
- LoRA: FFZwai/nexify-video-safety-lora (训练完成后上传)
"""

import streamlit as st
import torch
import time
from PIL import Image

# ── 页面配置 ──────────────────────────────────────────
st.set_page_config(
    page_title="Nexify Video Safety - 内容安全分析",
    page_icon="🎬",
    layout="wide",
)

PRIMARY = "#6366F1"
ACCENT  = "#10B981"

# ── 模型配置 ──────────────────────────────────────────
BASE_MODEL_ID  = "Qwen/Qwen2-VL-2B-Instruct"
LORA_ADAPTER   = "FFZwai/nexify-video-safety-lora"  # 训练完成后替换
USE_LORA       = True

@st.cache_resource
def load_model():
    """加载 Qwen2-VL + LoRA"""
    from transformers import AutoProcessor, AutoModelForCausalLM
    from peft import PeftModel

    device = "cuda" if torch.cuda.is_available() else "cpu"

    with st.spinner("🔄 正在加载 Qwen2-VL-2B-Instruct（首次需下载，可能需要 2-3 分钟）..."):
        try:
            base = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_ID,
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True,
            )
            processor = AutoProcessor.from_pretrained(
                BASE_MODEL_ID,
                trust_remote_code=True,
            )

            if USE_LORA:
                with st.spinner("🔗 加载 LoRA adapter..."):
                    model = PeftModel.from_pretrained(base, LORA_ADAPTER)
                st.success("✅ Qwen2-VL-2B + LoRA 微调版已加载")
            else:
                model = base
                st.success("✅ Qwen2-VL-2B 基座模型已加载")

            return model, processor, device
        except Exception as e:
            st.error(f"❌ 模型加载失败: {e}")
            return None, None, None


def safe_generate(model, processor, image: Image.Image, question: str, device: str):
    """安全的生成调用，带超时和错误处理"""
    from qwen_vl_utils import process_vision_info

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": question},
            ]
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    image_inputs, _ = process_vision_info(messages)

    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=None,
        padding=True,
        return_tensors="pt",
    ).to(device)

    start = time.time()
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
        )
    elapsed = time.time() - start

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
        <h1 style="color: white; margin: 0;">🎬 Nexify Video Safety</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 0.5rem 0 0 0;">
            视频内容安全理解助手 · Qwen2-VL-2B 微调版 · Nexify MaaS
        </p>
    </div>
    """, unsafe_allow_html=True)

    # ── 模型信息 ───────────────────────────────────────
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("基座模型", "Qwen2-VL-2B", "1.5B 参数")
    with col2:
        status = "微调版" if USE_LORA else "基座版"
        st.metric("LoRA", status, "r=16")
    with col3:
        dev = "GPU" if torch.cuda.is_available() else "CPU"
        st.metric("运行设备", dev, "自动")
    with col4:
        st.metric("Nexify", "MaaS", "nexify.com")

    st.divider()

    # ── 加载模型 ───────────────────────────────────────
    model, processor, device = load_model()
    if model is None:
        st.warning("⚠️ 模型未加载，请刷新页面重试")
        return

    # ── 上传区域 ───────────────────────────────────────
    st.subheader("📤 上传视频帧截图")
    col_img, col_qa = st.columns([1, 2])

    with col_img:
        uploaded_file = st.file_uploader(
            "选择图片（支持 JPG/PNG/WebP/GIF）",
            type=["jpg", "jpeg", "png", "webp", "gif"],
            help="上传视频关键帧截图进行分析",
        )

        if uploaded_file:
            image = Image.open(uploaded_file).convert("RGB")
            st.image(image, caption="上传图片", use_container_width=True)
            st.caption(f"📐 {image.size[0]}×{image.size[1]}px")

    with col_qa:
        presets = [
            "请分析这张图片是否存在安全隐患？",
            "这张图片中是否存在违规内容？请详细说明。",
            "作为安全专家，请评价图片中人物行为是否安全规范。",
            "这张图片涉及哪些安全风险点？",
            "请描述这张图片的主要内容。",
            "自定义问题...",
        ]

        question = st.selectbox("💬 选择分析类型", presets)

        if question == "自定义问题...":
            question = st.text_area(
                "🔍 自定义问题",
                placeholder="输入你想问的问题...",
                height=80,
            )

        if st.button("🚀 开始分析", type="primary", use_container_width=True, disabled=not uploaded_file):
            if not question or not uploaded_file:
                st.warning("请上传图片并输入问题")
            else:
                with st.spinner("🤖 AI 分析中，请稍候..."):
                    try:
                        result, elapsed = safe_generate(model, processor, image, question, device)
                        st.success(f"✅ 分析完成（耗时 {elapsed:.2f}s）")
                        st.markdown("---")
                        st.markdown("**📋 AI 分析结果：**")
                        st.info(result)
                    except Exception as e:
                        st.error(f"分析出错: {e}")

    # ── 能力展示 ───────────────────────────────────────
    st.divider()
    st.subheader("🎯 模型能力")

    caps = [
        ("🛡️ 内容安全审核", "涉黄/涉暴/涉政/广告检测"),
        ("⚠️ 风险点识别", "识别视频中的安全隐患"),
        ("📝 场景描述", "视频帧详细描述"),
        ("❓ 视频问答", "根据内容回答问题"),
        ("🏷️ 标签分类", "自动打标签"),
    ]

    cols = st.columns(len(caps))
    for i, (t, d) in enumerate(caps):
        with cols[i]:
            st.markdown(f"""
            <div style="background:#f8fafc; border-radius:10px; padding:1rem;
                        text-align:center; border:1px solid #e2e8f0; height:100%">
                <div style="font-size:1.5rem">{t}</div>
                <div style="font-size:0.8rem; color:#64748b; margin-top:0.5rem">{d}</div>
            </div>
            """, unsafe_allow_html=True)

    # ── 产品线 ───────────────────────────────────────
    st.divider()
    st.markdown("""
    **🔗 Nexify 产品线：**
    [🎬 Video Model](https://huggingface.co/spaces/FFZwai/nexify-video-safety-assistant) ·
    [🛡️ Cyber Model](https://huggingface.co/spaces/FFZwai/nexify-safety-assistant) ·
    [🌐 官网](https://dist-sigma-woad.vercel.app/)
    """)

    st.markdown(f"""
    <div style="text-align:center; color:#94a3b8; font-size:0.8rem; margin-top:1rem">
        Nexify MaaS Platform · Powered by Qwen2-VL-2B-Instruct + LoRA
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
