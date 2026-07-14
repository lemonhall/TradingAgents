# TradingAgents Windows 11 中文安装说明

本文记录 `lemonhall/TradingAgents` 在 Windows 11、PowerShell 7 和 E 盘环境下的安装与使用方式。上游项目仍为 [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)。

> TradingAgents 是研究工具，不构成证券、投资或交易建议。模型输出可能错误，也可能因模型、实时数据和新闻来源变化而在不同运行之间产生差异。

## 本次安装状态

| 项目 | 当前配置 |
|---|---|
| 本地目录 | `E:\development\TradingAgents` |
| 上游版本 | `v0.3.1`，提交 `01477f9` |
| Python | 3.12，虚拟环境位于 `.venv` |
| LLM Provider | `openai_compatible` |
| API Base URL | `https://api-slb.krill-ai.com/codex/v1` |
| 深度模型 | `grok-4.5` |
| 快速模型 | `grok-4.5` |
| 报告语言 | 中文 |
| LLM 重试 | 每次调用最多重试 6 次 |
| 断点续跑 | 默认启用 checkpoint |
| 本地启动器 | `Start-TradingAgents.ps1` |

实际 API Key 只保存在被 `.gitignore` 忽略的 `.env` 中，不会提交到 GitHub。

## E 盘目录约束

本地启动器会把以下运行目录全部约束在项目目录内：

- Python 虚拟环境：`.venv`
- uv 与 pip 缓存：`.uv-cache`
- 临时文件：`.tmp`
- 用户目录隔离：`.home`
- 第三方缓存：`.cache`
- TradingAgents 日志、行情缓存和记忆：`.tradingagents`

启动器还会在当前环境未设置代理时，使用 `http://127.0.0.1:7897` 作为 `HTTP_PROXY` 和 `HTTPS_PROXY`。

## 从 fork 重新安装

以下命令适用于 PowerShell 7。所有新增文件均位于 E 盘：

```powershell
Set-Location E:\development
git clone https://github.com/lemonhall/TradingAgents.git
Set-Location E:\development\TradingAgents

$root=(Get-Location).Path
New-Item -ItemType Directory -Force -Path "$root\.uv-cache","$root\.tmp" | Out-Null
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
$env:UV_CACHE_DIR="$root\.uv-cache"
$env:PIP_CACHE_DIR="$root\.uv-cache\pip"
$env:TEMP="$root\.tmp"
$env:TMP="$root\.tmp"
$env:UV_PYTHON_DOWNLOADS='never'

uv venv --python 3.12 .venv
uv pip install --python .venv\Scripts\python.exe -e '.[dev]'
```

这套命令使用机器上已有的 Python 3.12，只在 E 盘创建项目虚拟环境、缓存和临时文件。

## 配置 Grok 4.5 中转

在项目根目录创建 `.env`。不要把真实 Key 写进本文或任何受 Git 管理的文件：

```dotenv
OPENAI_COMPATIBLE_API_KEY=在这里填写真实Key

TRADINGAGENTS_LLM_PROVIDER=openai_compatible
TRADINGAGENTS_LLM_BACKEND_URL=https://api-slb.krill-ai.com/codex/v1
TRADINGAGENTS_DEEP_THINK_LLM=grok-4.5
TRADINGAGENTS_QUICK_THINK_LLM=grok-4.5
TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese
TRADINGAGENTS_LLM_MAX_RETRIES=6
TRADINGAGENTS_CHECKPOINT_ENABLED=true

TRADINGAGENTS_RESULTS_DIR=E:/development/TradingAgents/.tradingagents/logs
TRADINGAGENTS_CACHE_DIR=E:/development/TradingAgents/.tradingagents/cache
TRADINGAGENTS_MEMORY_LOG_PATH=E:/development/TradingAgents/.tradingagents/memory/trading_memory.md
```

Base URL 应停在 `/v1`。OpenAI 兼容客户端会自动请求 `/chat/completions`，不要把完整的 `/chat/completions` 地址写进配置。

`TRADINGAGENTS_LLM_MAX_RETRIES=6` 用于吸收中转服务、代理或上游模型的短暂断线。`TRADINGAGENTS_CHECKPOINT_ENABLED=true` 会在每个图节点完成后保存状态；如果多次重试后仍失败，使用同一股票代码和分析日期重新启动即可从最近成功节点继续，而不是从头消耗一遍 API。

## 启动

推荐始终通过本地启动器运行：

```powershell
Set-Location E:\development\TradingAgents
.\Start-TradingAgents.ps1
```

查看入口是否可用：

```powershell
.\Start-TradingAgents.ps1 --help
```

首次实际运行请参考 [TESTING.zh-cn.md](TESTING.zh-cn.md)。

## 安装验证

静态检查：

```powershell
.\.venv\Scripts\python.exe -m ruff check .
```

完整测试应把临时目录放在 E 盘、项目目录之外，避免测试用 `.env` 与真实 `.env` 相互影响：

```powershell
$env:TEMP='E:\development\_agent_tmp'
$env:TMP='E:\development\_agent_tmp'
$env:DEEPSEEK_API_KEY='placeholder'
.\.venv\Scripts\python.exe -m pytest
```

本次安装验证结果为 `559 passed, 2 skipped, 0 failed`。两个跳过项分别是未安装的可选 Bedrock 扩展和刻意跳过的 DeepSeek 真实 API 测试。

## GitHub fork 维护方式

本地使用两个远程仓库：

- `origin`：自己的 fork，`https://github.com/lemonhall/TradingAgents.git`
- `upstream`：官方仓库，`https://github.com/TauricResearch/TradingAgents.git`

日常提交到自己的 fork：

```powershell
git add README.zh-cn.md TESTING.zh-cn.md Start-TradingAgents.ps1
git commit -m "docs: add Windows installation and A-share test guides"
git push origin main
```

以后同步官方更新：

```powershell
git fetch upstream
git switch main
git merge upstream/main
git push origin main
```

合并前先运行 `git status`。如果存在尚未提交的改动，应先提交或明确处理，不要直接覆盖本地文件。

## 常见问题

### `401` 或认证失败

确认 `.env` 中 `OPENAI_COMPATIBLE_API_KEY` 非空，并确认该 Key 对应当前 Krill 中转服务。不要在终端日志、截图或 GitHub Issue 中暴露 Key。

### `404`、模型不存在或接口路径错误

确认 Base URL 为 `https://api-slb.krill-ai.com/codex/v1`，模型 ID 为 `grok-4.5`。不要在 Base URL 后重复添加 `/chat/completions`。

### 网络超时

确认本地代理 `127.0.0.1:7897` 正在运行。启动器只会在代理环境变量不存在时补默认值，因此也可以在启动前显式设置其他代理。

如果异常底层显示 `incomplete chunked read`，说明已经收到 HTTP 响应，但代理或远端在正文完整传输前关闭了连接。这不是股票代码或 API Key 错误。当前配置会自动重试 6 次；若最终仍退出，使用相同输入重新运行以恢复 checkpoint。

### PowerShell 阻止脚本执行

可以仅对当前进程放行，然后重试：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Start-TradingAgents.ps1
```

### 输出存在哪里

报告与运行日志位于：

```text
E:\development\TradingAgents\.tradingagents\logs\<股票代码>\<分析日期>\
```

行情缓存和检查点位于 `.tradingagents\cache`，长期记忆位于 `.tradingagents\memory`。
