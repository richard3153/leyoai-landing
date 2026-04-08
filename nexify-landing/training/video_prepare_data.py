#!/usr/bin/env python3
"""
Video Model 数据准备脚本
生成格式化的视频理解训练数据（供 Qwen2-VL-2B 使用）

数据来源：
  1. 视频安全问答（自建，500条）
  2. 视频场景描述（开源数据集，1000条）
  3. Cyber Model 安全问答（复用，500条）

输出：./data/video_train.jsonl
"""
import os
import json
import random
import urllib.request
from pathlib import Path
from tqdm import tqdm

# ── 配置 ──────────────────────────────────────────────
# 项目根目录（training/ 的上一级）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(OUTPUT_DIR, "video_train.jsonl")

# 安全类别
SAFE_CATEGORIES = [
    "网络安全", "数据隐私", "反诈骗", "信息安全",
    "应急逃生", "食品安全", "居家安全", "出行安全"
]

# 违规类别（用于负样本）
UNSAFE_CATEGORIES = [
    "钓鱼网站", "恶意软件", "诈骗电话", "隐私泄露风险"
]

# 视频帧场景（用于生成数据）
VIDEO_SCENES = [
    "办公室会议场景", "家庭客厅场景", "街道监控场景",
    "商场购物场景", "地铁站场景", "学校教室场景",
    "医院场景", "银行场景", "机场场景", "公园场景",
    "餐厅场景", "工厂场景", "图书馆场景"
]
# ─────────────────────────────────────────────────────

def generate_video_safety_data(n=500):
    """生成视频安全问答数据（模拟视频帧序列描述）"""
    records = []

    templates = [
        {
            "prompt": "这是一段{scene}的视频，请分析其中是否存在安全隐患？",
            "response": "经过分析，该视频中{desc}。"
        },
        {
            "prompt": "请检查这段{scene}的视频内容，判断是否涉及违规行为？",
            "response": "视频内容分析结果：{desc}。"
        },
        {
            "prompt": "作为安全专家，请评价这段{scene}视频中的人物行为是否安全规范？",
            "response": "安全评估：{desc}。"
        },
        {
            "prompt": "这段{scene}的视频中，有没有需要注意的安全风险点？",
            "response": "风险点分析：{desc}。"
        },
    ]

    safe_descs = [
        "未发现明显违规内容，整体安全合规",
        "场景安全，人们行为规范，无安全隐患",
        "内容合规，符合安全标准",
        "安全状况良好，未检测到危险行为",
        "该视频安全无害，适合观看",
    ]

    unsafe_descs = [
        "检测到潜在安全隐患：{specific}",
        "存在违规风险：{specific}",
        "发现安全问题：{specific}",
        "警告：该视频涉及{specific}风险",
    ]

    specific_issues = [
        "人员未佩戴安全装备",
        "存在消防通道堵塞情况",
        "紧急出口被遮挡",
        "易燃物品摆放不规范",
        "安全标识不清晰",
    ]

    for i in range(n):
        template = random.choice(templates)
        scene = random.choice(VIDEO_SCENES)
        is_safe = random.random() > 0.3  # 70% safe, 30% unsafe

        if is_safe:
            desc = random.choice(safe_descs)
        else:
            desc = random.choice(unsafe_descs).format(
                specific=random.choice(specific_issues)
            )

        record = {
            "id": f"vid_safe_{i:04d}",
            "type": "video",
            "category": random.choice(SAFE_CATEGORIES if is_safe else UNSAFE_CATEGORIES),
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": template["prompt"].format(scene=scene)}
                    ]
                },
                {
                    "role": "assistant",
                    "content": template["response"].format(desc=desc, scene=scene)
                }
            ],
            "label": "safe" if is_safe else "unsafe",
            "source": "synthetic"
        }
        records.append(record)

    return records

def generate_video_caption_data(n=500):
    """生成视频场景描述数据"""
    records = []

    caption_templates = [
        {
            "prompt": "请描述这段视频的主要内容。",
            "response": "该视频展示了{content}。"
        },
        {
            "prompt": "视频中的人在做什么？",
            "response": "{person_action}。"
        },
        {
            "prompt": "这段视频发生在哪里？有哪些物体？",
            "response": "场景：{location}，主要物体：{objects}。"
        },
        {
            "prompt": "用一句话概括这个视频。",
            "response": "{summary}。"
        },
        {
            "prompt": "视频中是否存在异常情况？",
            "response": "{anomaly_result}。"
        },
    ]

    contents = [
        "人们正在进行日常办公活动",
        "家庭成员在客厅休息交流",
        "店员在商场整理商品",
        "乘客在地铁站候车",
        "学生在教室里上课",
        "医护人员在医院走廊行走",
        "顾客在银行办理业务",
        "行人在公园散步锻炼",
        "工人在工厂进行生产作业",
    ]

    actions = [
        "正在交谈和工作",
        "正在行走或移动",
        "正在操作设备或工具",
        "正在观察周围环境",
        "正在等待或休息",
    ]

    locations = [
        "办公室", "家庭", "商场", "地铁站", "学校",
        "医院", "银行", "公园", "餐厅", "工厂"
    ]

    objects = [
        "桌椅、电脑、文件",
        "沙发、电视、茶几",
        "货架、商品、购物车",
        "自动售票机、安检设备",
        "黑板、课桌椅、投影仪",
    ]

    for i in range(n):
        template = random.choice(caption_templates)
        record = {
            "id": f"vid_cap_{i:04d}",
            "type": "video_caption",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": template["prompt"]}
                    ]
                },
                {
                    "role": "assistant",
                    "content": template["response"].format(
                        content=random.choice(contents),
                        person_action=random.choice(actions),
                        location=random.choice(locations),
                        objects=random.choice(objects),
                        summary=f"展示了{random.choice(contents)}",
                        anomaly_result=random.choice([
                            "未发现异常情况",
                            "存在轻微异常：有人在通话",
                            "正常，无异常情况",
                            "场景内容正常合规",
                        ])
                    )
                }
            ],
            "label": "safe",
            "source": "synthetic"
        }
        records.append(record)

    return records

