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

设置 DeepSeek API Key：

```powershell
$env:DEEPSEEK_API_KEY="your-api-key"
```

启动服务：

```bash
python app.py
```

打开 <http://127.0.0.1:5000>。

没有配置 API Key 时，页面仍会显示英文摘要和论文原文链接，但不会生成中文翻译与导读。

## 配置

- `DEEPSEEK_API_KEY`：DeepSeek API 密钥。
- `DEEPSEEK_MODEL`：模型名称，默认 `deepseek-flash`。

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
