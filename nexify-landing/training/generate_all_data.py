#!/usr/bin/env python3
"""
Nexify 四大模型训练数据批量生成器
使用模板+变体策略批量生成高质量训练数据
"""
import json
import random
from pathlib import Path
from itertools import product

random.seed(42)

# ─────────────────────────────────────────────────────────
# 通用模板
# ─────────────────────────────────────────────────────────

def expand(template, variants):
    """模板变体展开"""
    results = []
    for v in variants:
        q, a = template(v)
        results.append((q, a))
    return results

def template_variations(base_q, base_a, prefixes, suffixes):
    """为问题添加前后缀变体"""
    results = []
    for p in prefixes:
        for s in suffixes:
            q = f"{p}{base_q}{s}".strip()
            results.append((q, base_a))
    return results

# ═════════════════════════════════════════════════════════
# Cyber Model 扩充数据
# ═════════════════════════════════════════════════════════

def generate_cyber_data():
    data = []
    
    # ── 1. 威胁情报扩充 ──
    
    # 钓鱼攻击
    phishing_scenarios = [
        ("收到邮件说我的账户有异常，要求立即验证", "这可能是钓鱼邮件。识别方法：1. 检查发件人地址是否与官方一致；2. 正规机构不会通过邮件要求验证敏感信息；3. 不要点击邮件中的链接，直接访问官网。处理：标记为垃圾邮件，删除邮件。"),
        ("邮件声称我中了彩票，需要提供银行信息领奖", "这是典型的中奖诈骗。正规彩票不会通过邮件通知，更不会要求银行信息。处理：不要回复，不要提供任何信息，直接删除并标记。"),
        ("收到伪装成同事的邮件要求转账", "这是BEC商务邮件诈骗。确认步骤：1. 通过电话/视频直接联系同事确认；2. 检查邮件地址是否完全一致（注意细微差异）；3. 大额转账需多重审批。"),
        ("邮件说账户密码已泄露，要求立即修改", "可能是真实的密码泄露警告。验证方法：1. 检查邮件是否来自你注册的服务商；2. 通过官方APP或网站检查账户状态；3. 使用HaveIBeenPwned查询是否泄露；4. 无论如何，到官方渠道修改密码。"),
    ]
    
    for scenario, answer in phishing_scenarios:
        variants = template_variations(
            scenario, answer,
            ["", "作为企业员工，", "在工作中，", "最近我"],
            ["", "，应该怎么处理？", "，如何应对？", "，请给建议"]
        )
        for q, a in variants:
            data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # 钓鱼网站识别
    phishing_sites = [
        ("请告诉我如何识别钓鱼网站？", 
         "钓鱼网站识别要点：1. URL检查：注意域名拼写、额外字符（如apple.com vs apple-login.com）；2. HTTPS：检查证书是否有效；3. 内容质量：错别字、排版混乱是信号；4. 紧急程度：制造紧迫感的往往是诈骗；5. 请求内容：正规网站不会邮件要求输入密码；6. 使用浏览器安全插件辅助识别。"),
    ]
    
    for q, a in phishing_sites:
        variants = template_variations(q, a, 
            ["", "企业安全角度，", "从网络安全角度，", "作为安全专家，"],
            ["", "？", "请详细说明", "有哪些方法"])
        for vq, va in variants:
            data.append({"messages": [{"role": "user", "content": vq}, {"role": "assistant", "content": va}]})
    
    # 社会工程学
    social_engineering = [
        ("什么是社会工程学攻击？", 
         "社会工程学是利用人性弱点获取信息的攻击技术。常见类型：1. 钓鱼（邮件/短信/电话）；2. 伪装身份获取信任；3. 尾随进入受限区域；4. 垃圾箱搜寻。防范：安全意识培训、身份验证流程、敏感信息保护、报告可疑行为。"),
        ("如何防范电话诈骗？",
         "电话诈骗防范：1. 核实身份：主动挂断后通过官方渠道回拨；2. 不透露信息：正规机构不会电话询问密码；3. 警惕恐吓：冒充公检法、制造恐慌是常用手段；4. 不转账：不向陌生账户汇款；5. 安装拦截：使用防诈骗APP；6. 及时报警：发现被骗立即报警。"),
    ]
    
    for q, a in social_engineering:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
        # 变体
        for prefix in ["作为安全顾问，", "企业如何防范", "员工应该"]:
            data.append({"messages": [{"role": "user", "content": f"{prefix}{q}"}, {"role": "assistant", "content": a}]})
    
    # 恶意软件
    malware = [
        ("电脑运行变慢，不断弹出广告，是什么问题？",
         "这很可能是恶意软件感染。处理步骤：1. 断开网络防止进一步损害；2. 启动安全模式；3. 运行杀毒软件全盘扫描；4. 清除检测到的威胁；5. 修改所有密码（从其他设备）；6. 更新系统和软件；7. 考虑备份重要数据后重装系统。"),
        ("收到陌生人发来的压缩包文件，可以打开吗？",
         "不要直接打开压缩包附件。风险：压缩包可能包含恶意脚本、病毒或勒索软件。处理：1. 先用杀毒软件扫描；2. 不要启用宏；3. 从可信来源确认发送者意图；4. 警惕.exe、.js、.vbs、.scr等危险文件类型。"),
    ]
    
    for q, a in malware:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 2. 漏洞分析扩充 ──
    
    # OWASP Top 10
    owasp_top10 = [
        ("什么是OWASP Top 10？",
         "OWASP Top 10是最关键的Web应用安全风险：1. A01 访问控制失效；2. A02 加密失败；3. A03 注入；4. A04 不安全设计；5. A05 安全配置错误；6. A06 易混淆依赖；7. A07 身份认证失效；8. A08 软件和数据完整性失败；9. A09 安全日志失败；10. A10 服务器端请求伪造(SSRF)。"),
        
        ("什么是SQL注入？如何防止？",
         "SQL注入是攻击者在用户输入中注入恶意SQL代码。防护措施：1. 参数化查询/预编译；2. 输入验证（白名单）；3. 最小权限原则；4. 输出编码；5. 使用ORM框架；6. 定期安全测试。示例：Python用`cursor.execute('SELECT * FROM users WHERE id = ?', (uid,))`代替字符串拼接。"),
        
        ("什么是XSS跨站脚本攻击？",
         "XSS是注入恶意脚本到网页的攻击。类型：1. 反射型：URL参数注入；2. 存储型：存入数据库；3. DOM型：客户端脚本注入。防护：1. 输入验证；2. 输出编码（HTML/JS/URL）；3. 内容安全策略(CSP)；4. HttpOnly Cookie。"),
        
        ("CSRF攻击是什么？如何防护？",
         "CSRF是跨站请求伪造，利用用户已登录状态发起恶意请求。防护：1. CSRF Token；2. SameSite Cookie；3. 双重验证；4. 验证Referer/Origin头；5. 关键操作二次确认。"),
        
        ("什么是SSRF漏洞？",
         "SSRF是服务器端请求伪造，攻击者利用服务器访问内部资源。风险：访问内网数据库、读取本地文件、扫描内网端口。防护：1. URL白名单验证；2. 禁用不必要的协议（file://, gopher://）；3. 限制内网IP访问；4. 错误信息不泄露内部细节。"),
        
        ("如何防止敏感数据泄露？",
         "数据泄露防护：1. 加密存储：敏感数据加密存储；2. 加密传输：全程HTTPS；3. 访问控制：最小权限；4. 脱敏处理：日志和调试中脱敏；5. 安全删除：数据不再需要时安全擦除；6. 监控审计：数据访问日志。"),
        
        ("什么是中间人攻击？",
         "中间人攻击是攻击者插入到通信双方之间截获信息。防护：1. HTTPS强制；2. 证书固定(HPKP)；3. 公共WiFi下避免敏感操作；4. VPN加密通道；5. 证书透明度日志监控。"),
    ]
    
    for q, a in owasp_top10:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
        for prefix in ["作为开发人员，", "Web应用如何防止", "请解释"]:
            data.append({"messages": [{"role": "user", "content": f"{prefix}{q}"}, {"role": "assistant", "content": a}]})
    
    # 漏洞修复
    vuln_fixes = [
        ("服务器SSH端口开放如何加固？",
         "SSH加固措施：1. 禁用密码登录，使用密钥认证；2. 修改默认端口22；3. 限制登录用户和IP（AllowUsers, AllowHosts）；4. 禁用root登录；5. 使用fail2ban防止暴力破解；6. 启用双因素认证；7. 设置LoginGraceTime；8. 定期审计登录日志。"),
        ("如何防止SQL注入攻击？",
         "防止SQL注入：1. 使用参数化查询（推荐）；2. 使用ORM框架；3. 严格输入验证；4. 最小数据库权限；5. 错误信息不暴露SQL细节；6. 使用存储过程；7. 定期代码审计；8. 部署WAF。"),
    ]
    
    for q, a in vuln_fixes:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 3. 合规审查扩充 ──
    
    compliance = [
        ("企业需要满足哪些网络安全合规要求？",
         "主要合规框架：1. 等保2.0（中国）：1-5级，等级保护；2. ISO27001：信息安全管理体系国际标准；3. SOC2：服务组织控制报告；4. GDPR：通用数据保护条例（欧盟）；5. 网络安全法/数据安全法/个人信息保护法（中国）；6. PCI-DSS：支付卡行业数据安全标准。企业应根据业务和地区选择适用标准。"),
        
        ("什么是等保2.0？三级等保要求是什么？",
         "等保2.0是网络安全等级保护制度2.0版。三级等保要求：技术要求：1. 身份鉴别（三因素认证）；2. 访问控制（细粒度）；3. 安全审计（6个月留存）；4. 入侵防范；5. 恶意代码防护；6. 数据完整性/保密性；7. 数据备份恢复。管理要求：安全管理制度、人员安全、系统建设运维管理。"),
        
        ("ISO27001认证需要什么？",
         "ISO27001认证准备：1. 建立ISMS体系；2. 风险评估和处理；3. 制定适用性声明(SoA)；4. 实施控制措施；5. 内部审核（至少运行3个月）；6. 管理评审；7. 外部认证审核（两阶段）。关键文档：信息安全策略、风险评估报告、控制措施程序、记录表单。"),
        
        ("数据合规包括哪些方面？",
         "数据合规要点：1. 数据分类分级；2. 合法收集（同意/必要）；3. 目的限制；4. 数据最小化；5. 存储期限限制；6. 安全保护；7. 数据主体权利响应；8. 数据跨境（如适用）；9. 数据泄露通知。违规处罚：GDPR最高全球营收4%或2000万欧元。"),
    ]
    
    for q, a in compliance:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
        for prefix in ["企业应如何满足", "请说明"]:
            data.append({"messages": [{"role": "user", "content": f"{prefix}{q}"}, {"role": "assistant", "content": a}]})
    
    # ── 4. 安全运维扩充 ──
    
    sec_ops = [
        ("如何建立安全运营中心SOC？",
         "SOC建设步骤：1. 明确范围和目标；2. 选择SIEM平台（Splunk/ELK/阿里云等）；3. 接入日志源；4. 制定检测规则；5. 建立告警流程；6. 编写响应手册(SOP)；7. 组建团队（分析师、工程师）；8. 值班制度；9. 持续优化；10. 指标度量（MTTD/MTTR）。"),
        
        ("如何进行应急响应？",
         "应急响应六阶段：1. 准备：预案、工具、团队、演练；2. 识别：发现、确认、分类；3. 抑制：隔离、阻断；4. 根除：清除威胁；5. 恢复：验证安全、恢复业务；6. 总结：复盘改进。关键：保留证据、沟通机制、文档记录。"),
        
        ("如何分析安全日志？",
         "日志分析要点：1. 登录事件：失败次数、异常时间/地点；2. 权限操作：sudo、su、权限变更；3. 网络连接：可疑外联、端口扫描；4. 进程活动：异常程序；5. 文件访问：敏感文件读写。工具：grep/awk、SIEM平台。关注：异常模式、告警规则触发。"),
        
        ("如何防止勒索软件？",
         "勒索软件防护：1. 定期离线备份（3-2-1原则）；2. 及时更新系统补丁；3. 端点防护软件；4. 邮件过滤；5. 禁用宏执行；6. 最小权限原则；7. 网络分段；8. 安全意识培训。感染后：隔离、断网、不付赎金、从备份恢复。"),
    ]
    
    for q, a in sec_ops:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # 随机打乱
    random.shuffle(data)
    return data

