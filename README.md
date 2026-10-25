# 豌豆尖英语

作文范文、模板、观点、词汇与同义替换、口语表达的静态资料目录。

50 份资料可直接阅读。

使用 GitHub Pages 从 main 分支根目录发布。

## 浏览器自学工具

全文搜索使用站内保存的 MiniSearch 7.2.0；不依赖 CDN。收藏、已背诵标记、阅读位置、外观与字号只保存在当前浏览器，不需要账号或数据库。

- `library/*/document.json` 与原页面图片：原始资料，不由工具构建脚本改写。
- `scripts/build-study-index.py`：从原始资料生成 `search-index.json`、`tags-index.json` 和 `study-data/` 摘抄数据。
- `study-core.js`：全文搜索、本地存储、复制、主题与字号。
- `reader-study.js`：阅读页的段落操作、摘抄面板及同话题推荐。
- `notebook.html`：本地素材本与 Markdown 复制导出。
- `practice.html`：明确标注为本站示例的表达改写卡，以及基于收藏原文的自测。

更新资料后运行：

```sh
python scripts/build-study-index.py
python scripts/validate_static.py
```

同义替换和话题标签由侧边索引维护，不需要改写资料正文。文字提取异常的 PDF 行不进入摘抄索引，完整原页仍可阅读。网页批注开关不会去掉 PDF 原页中已有的颜色或批注。

## 离线包

`.github/workflows/offline-release.yml` 在 main 更新时生成完整 ZIP，并上传到固定的 `offline` Release。包内的 `offline-data.js` 只存在于离线包，供 file:// 模式直接读取数据；打开解压后的 index.html 不需要服务器。

本地打包：

```sh
python scripts/package_offline.py --output pea-english-offline.zip
```

原始教材及范文版权归各自权利人，站点为非官方个人学习整理，禁止商用。公开展示需要相应授权；学习用途声明不代替授权。
