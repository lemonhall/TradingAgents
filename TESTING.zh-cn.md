# TradingAgents A 股首次测试指引

这份指引用一只公开、常见的沪市股票完成最小冒烟测试。目标是验证数据源、Grok 中转、模型调用和报告落盘能够连通，不是判断股票是否值得买卖。

## 测试样例

| 项目 | 测试值 |
|---|---|
| 股票 | 贵州茅台 |
| Yahoo Finance 代码 | `600519.SS` |
| 分析日期 | `2026-07-10` |
| 分析师 | 只选 `Market Analyst` |
| 研究深度 | `Shallow` |
| 输出语言 | 中文，由 `.env` 固定 |
| 模型 | `grok-4.5`，由 `.env` 固定 |

`.SS` 表示上海证券交易所，`.SZ` 表示深圳证券交易所。A 股代码不能只输入六位数字，否则 Yahoo Finance 可能无法判断交易所。

## 为什么选择这套输入

- `600519.SS` 是容易核对公司身份的 A 股代码。
- `2026-07-10` 是已经结束的历史交易日，不会受到当天尚未收盘的影响。
- 只选择市场分析师，可以减少数据源数量和 LLM 调用成本。
- `Shallow` 只进行一轮辩论与风险讨论，适合作为首次连通性测试。

即使是最浅测试，框架仍会调用交易、研究、风险和组合管理等固定代理，因此会产生多次 Grok API 请求。看到运行时间较长并不一定表示卡死。

## 启动前检查

在 PowerShell 中执行：

```powershell
Set-Location E:\development\TradingAgents
.\Start-TradingAgents.ps1 --help
```

如果能够看到 `Usage: tradingagents [OPTIONS]`，说明入口和虚拟环境正常。然后启动正式测试：

```powershell
.\Start-TradingAgents.ps1
```

## 逐步输入

### Step 1：股票代码

输入：

```text
600519.SS
```

按 Enter。

### Step 2：分析日期

输入：

```text
2026-07-10
```

按 Enter。以后自行测试时，应选择已经收盘且确实开市的日期；不要优先使用今天。

### Step 3：输出语言

当前 `.env` 已设置 `TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese`，程序会显示从环境读取中文并跳过选择。如果仍出现语言菜单，选择 `Chinese (中文)`。

### Step 4：分析师团队

列表中只选择 `Market Analyst`：

1. 用方向键移动到 `Market Analyst`。
2. 按 Space 选中。
3. 确认其他三项未选中。
4. 按 Enter 继续。

不要按 `a`，它会选择全部分析师并增加 API 调用和运行时间。

### Step 5：研究深度

选择：

```text
Shallow - Quick research, few debate and strategy discussion rounds
```

按 Enter。

### Step 6 和 Step 7

Provider、Base URL、快速模型和深度模型均已写入 `.env`，正常情况下会自动显示：

```text
openai_compatible
https://api-slb.krill-ai.com/codex/v1
grok-4.5
```

程序会跳过手工选择，不需要再次输入 Key。

## 运行中观察什么

正常运行应依次出现市场分析、研究辩论、交易、风险管理和组合管理等状态。重点检查：

- 股票代码保持为 `600519.SS`，公司身份没有识别成其他企业。
- 没有出现 `401`、`403`、`404`、`model not found` 或持续的 `429`。
- 市场报告引用的是目标日期附近的价格与技术指标。
- 最终报告使用中文输出。
- 程序最终给出完成状态，而不是停在某个代理上无限重试。

## 通过标准

测试满足以下条件即可视为首次冒烟测试通过：

1. Grok 中转没有认证或模型错误。
2. 行情数据能够读取，且目标公司身份正确。
3. 至少生成市场分析和最终决策内容。
4. 下列目录存在且包含非空报告或日志文件：

```text
E:\development\TradingAgents\.tradingagents\logs\600519.SS\2026-07-10\
```

检查输出文件：

```powershell
Get-ChildItem -Recurse E:\development\TradingAgents\.tradingagents\logs\600519.SS\2026-07-10
```

最终出现 `BUY`、`SELL` 或 `HOLD` 都不能单独作为测试成败标准。冒烟测试检查的是系统链路，不是预测是否正确。

## 失败时怎么处理

### `401` 或 `AuthenticationError`

Krill Key 没有被读取、已经失效，或者不属于当前中转地址。检查 `.env` 中的 `OPENAI_COMPATIBLE_API_KEY`，但不要把 Key 发到公开聊天或提交进 Git。

### `404` 或 `model_not_found`

检查：

```dotenv
TRADINGAGENTS_LLM_BACKEND_URL=https://api-slb.krill-ai.com/codex/v1
TRADINGAGENTS_DEEP_THINK_LLM=grok-4.5
TRADINGAGENTS_QUICK_THINK_LLM=grok-4.5
```

### `429` 或频率限制

先等待一段时间再重跑。也可以在 `.env` 中加入：

```dotenv
TRADINGAGENTS_LLM_MAX_RETRIES=6
```

提高重试次数只能应对短暂限流，不能解决账户额度不足。

### 没有行情数据

确认代码包含 `.SS` 或 `.SZ`，并确认日期是交易日。可将日期换成附近另一个已经结束的工作日。

### 中途想停止

按 Ctrl+C。停止不会进行真实证券交易，但已经发出的模型请求仍可能产生费用。首次测试默认不开启 checkpoint；重新运行会从头开始。

## 下一步测试

首次测试通过后，可以保持 `Shallow`，换一只深市股票验证 `.SZ` 后缀，例如：

```text
000001.SZ
```

先不要同时增加分析师数量和研究深度。一次只改变一个变量，出现问题时更容易判断是股票代码、数据源还是模型调用导致的。