# ═════════════════════════════════════════════════════════
# Video Model 扩充数据
# ═════════════════════════════════════════════════════════

def generate_video_data():
    data = []
    
    # ── 1. 场景分析 ──
    
    scenes = [
        ("请分析这段视频的场景内容。", 
         "视频场景分析：1. 场景类型识别（室内/室外、公共场所/私人空间）；2. 主要物体检测；3. 人员活动分析；4. 环境特征描述；5. 安全状态评估；6. 异常情况记录。输出格式：场景类型|主要物体|人员活动|安全评估|异常备注。"),
        ("这段监控视频有什么需要注意的？",
         "监控视频关注要点：1. 人员行为：正常活动、异常举动、可疑行为；2. 物品状态：遗留物品、异常移动；3. 环境变化：异常闯入、紧急情况；4. 时间因素：非营业时间活动；5. 安全设施状态：门禁、监控覆盖。"),
    ]
    
    for q, a in scenes:
        for prefix in ["作为安全专家，", "通过视频分析，", "请从安全角度"]:
            data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": f"{prefix}{q}"}]}, {"role": "assistant", "content": a}]})
    
    # 特定场景分析
    specific_scenes = [
        ("商场监控视频", "商场场景：区域包括入口、购物区、收银台、餐饮区。重点关注：可疑人员徘徊、遗留物品、拥挤踩踏风险、消防通道占用。"),
        ("医院走廊视频", "医院场景：医疗环境，重点区域包括急诊、药房、ICU。重点：医疗设备安全、患者隐私保护、紧急疏散通道。"),
        ("地铁站台视频", "地铁场景：关注候车安全线、站台边缘、闸机口。风险：人员拥挤、越线、异常物品。"),
        ("银行营业厅视频", "银行场景：高安全等级场所。关注：异常人员、胁迫信号、一米线遵守、ATM区域。"),
        ("学校操场视频", "学校场景：关注学生安全、活动秩序、设备安全。风险：意外伤害、欺凌、陌生人闯入。"),
        ("工厂车间视频", "工厂场景：关注个人防护装备佩戴、设备操作规范、消防通道。风险：违规操作、设备故障、安全隐患。"),
    ]
    
    for scene, answer in specific_scenes:
        q = f"分析这段{scene}的视频内容"
        data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": q}]}, {"role": "assistant", "content": answer}]})
        for suffix in ["安全吗？", "有哪些风险点？", "需要关注什么？"]:
            data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": f"{q}{suffix}"}]}, {"role": "assistant", "content": answer}]})
    
    # ── 2. 内容审核 ──
    
    audit = [
        ("如何识别视频中的违规内容？",
         "违规内容识别类型：1. 暴力血腥：打斗、武器、血腥画面；2. 色情低俗：暴露内容、性暗示；3. 违法犯罪：赌博、毒品、非法集会；4. 危险行为：高危动作、未成年人危险行为；5. 虚假信息：谣言、诈骗内容；6. 侵权内容：盗版影视、音乐使用。AI辅助识别+人工复核。"),
        ("这段视频内容合规吗？",
         "视频合规性评估：1. 内容类型判断；2. 违规元素检测；3. 风险等级划分（高/中/低）；4. 处理建议（通过/限流/删除/举报）。审核原则：最小干预、证据保留、可申诉。"),
        ("如何建立视频内容审核机制？",
         "审核机制建设：1. 制定审核标准（违规类型、处理规则）；2. 技术支撑（AI识别+人工复核）；3. 流程设计（上传→AI初筛→人工复审→结果处理）；4. 人员配置（审核员、质检、运营）；5. 申诉处理；6. 持续优化。"),
        ("如何处理敏感内容？",
         "敏感内容处理方式：1. 完全删除：严重违规；2. 部分处理：打码、消音；3. 限制分发：登录可见、地区限制；4. 添加警示：内容提醒；5. 人工复核：存疑内容。"),
    ]
    
    for q, a in audit:
        data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": q}]}, {"role": "assistant", "content": a}]})
        for prefix in ["请说明", "作为内容审核人员，"]:
            data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": f"{prefix}{q}"}]}, {"role": "assistant", "content": a}]})
    
    # ── 3. 安全分析 ──
    
    safety = [
        ("识别视频中的安全隐患。",
         "安全隐患识别要点：1. 人员防护：安全帽、安全带、防护服；2. 设备状态：防护罩、警示标识；3. 行为规范：操作流程遵守；4. 环境安全：通道畅通、物品堆放；5. 消防设施：灭火器位置、疏散通道。发现隐患需立即记录并上报。"),
        ("分析这段工厂视频的安全状况。",
         "工厂安全分析：1. 个人防护装备佩戴情况；2. 设备安全设施状态；3. 作业操作规范；4. 通道和安全出口；5. 危险品存储；6. 应急预案标识。风险等级：高/中/低。建议措施：立即整改/限期整改/持续监控。"),
        ("这段建筑工地视频有哪些风险？",
         "建筑工地风险类型：1. 高处坠落：脚手架、安全网、临边防护；2. 物体打击：高空坠物；3. 机械伤害：塔吊、升降机；4. 触电风险：临时用电；5. 坍塌风险：基坑、边坡。风险控制：防护措施、培训教育、监督检查。"),
    ]
    
    for q, a in safety:
        data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": q}]}, {"role": "assistant", "content": a}]})
    
    # ── 4. 智能剪辑 ──
    
    editing = [
        ("如何自动提取视频中的精彩片段？",
         "精彩片段识别方法：1. 运动特征：高动态片段；2. 音频分析：音乐高潮、人声突出；3. 画面质量：清晰度、稳定度；4. 内容重要性：关键情节、转折点；5. 用户行为：重播率、分享率高的片段。算法：特征提取→重要性评分→片段截取→结果输出。"),
        ("如何实现视频场景自动分割？",
         "场景分割方法：1. 镜头检测：画面突变/渐变；2. 视觉特征：颜色、纹理、场景变化；3. 语义分割：AI识别场景类型；4. 时序分析：连续帧相似度。算法：直方图比较、深度学习模型（CNN+LSTM）。应用：视频摘要、内容索引、广告插入。"),
        ("如何提取视频关键帧？",
         "关键帧提取策略：1. 均匀采样：固定间隔抽取；2. 变化检测：场景/内容变化时提取；3. 质量优先：清晰度、运动模糊度；4. 内容优先：人脸、文字、重要物体。评估：覆盖率、信息量、冗余度。输出：关键帧时间戳和缩略图。"),
    ]
    
    for q, a in editing:
        data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": q}]}, {"role": "assistant", "content": a}]})
    
    # ── 5. 交通安全 ──
    
    traffic = [
        ("分析这段道路监控的交通安全状况。",
         "交通安全分析：1. 车辆行为：车速、车距、信号遵守；2. 行人行为：过街方式、信号遵守；3. 道路状况：路面、标志标线；4. 交通流量：拥堵程度；5. 风险点：违规行为、事故隐患。评估：安全评分、风险提示。"),
        ("识别视频中的危险驾驶行为。",
         "危险驾驶识别类型：1. 超速行驶；2. 跟车过近；3. 违规变道；4. 闯红灯；5. 逆向行驶；6. 疲劳驾驶特征。检测方法：速度分析、轨迹分析、行为模式识别。处理：记录证据、报警处理。"),
    ]
    
    for q, a in traffic:
        data.append({"messages": [{"role": "user", "content": [{"type": "text", "text": q}]}, {"role": "assistant", "content": a}]})
    
    random.shuffle(data)
    return data

