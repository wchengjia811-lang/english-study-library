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

## 输出练习与掌握度

`study-training.js` 提供本地仿写、草稿、目标表达匹配、口语计时和自评。无语音上传、自动评分或后台请求。`pea-study-v1` 增加 mastery 和 practice 字段，保留既有收藏与背诵记录；练习自评最多保留 200 条。话题复习建议依据最近 50 条自评，至少两条记录才参与提示。仿写草稿单独保存在 pea-writing:条目ID 下；阅读字号保存在 pea-reader-font。


## 七类词库（2026-10-26）

首页为七个考试分类，原资料目录迁至 `ielts.html`，原阅读链接与400组进度保持不变。`vocabulary.html#cet4` 等链接直接打开对应词库；IELTS入口先进入写作、口语与词汇分区。

`exam-data/*.json` 是从 WordTyper / ECDICT MIT词表精简出的词头、音标与释义，按选库加载，合计36,387条（跨库有重叠，非官方完整大纲）。来源、版本、原文哈希及生成数据哈希见 `exam-data/manifest.json`。

`exam-core.js` 负责分词库进度、收藏、未完成练习、间隔复习与合并备份；独立使用 `pea-exams-web-v1-*` 存储，不覆盖原400组与资料本。忘记后10分钟、有印象1天，连续能想起按1/3/7/14/30天安排；打开网站时展示到期词，不后台推送。

`node scripts/check-vocabulary.cjs` 校验词表、乱码、复习时间、备份与存储；`python scripts/validate_static.py` 校验链接和原资料。离线打包器同时打入七类词表。


每日目标支持10/20/40/60/80/100/150/200词；每天可分多轮，每轮最多40个不同词（错词每轮最多额外重现2次）。词表载入时乱序，新词从全部未学词中随机选取，到期词按时间优先。继续练习保留原队列。
