"""
Nexify Video Safety Assistant - 真正的视频分析版本
支持视频上传 + 关键帧提取 + Qwen2-VL 分析
"""
import gradio as gr
import torch
import os
import tempfile
from pathlib import Path

# 预加载模型
print("🔄 加载模型中...")
device = "cuda" if torch.cuda.is_available() else "cpu"

BASE_MODEL = "Qwen/Qwen2-VL-2B-Instruct"
LORA_MODEL = "FFZwai/nexify-video-safety-lora"

MODEL_READY = False
model = None
processor = None

try:
    from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
    from peft import PeftModel
    
    print(f"📥 从 {BASE_MODEL} 加载基础模型...")
    torch_dtype = torch.float16 if device == "cuda" else torch.float32
    
    base_model = Qwen2VLForConditionalGeneration.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch_dtype,
    ).to(device)
    
    print(f"🔗 加载 LoRA: {LORA_MODEL}")
    try:
        model = PeftModel.from_pretrained(base_model, LORA_MODEL)
        model.eval()
        print("✅ LoRA 加载成功")
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


def extract_video_frames(video_path, max_frames=8):
    """提取视频关键帧"""
    import cv2
    import numpy as np
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    
    # 均匀采样关键帧
    if total_frames <= max_frames:
        frame_indices = list(range(total_frames))
    else:
        frame_indices = [int(i * total_frames / max_frames) for i in range(max_frames)]
    
    frames = []
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            # BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            from PIL import Image
            pil_image = Image.fromarray(frame_rgb)
            frames.append(pil_image)
    
    cap.release()
    return frames, duration, len(frames)


def analyze_video(video_file, question, progress=gr.Progress()):
    """分析视频内容"""
    if not MODEL_READY:
        return "⚠️ 模型未就绪，请稍后再试。"
    
    if video_file is None:
        return "请先上传视频文件"
    
    if not question or not question.strip():
        question = "分析这个视频中的安全隐患"
    
    try:
        progress(0.1, desc="提取视频帧...")
        
        # 提取视频帧
        frames, duration, num_frames = extract_video_frames(video_file)
        
        if not frames:
            return "❌ 无法提取视频帧，请检查视频格式"
        
        progress(0.3, desc=f"已提取 {num_frames} 帧，正在分析...")
        
        # 构建多模态消息
        # Qwen2-VL 格式: 文本 + 图片
        content = [{"type": "text", "text": question.strip()}]
        
        # 添加图片（最多4帧，避免超长）
        for frame in frames[:4]:
            content.append({"type": "image", "image": frame})
        
        messages = [{"role": "user", "content": content}]
        
        # 处理输入
        text = processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        
        inputs = processor(
            text=[text],
            images=[f for f in frames[:4]],
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        progress(0.6, desc="模型推理中...")
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                do_sample=False,
                pad_token_id=processor.tokenizer.pad_token_id,
                eos_token_id=processor.tokenizer.eos_token_id,
            )
        
        response = processor.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        )
        
        progress(1.0, desc="完成!")
        
        # 添加元信息
        result = f"""📊 **视频分析结果**

🎬 视频时长: {duration:.1f}s | 分析帧数: {num_frames}帧

💬 **问题**: {question}

✅ **回答**:
{response.strip()}
"""
        return result
        
    except Exception as e:
        import traceback
        return f"❌ 分析失败: {e}\n\n{traceback.format_exc()[-800:]}"


# Gradio 界面
with gr.Blocks(title="Nexify Video Safety - 视频分析") as demo:
    gr.Markdown("""
    # 🎬 Nexify Video Safety Assistant
    ### 上传视频，AI 自动分析安全隐患
    
    支持格式: MP4, AVI, MOV, WebM | 建议时长: 10-60秒
    """)
    
    with gr.Row():
        with gr.Column(scale=1):
            video_input = gr.Video(
                label="📹 上传视频",
                format="mp4",
            )
            question_input = gr.Textbox(
                label="💬 问题 (可选)",
                placeholder="分析这个视频中的安全隐患...",
                lines=2,
            )
            analyze_btn = gr.Button("🔍 开始分析", variant="primary")
            clear_btn = gr.Button("🗑️ 清除")
        
        with gr.Column(scale=1):
            output = gr.Markdown(label="分析结果")
            
            gr.Markdown("""
            **分析能力:**
            - 🔥 火灾/烟雾检测
            - ⚠️ 危险行为识别
            - 🚪 逃生通道分析
            - 💰 诈骗场景识别
            - 🍽️ 食品安全问题
            """)
    
    # 示例
    gr.Examples(
        examples=[
            [None, "分析这个视频中的消防安全隐患"],
            [None, "识别视频中是否存在诈骗行为"],
            [None, "这个视频里的逃生路线是否正确？"],
        ],
        inputs=[video_input, question_input],
        label="示例问题"
    )
    
    analyze_btn.click(
        fn=analyze_video,
        inputs=[video_input, question_input],
        outputs=output,
    )
    clear_btn.click(
        fn=lambda: (None, "", ""),
        inputs=[],
        outputs=[video_input, question_input, output],
    )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