# ═════════════════════════════════════════════════════════
# Flow Model 扩充数据
# ═════════════════════════════════════════════════════════

def generate_flow_data():
    data = []
    
    # ── 1. 流程理解 ──
    
    process = [
        ("如何分析业务流程？",
         "业务流程分析方法：1. 识别流程边界：开始/结束节点；2. 分解步骤：每个活动节点；3. 分析流向：顺序、并行、条件分支；4. 识别角色：参与者及职责；5. 发现问题：瓶颈、冗余、错误；6. 优化建议：简化、自动化、并行化。工具：BPMN、流程图、泳道图。"),
        ("如何将业务需求转化为自动化流程？",
         "需求转自动化步骤：1. 需求梳理：识别重复性任务；2. 流程设计：步骤分解、顺序定义；3. 工具选型：RPA/工作流/脚本；4. 实现开发：编写/配置；5. 异常处理：补偿机制；6. 测试验证：场景覆盖；7. 上线监控：运行跟踪。"),
        ("分析这个审批流程的优化空间。",
         "审批流程优化方向：1. 环节精简：删除冗余审批；2. 并行处理：独立节点同时审批；3. 规则引擎：自动判断无需审批；4. 移动审批：随时随地处理；5. 超时预警：自动催办；6. 电子签章：减少纸质流转。"),
        ("如何设计订单处理自动化？",
         "订单自动化流程：1. 接收订单（API/表单）；2. 验证数据（格式、库存、支付）；3. 处理支付（调用支付接口）；4. 扣减库存（事务保证）；5. 创建物流（对接快递）；6. 发送通知（用户/商家）；7. 更新状态（全链路追踪）。异常：支付失败→取消订单；库存不足→等待补货。"),
    ]
    
    for q, a in process:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
        for prefix in ["作为自动化工程师，", "企业需要", "请帮我"]:
            data.append({"messages": [{"role": "user", "content": f"{prefix}{q}"}, {"role": "assistant", "content": a}]})
    
    # ── 2. 自动化脚本 ──
    
    scripts = [
        ("写一个Python脚本自动备份数据库。",
         '''```python
import subprocess
from datetime import datetime
import boto3

def backup_mysql_db(host, user, password, db_name, s3_bucket):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup/{db_name}_{timestamp}.sql"
    local_path = f"/tmp/{db_name}_{timestamp}.sql"
    
    # 导出数据库
    cmd = f"mysqldump -h{host} -u{user} -p{password} {db_name} > {local_path}"
    subprocess.run(cmd, shell=True)
    
    # 上传到S3
    s3 = boto3.client('s3')
    s3.upload_file(local_path, s3_bucket, filename)
    
    print(f"✅ 备份完成: {filename}")
    return filename
```'''),
        
        ("写一个Shell脚本监控服务器资源。",
         '''```bash
#!/bin/bash
# 服务器资源监控脚本

THRESHOLD_CPU=80
THRESHOLD_MEM=85
THRESHOLD_DISK=90
LOG="/var/log/resource_monitor.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> $LOG; }

CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
DISK=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

[ "$CPU" -gt "$THRESHOLD_CPU" ] && log "⚠️ CPU使用率: ${CPU}%"
[ "$MEM" -gt "$THRESHOLD_MEM" ] && log "⚠️ 内存使用率: ${MEM}%"
[ "$DISK" -gt "$THRESHOLD_DISK" ] && log "⚠️ 磁盘使用率: ${DISK}%"

log "📊 CPU: ${CPU}% | 内存: ${MEM}% | 磁盘: ${DISK}%"
```'''),
        
        ("写一个Python脚本自动处理Excel数据。",
         '''```python
import pandas as pd
from openpyxl import Workbook

def process_sales_report(input_file, output_file):
    # 读取Excel
    df = pd.read_excel(input_file)
    
    # 数据清洗
    df['日期'] = pd.to_datetime(df['日期'])
    df['金额'] = pd.to_numeric(df['金额'], errors='coerce')
    df = df.dropna(subset=['订单号', '金额'])
    
    # 计算
    df['税额'] = df['金额'] * 0.13
    df['总额'] = df['金额'] + df['税额']
    
    # 汇总
    summary = df.groupby('产品').agg({
        '金额': 'sum',
        '订单号': 'count'
    }).rename(columns={'订单号': '订单数'})
    
    # 输出
    with pd.ExcelWriter(output_file) as writer:
        df.to_excel(writer, sheet_name='明细', index=False)
        summary.to_excel(writer, sheet_name='汇总')
    
    print(f"✅ 报告生成: {output_file}")
```'''),
    ]
    
    for q, a in scripts:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 3. 流程编排 ──
    
    orchestration = [
        ("如何使用Airflow编排数据处理流程？",
         "Airflow使用指南：DAG定义：定义任务和依赖关系。常用Operator：BashOperator（Shell）、PythonOperator（Python）、SqlOperator（SQL）、HttpOperator（API）。示例流程：数据采集→清洗→转换→验证→加载。最佳实践：1. 任务幂等性；2. 合理重试；3. 超时控制；4. 监控告警；5. 日志记录。"),
        ("设计一个ETL数据处理工作流。",
         "ETL工作流设计：Extract（提取）：从源系统（数据库/API/文件）获取数据。Transform（转换）：数据清洗、格式转换、聚合计算。Load（加载）：写入目标数据仓库。工具选择：Airflow（通用）、Spark（大数据）、dbt（SQL转换）、Kafka（实时流）。关键：数据质量检查、失败重试、血缘追踪。"),
        ("如何实现跨系统的流程集成？",
         "跨系统集成方案：1. API集成：REST/GraphQL接口调用；2. 消息队列：Kafka/RabbitMQ异步解耦；3. Webhook：事件驱动回调；4. 数据同步：CDC变更捕获。架构模式：编排器模式（中央协调）、编舞模式（自主协作）。工具：n8n、Camunda、Temporal、企业服务总线。"),
        ("如何处理长时间运行的异步任务？",
         "异步任务处理：1. 任务提交后立即返回任务ID；2. 后台异步执行；3. 客户端轮询状态或Webhook回调；4. 支持进度报告；5. 检查点保存（长任务恢复）；6. 超时和取消机制。实现：Celery（Python）、Temporal、AWS Step Functions。"),
    ]
    
    for q, a in orchestration:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 4. 任务调度 ──
    
    scheduling = [
        ("如何设计定时任务调度系统？",
         "调度系统设计：调度方式：Cron（精确时间）、间隔调度、依赖触发。核心功能：任务注册、时间解析、执行触发、状态追踪、失败重试、并发控制。技术选型：Linux Cron（简单）、Celery Beat（Python生态）、Quartz（Java）、Kubernetes CronJob（容器化）。高可用：调度器集群、分布式锁、任务持久化。"),
        ("Cron表达式怎么写？",
         "Cron格式：分 时 日 月 周。示例：`0 9 * * 1-5`（工作日9点）；`*/5 * * * *`（每5分钟）；`0 */2 * * *`（每2小时）。Kubernetes CronJob示例：spec.schedule=\"0 9 * * *\"。注意事项：时区、并发限制、错误处理。"),
        ("任务失败了如何重试？",
         "任务重试策略：1. 固定间隔：每次等固定时间；2. 指数退避：1s, 2s, 4s（防雪崩）；3. 抖动：随机化避免同时重试；4. 最大次数：超过后放弃；5. 死信队列：失败任务单独处理。Celery配置：`@task(bind=True, max_retries=3, default_retry_delay=60)`。"),
    ]
    
    for q, a in scheduling:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 5. 异常处理 ──
    
    exceptions = [
        ("如何设计异常处理机制？",
         "异常处理设计：异常分类：业务异常（数据验证）、系统异常（网络超时）、资源异常（内存不足）。处理策略：重试（可恢复）、补偿（已执行操作回滚）、降级（核心功能）、转发（转人工）、告警（通知运维）。设计原则：快速失败、优雅降级、可观测性（记录详细日志）。"),
        ("如何实现分布式事务补偿？",
         "Saga模式实现：编排式：中央协调器管理各参与者的补偿操作。编舞式：各服务自主处理并触发补偿。示例：下单→扣库存→扣余额→创建订单；补偿：取消订单→退余额→退库存。关键：补偿操作幂等性、状态持久化、超时处理。工具：Seata、Temporal。"),
        ("如何设计告警通知系统？",
         "告警系统设计：级别：P0紧急（电话+短信）、P1高（短信）、P2中（邮件）、P3低（通知）。渠道：短信、电话、邮件、企业微信、钉钉、飞书。策略：分级通知、超时升级、聚合压缩（避免告警风暴）。处理：确认、忽略、静默、转交。指标：MTTD、MTTA、MTTR。"),
    ]
    
    for q, a in exceptions:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    random.shuffle(data)
    return data

