#!/usr/bin/env python3
"""
Flow Model 训练数据生成器
生成自动化流程、任务编排、流程调度数据
"""
import json
import random
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent.parent / "data" / "flow_train.jsonl"

# ─────────────────────────────────────────────────────────
# 流程理解数据
# ─────────────────────────────────────────────────────────

PROCESS_UNDERSTANDING = [
    ("如何分析业务流程图？",
     "业务流程图分析方法：1. 识别节点：开始/结束、处理节点、判断节点、并行节点；2. 理解连接：顺序流、条件流、并行分支；3. 分析角色：参与者、职责、权限；4. 识别数据：输入、输出、中间数据；5. 发现瓶颈：等待时间长、资源冲突、重复操作；6. 优化建议：简化流程、并行处理、自动化。输出：流程描述、节点清单、数据流图、优化方案。"),
    
    ("如何将业务需求转化为自动化流程？",
     "业务需求转自动化流程：1. 需求分析：识别重复性任务、明确输入输出、确定触发条件；2. 流程设计：分解步骤、定义顺序、设置条件分支；3. 工具选择：评估自动化平台、考虑集成能力；4. 实现方案：编写脚本/配置工作流、处理异常、添加日志；5. 测试验证：单元测试、集成测试、用户验收；6. 部署监控：上线运行、监控指标、持续优化。"),
    
    ("分析这个审批流程的优化空间。",
     "审批流程优化分析：当前流程：[具体步骤]。问题识别：1. 冗余环节：可合并的审批节点；2. 等待时间：串行改并行；3. 人工瓶颈：可自动化的判断；4. 信息缺失：补充必要字段。优化方案：1. 并行审批：独立节点同时处理；2. 自动预审：规则引擎自动判断；3. 移动审批：随时随地处理；4. 智能提醒：超时预警、催办。预期效果：周期缩短X%、效率提升Y%。"),
    
    ("如何设计订单处理自动化流程？",
     "订单处理自动化设计：流程节点：1. 订单接收：API/Webhook触发；2. 数据验证：格式检查、库存校验；3. 支付处理：调用支付接口；4. 库存扣减：事务处理；5. 订单确认：发送通知；6. 物流对接：创建运单；7. 状态更新：全程追踪。异常处理：支付失败、库存不足、超时处理。监控指标：处理时长、成功率、异常率。"),
]

# ─────────────────────────────────────────────────────────
# 自动化脚本数据
# ─────────────────────────────────────────────────────────

AUTOMATION_SCRIPTS = [
    ("编写一个Python脚本，自动备份指定目录到云存储。",
     '''```python
import os
import boto3
from datetime import datetime
import shutil

def backup_to_cloud(source_dir, bucket_name, s3_prefix="backup"):
    """自动备份目录到S3"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{s3_prefix}/{timestamp}.zip"
    
    # 压缩目录
    zip_path = f"/tmp/{timestamp}.zip"
    shutil.make_archive(f"/tmp/{timestamp}", 'zip', source_dir)
    
    # 上传到S3
    s3 = boto3.client('s3')
    s3.upload_file(zip_path, bucket_name, backup_name)
    
    # 清理临时文件
    os.remove(zip_path)
    
    print(f"✅ 备份完成: s3://{bucket_name}/{backup_name}")
    return backup_name

# 使用示例
backup_to_cloud("/data/important", "my-backup-bucket")
```'''),

    ("编写Shell脚本，监控服务状态并自动重启。",
     '''```bash
#!/bin/bash
# 服务监控与自动重启脚本

SERVICE_NAME="myapp"
MAX_RESTART=3
LOG_FILE="/var/log/service_monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> $LOG_FILE
}

restart_count=0

while true; do
    if ! systemctl is-active --quiet $SERVICE_NAME; then
        log "⚠️ 服务 $SERVICE_NAME 已停止"
        
        if [ $restart_count -lt $MAX_RESTART ]; then
            log "尝试重启服务..."
            systemctl restart $SERVICE_NAME
            sleep 5
            
            if systemctl is-active --quiet $SERVICE_NAME; then
                log "✅ 重启成功"
                ((restart_count++))
            else
                log "❌ 重启失败"
            fi
        else
            log "❌ 达到最大重启次数，发送告警"
            # 发送告警逻辑
            break
        fi
    else
        restart_count=0  # 重置计数
    fi
    
    sleep 60
done
```'''),

    ("编写Python脚本，自动处理Excel报表数据。",
     '''```python
import pandas as pd
from openpyxl import load_workbook

def process_excel_report(input_file, output_file):
    """自动处理Excel报表"""
    # 读取数据
    df = pd.read_excel(input_file)
    
    # 数据清洗
    df = df.dropna(subset=['订单号'])  # 删除空行
    df['日期'] = pd.to_datetime(df['日期'])  # 格式转换
    df['金额'] = df['金额'].astype(float)  # 类型转换
    
    # 数据计算
    df['税额'] = df['金额'] * 0.13
    df['总额'] = df['金额'] + df['税额']
    
    # 数据汇总
    summary = df.groupby('类别').agg({
        '金额': 'sum',
        '订单号': 'count'
    }).rename(columns={'订单号': '订单数'})
    
    # 写入结果
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='明细', index=False)
        summary.to_excel(writer, sheet_name='汇总')
    
    print(f"✅ 处理完成: {output_file}")

# 使用
process_excel_report("input.xlsx", "output.xlsx")
```'''),

    ("编写自动化测试脚本框架。",
     '''```python
import unittest
import requests
import json
from datetime import datetime

class APITestFramework(unittest.TestCase):
    """API自动化测试框架"""
    
    BASE_URL = "https://api.example.com"
    
    @classmethod
    def setUpClass(cls):
        cls.session = requests.Session()
        cls.results = []
    
    def test_api_call(self, endpoint, method="GET", data=None, expected_status=200):
        """通用API测试方法"""
        url = f"{self.BASE_URL}{endpoint}"
        
        if method == "GET":
            resp = self.session.get(url)
        elif method == "POST":
            resp = self.session.post(url, json=data)
        
        result = {
            "endpoint": endpoint,
            "method": method,
            "status": resp.status_code,
            "expected": expected_status,
            "pass": resp.status_code == expected_status,
            "time": datetime.now().isoformat()
        }
        self.results.append(result)
        
        self.assertEqual(resp.status_code, expected_status)
        return resp.json() if resp.text else None
    
    @classmethod
    def tearDownClass(cls):
        # 生成测试报告
        with open("test_report.json", "w") as f:
            json.dump(cls.results, f, indent=2)

if __name__ == "__main__":
    unittest.main()
```'''),
]