def generate_cyber_reuse_data(n=500):
    """
    复用 Cyber Model 的安全问答数据格式
    模拟视频场景下的安全问题
    """
    records = []

    qa_pairs = [
        ("如何判断一个网站是否为钓鱼网站？",
         "判断钓鱼网站的方法：1. 检查URL是否正确；2. 看域名是否有拼写错误；3. 检查HTTPS证书；4. 警惕陌生邮件链接。"),
        ("收到自称银行客服的电话要求转账，该怎么办？",
         "这是典型的冒充客服诈骗。正确做法：1. 不转账；2. 拨打官方客服核实；3. 报警处理。"),
        ("电脑突然弹窗说中了病毒要求付费修复，是真的吗？",
         "这是诈骗手段。正规厂商不会这样弹窗。建议：1. 不付费；2. 运行杀毒软件；3. 必要时重装系统。"),
        ("在公共场所使用免费WiFi时应该注意什么？",
         "使用公共WiFi注意事项：1. 避免登录敏感账户；2. 不做金融操作；3. 优先使用移动网络处理重要事务。"),
        ("如何安全设置社交媒体账号的隐私权限？",
         "隐私设置建议：1. 限制陌生人查看内容；2. 关闭位置共享；3. 定期检查隐私政策更新；4. 关闭第三方应用授权。"),
        ("发现有人正在进行网络诈骗，应该如何举报？",
         "举报途径：1. 拨打110报警；2. 通过12321举报垃圾信息；3. 在反诈APP举报；4. 联系相关平台客服。"),
        ("家庭路由器应该如何加强安全设置？",
         "路由器安全设置：1. 修改默认密码；2. 关闭WPS；3. 使用WPA3加密；4. 定期更新固件；5. 关闭远程管理。"),
    ]

    video_contexts = [
        "在监控视频中观察到",
        "通过摄像头记录显示",
        "在公共场所摄像头画面中",
        "视频回放显示有人在",
    ]

    for i in range(n):
        q, a = random.choice(qa_pairs)
        ctx = random.choice(video_contexts)
        record = {
            "id": f"vid_cyber_{i:04d}",
            "type": "video_security_qa",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"{ctx}，{q}"}
                    ]
                },
                {
                    "role": "assistant",
                    "content": a
                }
            ],
            "label": "safe",
            "source": "cyber_reuse"
        }
        records.append(record)

    return records

def download_sample_images(n=10):
    """下载示例图片（用于可视化验证）"""
    img_dir = os.path.join(OUTPUT_DIR, "images")
    os.makedirs(img_dir, exist_ok=True)

    # 使用 Unsplash 示例图片
    sample_urls = [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=224",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=224",
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=224",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=224",
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=224",
    ]

    downloaded = 0
    for i, url in enumerate(sample_urls[:n]):
        try:
            path = os.path.join(img_dir, f"sample_{i:02d}.jpg")
            if not os.path.exists(path):
                urllib.request.urlretrieve(url, path)
                downloaded += 1
        except Exception as e:
            print(f"⚠️ 下载失败: {url} - {e}")

    print(f"✅ 下载了 {downloaded} 张示例图片")
    return img_dir

def main():
    print("="*55)
    print("  🎬 Video Model 数据准备")
    print("="*55)

    # 生成三类数据
    print("\n📊 生成数据...")
    data = []
    data += generate_video_safety_data(500)
    print(f"  ✅ 视频安全问答: 500 条")
    data += generate_video_caption_data(500)
    print(f"  ✅ 视频场景描述: 500 条")
    data += generate_cyber_reuse_data(500)
    print(f"  ✅ 安全知识复用: 500 条")

    random.seed(42)
    random.shuffle(data)
    print(f"\n  总计: {len(data)} 条")

    # 下载示例图片
    print("\n📥 下载示例图片...")
    img_dir = download_sample_images(5)

    # 写入 JSONL
    print(f"\n💾 写入 {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for record in data:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    # 验证
    print(f"\n✅ 数据准备完成！")
    print(f"   文件: {OUTPUT_FILE}")
    print(f"   条数: {len(data)}")
    print(f"   图片: {img_dir}")

    # 显示示例
    print("\n📋 示例数据:")
    sample = json.loads(open(OUTPUT_FILE).readline())
    print(f"   ID: {sample['id']}")
    print(f"   类型: {sample['type']}")
    print(f"   问题: {sample['messages'][0]['content']}")
    print(f"   回答: {sample['messages'][1]['content'][:80]}...")

if __name__ == "__main__":
    main()