# ═════════════════════════════════════════════════════════
# Analytics Model 扩充数据
# ═════════════════════════════════════════════════════════

def generate_analytics_data():
    data = []
    
    # ── 1. 统计分析 ──
    
    statistics = [
        ("如何进行描述性统计分析？",
         "描述性统计方法：集中趋势：均值（算术平均）、中位数（中间值）、众数（最频值）。离散程度：标准差（偏离均值）、方差（标准差平方）、四分位距IQR（Q3-Q1）。分布形态：偏度（对称性）、峰度（尾部厚度）。可视化：直方图、箱线图、密度图。Python：`df.describe()`、`df.mean()`、`df.std()`。"),
        ("如何分析两组数据的相关性？",
         "相关性分析：相关系数：Pearson（线性相关）、Spearman（单调相关）、Kendall（一致对）。可视化：散点图、热力图、相关矩阵。注意：相关不等于因果；异常值影响大；非线性关系需转换。Python：`df.corr()`、`scipy.stats.pearsonr()`。假设检验：p值判断显著性。"),
        ("如何做A/B测试分析？",
         "A/B测试分析：1. 实验设计：确定指标、样本量计算、AA测试验证分流均匀；2. 数据收集：监控关键指标；3. 统计检验：t检验（均值）、卡方检验（比例）；4. 效果评估：提升幅度、置信区间；5. 结论判定：p<0.05显著。常见错误：样本量不足、提前停止、多重比较问题。"),
        ("如何进行用户行为分析？",
         "用户行为分析维度：1. 用户属性：人口统计、设备、来源；2. 行为指标：DAU/MAU、时长、频次；3. 转化漏斗：各步骤转化率；4. 路径分析：用户流转路径；5. 用户分群：RFM、行为特征分群。工具：Google Analytics、Mixpanel、神策数据、GrowingIO。"),
    ]
    
    for q, a in statistics:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
        for prefix in ["作为数据分析师，", "请详细说明"]:
            data.append({"messages": [{"role": "user", "content": f"{prefix}{q}"}, {"role": "assistant", "content": a}]})
    
    # ── 2. 趋势预测 ──
    
    prediction = [
        ("如何进行时间序列预测？",
         "时间序列预测方法：经典：移动平均、指数平滑、ARIMA/SARIMA。机器学习：Prophet（处理节假日）、XGBoost（特征工程）、LSTM（序列数据）。步骤：1. 探索：趋势/季节性/平稳性；2. 预处理：缺失值、异常值；3. 建模：选择算法；4. 评估：MAE、RMSE、MAPE。注意事项：数据量需求、预测区间、模型更新。"),
        ("如何预测销售额趋势？",
         "销售预测方法：影响因素：历史趋势、季节性（节假日、促销）、外部因素（经济、竞品、天气）。模型：短期用指数平滑，中期用SARIMA，长期用回归+机器学习。特征：时间特征、滞后特征、滚动统计特征。评估指标：MAPE（平均绝对百分比误差）、RMSE。应用：库存规划、资源调配、目标制定。"),
        ("如何识别数据异常？",
         "异常检测方法：统计：3σ原则（超出均值±3σ）、IQR方法（超出Q1-1.5IQR/Q3+1.5IQR）。机器学习：Isolation Forest、One-Class SVM、LSTM-AD。业务规则：领域知识定义异常阈值。处理：确认→根因分析→处理决策。可视化：控制图标注异常点。"),
        ("如何预测用户流失？",
         "流失预测方法：特征：行为特征（登录频次、时长、功能使用）、时间特征（最近一次活跃）、交易特征（消费金额）。模型：逻辑回归（可解释）、随机森林（准确率高）、XGBoost（性能好）。评估：AUC、召回率（预测出流失用户）。应用：预警名单、挽留策略、优先级排序。"),
    ]
    
    for q, a in prediction:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 3. 洞察报告 ──
    
    insights = [
        ("如何撰写数据分析报告？",
         "数据报告结构：1. 执行摘要：核心发现、建议（1页）；2. 背景：分析目的、数据来源、时间范围；3. 方法：分析方法、工具、假设；4. 发现：数据呈现、关键洞察；5. 建议：基于发现的行动建议；6. 附录：详细数据、代码。写作原则：结论先行、数据支撑、可视化图表、可执行建议。"),
        ("如何从数据中提取洞察？",
         "洞察提取框架：1. 描述现象：发生了什么（数据事实）；2. 诊断原因：为什么发生（归因分析）；3. 评估影响：影响范围和程度（量化）；4. 行动建议：应该怎么做（可落地）。探索方向：对比（同比环比）、趋势（增长拐点）、结构（占比）、关联（相关因素）、异常（偏离预期）。"),
        ("如何设计数据看板？",
         "看板设计原则：1. 明确受众：决策者/运营/分析师；2. 指标选择：北极星指标+辅助指标；3. 布局：重要信息左上，F型浏览习惯；4. 可视化：折线图（趋势）、柱状图（对比）、饼图（占比）；5. 交互：筛选、下钻、联动；6. 刷新：实时或定时。工具：Tableau、Power BI、Superset、Grafana。"),
        ("如何做业务复盘？",
         "业务复盘框架：1. 目标回顾：原定目标vs实际达成；2. 结果评估：KPI完成情况；3. 差距分析：未达成原因（内部/外部）；4. 过程回顾：关键节点、决策点分析；5. 经验总结：成功经验、失败教训；6. 改进计划：下次行动计划。分析工具：漏斗分析、对比分析、归因分析。"),
    ]
    
    for q, a in insights:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 4. 可视化 ──
    
    visualization = [
        ("如何选择合适的图表？",
         "图表选择指南：比较：柱状图（分类对比）、条形图（多分类横向）；趋势：折线图（时间序列）、面积图（累积）；占比：饼图（少量）、环形图（美观）；关系：散点图（两变量）、气泡图（三变量）；分布：直方图（数值分布）、箱线图（统计量）；地理：地图热力图。原则：简洁、准确、易读。"),
        ("如何设计销售数据可视化？",
         "销售看板设计：顶部：KPI卡片（今日销售额、环比、达成率）。左侧：趋势图（折线图）、TOP品类。中间：区域分布（地图）、渠道对比（柱状图）。右侧：TOP产品、客户排行榜。底部：明细数据表（可下钻）。交互：时间筛选、维度切换。刷新：T+1日更新。"),
        ("如何让图表更有说服力？",
         "可视化说服力：1. 突出重点：高亮关键数据；2. 对比展示：前后对比、目标对比；3. 讲故事：标题点明结论；4. 简洁设计：去除装饰；5. 参照上下文：提供基线对比；6. 一致性：统一配色风格。常见错误：坐标轴误导、过度装饰、信息过载、缺乏标题。"),
    ]
    
    for q, a in visualization:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 5. 异常检测 ──
    
    anomaly = [
        ("如何建立业务异常监控系统？",
         "异常监控系统：检测维度：KPI偏离、流量突变、转化异常、错误率上升。检测方法：静态阈值（业务规则）、动态阈值（历史波动）、机器学习（异常检测）。告警配置：级别（紧急/高/中/低）、渠道（电话/短信/邮件）、聚合（避免风暴）、静默。响应：确认→分析→处理→复盘。"),
        ("如何分析异常根因？",
         "根因分析方法：下钻分析：时间（何时开始）、地区（哪些区域）、用户（哪类用户）、渠道（哪个来源）。关联分析：相关指标是否同步异常、外部因素（活动/节假日）、系统变更。验证：假设验证、A/B测试。输出：根因报告、修复建议、预防措施。"),
        ("如何设置监控告警阈值？",
         "阈值设置方法：静态：基于SLA要求、历史经验。动态：均值±n倍标准差、分位数（P99/P95）。多级告警：P0紧急（严重偏离）、P1高、P2中、P3低。调整：根据误报率、漏报率迭代优化。工具：Prometheus、Grafano、阿里云arms。"),
    ]
    
    for q, a in anomaly:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    # ── 6. 决策支持 ──
    
    decisions = [
        ("如何用数据驱动决策？",
         "数据驱动决策流程：1. 问题定义：明确决策问题和目标；2. 数据收集：确定数据源、获取数据；3. 分析洞察：探索分析、假设验证；4. 方案评估：多方案对比、风险评估；5. 决策建议：推荐方案和执行计划；6. 效果追踪：实施后评估。关键：数据质量、分析严谨、业务理解、沟通表达。"),
        ("如何做ROI分析？",
         "ROI分析方法：公式：ROI = (收益-成本)/成本×100%。收益量化：直接收益（收入增加、成本节约）、间接收益（效率提升、品牌价值）。成本核算：一次性成本（设备、许可）、持续成本（运维人力）。维度：回收期（多久回本）、NPV（净现值）、IRR（内部收益率）。"),
    ]
    
    for q, a in decisions:
        data.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})
    
    random.shuffle(data)
    return data