# ─────────────────────────────────────────────────────────
# 流程编排数据
# ─────────────────────────────────────────────────────────

WORKFLOW_ORCHESTRATION = [
    ("如何使用Airflow编排数据处理流程？",
     "Airflow数据处理编排：DAG设计：1. 定义任务依赖关系；2. 设置任务属性（重试、超时）；3. 配置触发规则。常用Operator：PythonOperator（Python任务）、BashOperator（Shell命令）、SqlOperator（SQL查询）、HttpOperator（API调用）。示例DAG：数据采集→数据清洗→数据转换→数据验证→数据加载。监控：任务状态、运行时长、失败告警。最佳实践：幂等性、渐进式重试、资源管理。"),
    
    ("设计一个订单处理工作流。",
     "订单处理工作流设计：触发：订单创建事件。节点：1. validate_order：验证订单数据；2. check_inventory：检查库存；3. process_payment：处理支付；4. reserve_stock：预留库存；5. create_shipment：创建物流单；6. send_confirmation：发送确认；7. update_status：更新状态。条件分支：支付成功→继续；支付失败→取消订单。并行节点：发送确认和创建物流可并行。异常处理：库存不足→通知补货；支付超时→取消订单。"),
    
    ("如何实现跨系统流程编排？",
     "跨系统流程编排方案：1. API集成：REST/GraphQL接口调用；2. 消息队列：Kafka/RabbitMQ异步通信；3. Webhook：事件触发回调；4. 数据库同步：CDC变更捕获。编排模式：1. 编排器模式：中央控制器协调；2. 编舞模式：各服务自主协作；3. 事件溯源：事件驱动状态变更。工具选择：n8n（低代码）、Camunda（BPMN）、Temporal（代码优先）。关键：接口契约、错误处理、事务补偿。"),
    
    ("如何处理工作流中的长时间运行任务？",
     "长时间任务处理方案：1. 异步执行：任务提交后立即返回，后台执行；2. 状态轮询：客户端定期查询任务状态；3. 回调通知：任务完成主动通知；4. 进度报告：实时报告执行进度；5. 超时处理：设置最大执行时间；6. 检查点：定期保存进度，支持恢复；7. 资源隔离：独立进程/容器执行。实现：Celery（Python）、Temporal、AWS Step Functions。"),
]

# ─────────────────────────────────────────────────────────
# 任务调度数据
# ─────────────────────────────────────────────────────────

