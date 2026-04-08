"""
Nexify Video Safety Assistant - Gradio 5 App
HuggingFace Spaces 部署专用
"""
import gradio as gr
import torch
import os

# 预加载模型
print("🔄 加载模型中...")
device = "cuda" if torch.cuda.is_available() else "cpu"

BASE_MODEL = "Qwen/Qwen2-VL-2B-Instruct"
LORA_MODEL = "FFZwai/nexify-video-safety-lora"

MODEL_READY = False

try:
    from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
    from peft import PeftModel
    
    print(f"📥 从 {BASE_MODEL} 加载基础模型...")
    torch_dtype = torch.float16 if device == "cuda" else torch.float32
    
    base_model = Qwen2VLForConditionalGeneration.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch_dtype,
    )
    
    print(f"🔗 加载 LoRA: {LORA_MODEL}")
    try:
        model = PeftModel.from_pretrained(base_model, LORA_MODEL)
        model.eval()
    except Exception as lora_err:
        print(f"⚠️ LoRA 加载失败，使用基础模型: {lora_err}")
        model = base_model
        model.eval()
    
    processor = AutoProcessor.from_pretrained(BASE_MODEL)
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
        messages = [{"role": "user", "content": [{"type": "text", "text": question.strip()}]}]
        text = processor.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = processor.tokenizer(
            text, return_tensors="pt",
            max_length=512, truncation=True
        )
        inputs = {k: v.to("cpu") for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=200,
                do_sample=False,
                pad_token_id=processor.tokenizer.pad_token_id,
                eos_token_id=processor.tokenizer.eos_token_id,
            )

        response = processor.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        )
        return response.strip() if response.strip() else "模型未返回有效回答。"
    except Exception as e:
        import traceback
        return f"❌ 错误: {e}\n{traceback.format_exc()[-500:]}"


examples = [
    ["油锅着火怎么办？"],
    ["如何识别网络诈骗？"],
    ["视频里看到有人被困电梯，应该怎么做？"],
    ["家里发生火灾，如何正确逃生？"],
]

# Gradio 5 界面
with gr.Blocks(title="Nexify Video Safety") as demo:
    gr.Markdown("""
    # 🎬 Nexify Video Safety Assistant
    ### 基于 Qwen2-VL-2B-Instruct + LoRA 的视频安全内容理解助手
    """)

    with gr.Row():
        with gr.Column(scale=3):
            question = gr.Textbox(
                label="💬 输入您的问题",
                placeholder="描述一个视频场景或询问安全问题...",
                lines=4,
            )
            with gr.Row():
                submit_btn = gr.Button("🔍 提问", variant="primary")
                clear_btn = gr.Button("🗑️ 清除")
        
        with gr.Column(scale=2):
            gr.Markdown("""
            **功能范围：**
            - 🔥 消防安全问答
            - 💰 诈骗识别与预防
            - 🚪 紧急逃生指南
            - 🍽️ 食品安全咨询
            - ⚠️ 公共场所安全
            """)

    output = gr.Textbox(label="✅ 回答", lines=6)

    gr.Examples(examples=examples, inputs=question)

    submit_btn.click(fn=answer, inputs=question, outputs=output, api_name="predict")
    question.submit(fn=answer, inputs=question, outputs=output, api_name="predict")
    clear_btn.click(fn=lambda: ("", ""), inputs=[], outputs=[question, output])

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