# ═════════════════════════════════════════════════════════
# 主函数
# ═════════════════════════════════════════════════════════

def main():
    import os
    os.makedirs("../data", exist_ok=True)
    
    print("=" * 60)
    print("Nexify 四大模型训练数据生成")
    print("=" * 60)
    
    # Cyber Model
    cyber_data = generate_cyber_data()
    with open("../data/cyber_train.jsonl", "w", encoding="utf-8") as f:
        for item in cyber_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"✅ Cyber Model: {len(cyber_data)} 条")
    
    # Video Model
    video_data = generate_video_data()
    with open("../data/video_train_v2.jsonl", "w", encoding="utf-8") as f:
        for item in video_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"✅ Video Model: {len(video_data)} 条")
    
    # Flow Model
    flow_data = generate_flow_data()
    with open("../data/flow_train.jsonl", "w", encoding="utf-8") as f:
        for item in flow_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"✅ Flow Model: {len(flow_data)} 条")
    
    # Analytics Model
    analytics_data = generate_analytics_data()
    with open("../data/analytics_train.jsonl", "w", encoding="utf-8") as f:
        for item in analytics_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"✅ Analytics Model: {len(analytics_data)} 条")
    
    print()
    print("数据文件:")
    for fname in ["cyber_train.jsonl", "video_train_v2.jsonl", "flow_train.jsonl", "analytics_train.jsonl"]:
        fpath = f"../data/{fname}"
        size = os.path.getsize(fpath) / 1024
        count = sum(1 for _ in open(fpath))
        print(f"  {fname}: {count} 条 ({size:.1f} KB)")

if __name__ == "__main__":
    main()