TASK_SCHEDULING = [
    ("如何设计定时任务调度系统？",
     "定时任务调度系统设计：调度方式：1. Cron表达式：精确时间触发；2. 固定间隔：周期性执行；3. 延迟执行：指定时间后执行；4. 依赖触发：前置任务完成后执行。调度器功能：任务注册、时间解析、执行触发、状态追踪、失败重试、并发控制、日志记录。技术选型：Celery Beat、APScheduler、Quartz、Kubernetes CronJob。高可用：调度器集群、分布式锁、任务持久化。"),
    
    ("编写一个Cron表达式，每天早上9点执行数据同步。",
     "Cron表达式：`0 9 * * *`\n\n解析：\n- 0：分钟（第0分钟）\n- 9：小时（第9点，即9点）\n- *：每天\n- *：每月\n- *：每周任意天\n\n其他常用表达式：\n- `*/5 * * * *`：每5分钟\n- `0 */2 * * *`：每2小时\n- `0 9 * * 1-5`：工作日早上9点\n- `0 0 1 * *`：每月1号凌晨\n\nKubernetes CronJob示例：\n```yaml\napiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: data-sync\nspec:\n  schedule: \"0 9 * * *\"\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          containers:\n          - name: sync\n            image: data-sync:latest\n```"),
    
    ("如何处理任务调度中的失败重试？",
     "任务失败重试策略：1. 固定间隔重试：每次等待相同时间；2. 指数退避：等待时间逐渐增加（1s, 2s, 4s, 8s...）；3. 抖动：随机化等待时间避免雪崩；4. 最大重试次数：超过后放弃；5. 死信队列：失败任务转入特殊队列。配置示例：Celery `@task(bind=True, max_retries=3, default_retry_delay=60)`。监控：重试次数、失败原因、最终状态。告警：连续失败、重试耗尽。"),
]

# ─────────────────────────────────────────────────────────
# 异常处理数据
# ─────────────────────────────────────────────────────────

EXCEPTION_HANDLING = [
    ("如何设计流程的异常处理机制？",
     "流程异常处理机制：异常类型：1. 业务异常：数据验证失败、业务规则违反；2. 系统异常：网络超时、服务不可用；3. 资源异常：内存不足、磁盘满。处理策略：1. 重试：可恢复错误自动重试；2. 补偿：已执行操作回滚；3. 降级：核心功能降级服务；4. 转发：转人工处理；5. 告警：通知运维人员。设计原则：快速失败、优雅降级、可观测性、可恢复性。"),
    
    ("如何实现分布式事务补偿？",
     "分布式事务补偿（Saga模式）：实现方式：1. 编排式：中央协调器管理事务；2. 编舞式：各服务自主处理补偿。补偿流程：正向操作→记录日志→失败时执行补偿。示例：下单→扣库存→扣余额→创建订单；补偿：取消订单→退余额→退库存。关键：幂等性、补偿操作可重入、状态持久化。工具：Seata、Narayana、Temporal。监控：事务状态、补偿执行、最终一致性。"),
    
    ("设计一个告警通知系统。",
     "告警通知系统设计：告警级别：P0（紧急）、P1（高）、P2（中）、P3（低）。通知渠道：短信、电话、邮件、IM（钉钉/企微/飞书）、Webhook。通知策略：1. 分级通知：不同级别不同渠道；2. 升级通知：超时未确认升级；3. 轮询通知：值班人员轮询；4. 聚合通知：相似告警合并。告警处理：确认、忽略、静默、转交。指标：MTTD（检测时间）、MTTA（确认时间）、MTTR（恢复时间）。"),
]

# ─────────────────────────────────────────────────────────

def generate_dataset():
    """生成完整数据集"""
    data = []
    
    all_data = (
        PROCESS_UNDERSTANDING +
        AUTOMATION_SCRIPTS +
        WORKFLOW_ORCHESTRATION +
        TASK_SCHEDULING +
        EXCEPTION_HANDLING
    )
    
    for question, answer in all_data:
        item = {
            "messages": [
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer}
            ]
        }
        data.append(item)
    
    # 数据增强
    augmented = list(data)
    
    context_prefixes = [
        "在企业环境中，",
        "作为自动化工程师，",
        "请帮我设计",
    ]
    
    for item in data:
        q = item["messages"][0]["content"]
        a = item["messages"][1]["content"]
        
        for prefix in context_prefixes[:1]:
            aug_q = f"{prefix}{q}"
            augmented.append({
                "messages": [
                    {"role": "user", "content": aug_q},
                    {"role": "assistant", "content": a}
                ]
            })
    
    return augmented

def main():
    print("=" * 60)
    print("Flow Model 训练数据生成")
    print("=" * 60)
    
    data = generate_dataset()
    
    random.seed(42)
    random.shuffle(data)
    
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    
    print(f"✅ 生成 {len(data)} 条数据")
    print(f"📁 保存至: {OUTPUT_PATH}")
    
    categories = {
        "流程理解": len(PROCESS_UNDERSTANDING) * 2,
        "自动化脚本": len(AUTOMATION_SCRIPTS) * 2,
        "流程编排": len(WORKFLOW_ORCHESTRATION) * 2,
        "任务调度": len(TASK_SCHEDULING) * 2,
        "异常处理": len(EXCEPTION_HANDLING) * 2,
    }
    print("\n数据分布:")
    for cat, count in categories.items():
        print(f"  {cat}: {count} 条")

if __name__ == "__main__":
    main()
