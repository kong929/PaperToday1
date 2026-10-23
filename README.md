# PaperToday

一个聚合 Nature、Science、Cell 最新研究论文的沉浸式阅读页面，聚焦生物医学与人工智能方向。

## 功能

- 从 Crossref 获取最新论文元数据。
- 过滤新闻、短讯、评论、社论、勘误和撤稿，只保留正式研究论文。
- 通过 PubMed 文献类型和摘要长度校验论文质量。
- 使用 OpenAlex 为缺少摘要的记录回填公开摘要。
- 使用 DeepSeek 生成中文标题、摘要翻译和研究导读。
- 单篇论文逐篇展示，支持暂停滚动和手动切换。

## 本地运行

```bash
pip install -r requirements.txt
```

设置 AI API Key：

```powershell
$env:AI_API_KEY="your-api-key"
```

启动服务：

```bash
python app.py
```

打开 <http://127.0.0.1:5000>。

没有配置 API Key 时，页面仍会显示英文摘要和论文原文链接，但不会生成中文翻译与导读。

## 配置

- `AI_API_KEY`：OpenAI 兼容接口的 API Key。
- `AI_API_URL`：完整的 Chat Completions 地址。
- `AI_MODEL`：模型名称。
- `APP_USERNAME`、`APP_PASSWORD`：可选访问密码，两者都设置后启用 Basic Auth。
- `AI_JSON_MODE`：是否发送 `response_format`，默认 `1`；接口不支持时设为 `0`。
- `AI_MAX_TOKENS_PARAM`：Token 上限参数名，默认 `max_tokens`。

旧的 `DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`、`DEEPSEEK_MODEL` 仍然兼容。

## 公网部署

项目包含 `render.yaml` 和 `Procfile`，可以直接部署到 Render：

1. 把项目推送到 GitHub，确保仓库根目录直接包含 `app.py`、`requirements.txt`、`render.yaml` 和 `templates/`。
2. 在 Render 中选择 **New > Blueprint**，连接该 GitHub 仓库。
3. 按提示填写 `DEEPSEEK_API_KEY`，创建服务。
4. 部署完成后访问 Render 提供的 `https://...onrender.com` 地址。

如果手动创建 Web Service：

- Build Command：`pip install -r requirements.txt`
- Start Command：`gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1`
- Health Check Path：`/health`

Render 免费实例空闲后会休眠，首次访问需要等待冷启动；论文数据首次抓取也可能需要几十秒。

## 数据来源

- [Crossref](https://www.crossref.org/)
- [OpenAlex](https://openalex.org/)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/)
- [DeepSeek](https://www.deepseek.com/)

## 项目结构

```text
app.py                 Flask 后端、论文抓取与过滤、AI 接口
templates/index.html   单页阅读界面
requirements.txt       Python 依赖
```
