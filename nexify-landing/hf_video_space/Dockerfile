FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Gradio 5.x has rewritten frontend (no Jinja2 template issues)
# 安装 torch 先（避免后面被覆盖），然后强制重装兼容的 Jinja2
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir \
    "gradio>=5.0.0" \
    "transformers>=4.44.0,<4.46.0" \
    "peft>=0.18.0" \
    "accelerate>=0.26.0" \
    "safetensors>=0.4.0" \
    "jinja2>=3.1.0" && \
    pip install --force-reinstall "markupsafe==2.1.5"

COPY app.py .

EXPOSE 7860
CMD ["python", "app.py"]
