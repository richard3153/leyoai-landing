"""
Nexify Video Safety Assistant - Gradio 5 App
HuggingFace Spaces 部署专用
训练完成: 3 epochs, 562 steps, Loss ~0.45
LoRA: FFZwai/qwen2.5-1.5b-video-safety
"""
import gradio as gr
import torch
import os

print("🔄 加载模型中...")
device = "cuda" if torch.cuda.is_available() else "cpu"

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
LORA_MODEL = "FFZwai/qwen2.5-1.5b-video-safety"

MODEL_READY = False

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    print(f"📥 从 {BASE_MODEL} 加载基础模型...")
    torch_dtype = torch.float16 if device == "cuda" else torch.float32

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch_dtype,
        device_map="auto",
    )

    print(f"🔗 加载 LoRA: {LORA_MODEL}")
    try:
        model = PeftModel.from_pretrained(base_model, LORA_MODEL)
        model.eval()
        print("✅ LoRA 加载成功!")
    except Exception as lora_err:
        print(f"⚠️ LoRA 加载失败，使用基础模型: {lora_err}")
        model = base_model
        model.eval()

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print("✅ 模型加载完成!")
    MODEL_READY = True

except Exception as e:
    print(f"⚠️ 模型加载失败: {e}")
    import traceback
    traceback.print_exc()


def answer(question, history=None):
    """处理用户问题"""
    if not MODEL_READY:
        return "⚠️ 模型未就绪，请稍后再试。"

    if not question or not question.strip():
        return "请输入问题"

    try:
        messages = [
            {"role": "system", "content": (
                "你是一个专业的视频内容安全分析助手。分析用户描述的视频场景，"
                "识别其中的安全风险、危险行为和隐患，给出简洁、专业的安全建议。\n"
                "回答要针对具体场景，避免泛泛而谈。用中文回答。"
            )},
            {"role": "user", "content": question.strip()},
        ]

        text = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = tokenizer(
            text, return_tensors="pt",
            max_length=512, truncation=True
        )

        compute_device = "cuda" if torch.cuda.is_available() else "cpu"
        inputs = {k: v.to(compute_device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=250,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        response = tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        )
        return response.strip() if response.strip() else "模型未返回有效回答。"
    except Exception as e:
        import traceback
        return f"❌ 错误: {str(e)[:200]}\n{traceback.format_exc()[-300:]}"


examples = [
    ["视频里电脑突然弹出\"系统中毒，立即联系客服\"的弹窗，这是诈骗吗？"],
    ["有人发来链接说点击领取红包，这个链接安全吗？"],
    ["电梯门开着但电梯不在楼层，有人想爬进去，这个行为危险吗？"],
    ["油锅着火时，旁边有人用水去泼，正确吗？应该怎么处理？"],
    ["视频里看到有人被困在地铁屏蔽门和车厢之间，这时应该怎么做？"],
]

# Gradio 5 界面
with gr.Blocks(title="Nexify Video Safety") as demo:
    gr.Markdown("""
    # 🎬 Nexify Video Safety Assistant
    ### 基于 Qwen2.5-1.5B + 视频安全 LoRA 微调助手

    **使用方法：** 描述你看到的视频内容或场景，AI 会帮你分析安全风险。

    ⚠️ 本系统仅供安全教育参考，不构成专业安全建议。
    """)

    with gr.Row():
        with gr.Column(scale=3):
            question = gr.Textbox(
                label="📹 描述视频场景或输入安全问题",
                placeholder="例：视频里有人接到电话说医保卡被冻结，需要按9转人工…",
                lines=4,
            )
            with gr.Row():
                submit_btn = gr.Button("🔍 分析安全风险", variant="primary")
                clear_btn = gr.Button("🗑️ 清除")
        
        with gr.Column(scale=2):
            gr.Markdown("""
            **适用场景：**
            - 🔥 厨房/油锅火灾处置
            - 💰 网络诈骗识别（弹窗、链接、电话）
            - 🚇 地铁/电梯安全
            - 🏠 家庭火灾逃生
            - 🛒 购物/红包诈骗识别
            - 📱 账号安全（钓鱼/盗号）
            """)

    output = gr.Textbox(label="✅ 安全分析结果", lines=8)

    gr.Examples(examples=examples, inputs=question)

    submit_btn.click(fn=answer, inputs=question, outputs=output, api_name="predict")
    question.submit(fn=answer, inputs=question, outputs=output, api_name="predict")
    clear_btn.click(fn=lambda: ("", ""), inputs=[], outputs=[question, output])

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
