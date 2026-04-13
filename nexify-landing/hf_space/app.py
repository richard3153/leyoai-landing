import gradio as gr
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# 模型配置
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
LORA_MODEL = "FFZwai/qwen2.5-1.5b-video-safety"

# 加载模型和tokenizer
print("Loading base model...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True
)

print("Loading LoRA adapter...")
model = PeftModel.from_pretrained(base_model, LORA_MODEL)
model.eval()

def classify_video_safety(text: str) -> dict:
    """
    分类视频安全性
    返回: safe, harmful, 或 borderline
    """
    if not text.strip():
        return {"label": "请输入文本", "confidence": 0}
    
    prompt = f"""请判断以下视频描述的安全性。只回答 safe（安全）、harmful（有害）或 borderline（边界）。

视频描述：{text}

安全性判断："""

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=20,
            temperature=0.1,
            do_sample=False
        )
    
    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip().lower()
    
    # 解析结果
    if "safe" in response:
        label = "safe"
        confidence = 0.9
    elif "harmful" in response:
        label = "harmful"
        confidence = 0.9
    elif "borderline" in response:
        label = "borderline"
        confidence = 0.7
    else:
        label = response.split()[0] if response.split() else "unknown"
        confidence = 0.5
    
    return {"label": label, "confidence": confidence, "raw_response": response}

# Gradio 界面
with gr.Blocks(title="Nexify Video Safety Classifier") as demo:
    gr.Markdown("# 🎬 Nexify 视频安全分类器")
    gr.Markdown("基于 Qwen2.5-1.5B 微调的 LoRA 模型，用于快速判断视频内容的安全性")
    
    with gr.Row():
        with gr.Column(scale=3):
            input_text = gr.Textbox(
                label="视频描述",
                placeholder="输入视频内容描述，例如：一个教人做饭的教程视频...",
                lines=5
            )
            classify_btn = gr.Button("🔍 分析安全性", variant="primary")
        
        with gr.Column(scale=2):
            output_label = gr.Textbox(label="安全标签", interactive=False)
            output_confidence = gr.Textbox(label="置信度", interactive=False)
            output_raw = gr.Textbox(label="原始响应", interactive=False, lines=3)
    
    # 示例
    gr.Markdown("### 📝 示例")
    examples = [
        ["一个美食博主分享如何制作正宗的意大利面"],
        ["教人如何破解WiFi密码的教程"],
        ["美女穿着比基尼在海边跳舞"],
        ["分享一些提高工作效率的方法"],
        ["展示街头恶作剧，吓唬路人"]
    ]
    gr.Examples(examples, input_text)
    
    # 事件绑定
    def process(text):
        result = classify_video_safety(text)
        return result["label"], f"{result['confidence']:.0%}", result["raw_response"]
    
    classify_btn.click(
        process,
        inputs=[input_text],
        outputs=[output_label, output_confidence, output_raw]
    )

if __name__ == "__main__":
    demo.launch()
