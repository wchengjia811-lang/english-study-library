const editions = window.peaEditions;
const guides = window.peaReadingGuide;
const writing = window.peaWriting;
const highlights = window.peaReadingHighlights;
const sectionSize = 6;

function paragraphKey(block) {
  let hash = 2166136261;
  for (const letter of block.text) hash = Math.imul(hash ^ letter.codePointAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

window.peaNoteLocation = (articleId, key) => {
  const item = editions.find(({ id }) => id === articleId);
  const index = item?.blocks.findIndex((block) => block.text && paragraphKey(block) === key);
  return index >= 0 ? {
    label: "第 " + (Math.floor(index / sectionSize) + 1) + " 节 · " + item.blocks[index].text.split(/\s+/).slice(0, 7).join(" ") + "…",
    href: "#read/" + articleId + "/" + key
  } : null;
};

function quickLink(item) {
  const block = item.blocks[highlights[item.id]?.quick];
  return block?.text ? '<a class="quick-link" href="#read/' + item.id + '/' + paragraphKey(block) + '/quick">5 分钟先读 →</a>' : "";
}

function publishedDate(item) {
  return item.publishedOn || guides[item.id]?.publishedOn || "";
}
const byId = (id) => document.getElementById(id);
const storageKey = "pea-reading-progress-v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
const guestProgress = progress;
let syncProgress = null;

window.peaReadingProgress = {
  connect(entries, save) {
    progress = entries;
    syncProgress = save;
    route();
  },
  disconnect() {
    progress = guestProgress;
    syncProgress = null;
    route();
  }
};

function safe(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function markTerms(text, terms) {
  const keys = terms.map(([term]) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${keys.join("|")})\\b`, "gi");
  let result = "";
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const index = terms.findIndex(([term]) => term.toLowerCase() === match[0].toLowerCase());
    result += safe(text.slice(offset, match.index)) +
      `<button class="inline-term" type="button" data-term="${index}" aria-expanded="false">${safe(match[0])}</button>`;
    offset = match.index + match[0].length;
  }
  return result + safe(text.slice(offset));
}

function renderShelf() {
  const country = byId("country").value;
  byId("articles").innerHTML = [...editions].sort((a, b) => publishedDate(b).localeCompare(publishedDate(a)))
    .filter((item) => !country || item.country === country).map((item) => `
    <article class="card cover-card"><a href="#read/${item.id}" aria-label="${safe(item.title)}">
      <img src="${item.cover}" alt="" loading="lazy"></a>
      <div class="card-copy"><p class="kicker">${item.country} · 约 ${item.minutes} 分钟 · ${safe(item.level || guides[item.id]?.level || "难度待标")}</p>
      ${publishedDate(item) ? `<p class="muted"><time datetime="${safe(publishedDate(item))}">${safe(publishedDate(item))}</time> 收录</p>` : ""}
      <h3><a href="#read/${item.id}">${item.title}</a></h3><p>${safe(highlights[item.id]?.recommendation || item.intro)}</p>
      <div class="reading-links"><a class="text-link" href="#read/${item.id}">${progress[item.id]?.done ? "重读原文" : progress[item.id] ? "继续精读" : "打开全文"} →</a>${quickLink(item)}</div></div></article>`).join("");
}

function renderDaily() {
  const item = [...editions].sort((a, b) => publishedDate(b).localeCompare(publishedDate(a)))[0];
  const date = publishedDate(item);
  byId("daily-read").innerHTML = `<div class="feature-copy"><p class="kicker">最近更新 · ${item.country}${date ? ` · <time datetime="${safe(date)}">${safe(date)}</time>` : ""}</p><h2>${item.title}</h2>
    <p>${safe(highlights[item.id]?.recommendation || item.intro)}</p><div class="reading-links">${quickLink(item)}<a class="button" href="#read/${item.id}">打开完整章节 →</a></div></div>
    <img src="${item.cover}" alt="" fetchpriority="high">`;
}

function renderWriting() {
  byId("writing-list").innerHTML = ["Task 1", "Task 2"].map((task, index) => `
    <section class="writing-group" id="writing-task-${index + 1}"><div class="section-title"><h2>${task} · ${index ? "大作文" : "小作文"} <small>${writing.filter((item) => item.task === task).length} 题</small></h2></div>
    <div class="articles">${writing.filter((item) => item.task === task).map((item) => `<article class="card card-copy">
    <p class="kicker">${item.type}</p><h3><a href="#essay/${item.id}">${item.title}</a></h3>
    <p>${item.prompt}</p><a class="text-link" href="#essay/${item.id}">读范文与分析 →</a></article>`).join("")}</div></section>`).join("");
}

function termList(terms) {
  return `<section class="term-list"><h2>重点表达</h2>
    <p class="muted term-guide">考试标签按用法标注，方便按备考方向挑选。</p>
    <dl>${terms.map(([word, meaning, exams]) => `<dt lang="en">${safe(word)}</dt><dd>${safe(meaning)}
    ${exams ? `<span class="exam-labels">${exams.map((exam) => `<span>${safe(exam)}</span>`).join("")}</span>` : ""}</dd>`).join("")}</dl></section>`;
}

function renderSectionReview(item, guide, section, index) {
  const text = section.map((block) => block.text || "").join(" ").toLowerCase();
  const terms = [...(guide?.review[index] || []), ...item.terms.filter(([word]) => text.includes(word.toLowerCase()))];
  const selected = [...new Map(terms.map(([word, meaning]) => [word.toLowerCase(), [word, meaning]])).values()].slice(0, 4);
  if (!selected.length) return "";
  return `<details class="analysis"><summary>本节复习 · ${selected.length} 个表达</summary>
    <p>先回想意思，再点开核对。</p>${selected.map(([word, meaning]) =>
      `<details><summary lang="en">${safe(word)}</summary><p>${safe(meaning)}</p></details>`).join("")}</details>`;
}

function renderEdition(item, targetKey, quick) {
  const sections = [];
  const guide = guides[item.id];
  const translations = window.peaTranslations[item.id];
  let paragraph = 0;
  const highlight = highlights[item.id];
  const firstMentions = new Map((highlight?.glossary || []).map(([word, meaning]) => [
    word, { meaning, index: item.blocks.findIndex((block) => block.text?.includes(word)) }
  ]));
  const blocks = item.blocks.map((block, index) => block.text ? {
    ...block, index, key: paragraphKey(block), translation: translations[paragraph++]
  } : block);
  for (let index = 0; index < blocks.length; index += sectionSize) sections.push(blocks.slice(index, index + sectionSize));
  const book = byId("reader");
  book.innerHTML = `<a class="text-link" href="./">← 返回旅行书架</a>
    <header class="article-head"><p class="kicker">${item.country} · 完整章节 · 约 ${item.minutes} 分钟 · ${safe(item.level || guide?.level || "难度待标")}</p>
      <h1 tabindex="-1">${item.title}</h1><p class="subtitle" lang="en">${item.english}</p><p>${item.intro}</p>
      <p class="muted">${item.sourceLabel} · <a href="${item.source}" target="_blank" rel="noopener">古腾堡原书与插图 ↗</a></p>
      ${item.background || guide?.background ? `<p class="analysis"><strong>阅读背景</strong>　${safe(item.background || guide.background)}</p>` : ""}
      ${item.id === "poppi-full" ? '<p class="muted">插图作者 Lucy Du Bois-Reymond</p>' : ""}</header>
    ${quick ? `<p class="analysis">5 分钟先读 · ${safe(highlight?.recommendation || item.intro)} <a href="#read/${item.id}/start">从头读完整章节</a></p>` : ""}
    <div class="reading-layout"><div><div class="read-controls">
      <label>阅读位置 <select id="read-section">${sections.map((_, i) => `<option value="${i}">第 ${i + 1} 节</option>`).join("")}</select></label>
      <label><input type="checkbox" id="show-full"> 展开全文</label><button id="open-lookup-tool" type="button">查词工具</button></div>
      <div id="passage">${sections.map((section, i) => `<section class="prose" data-section="${i}" hidden>
      <h2 tabindex="-1">第 ${i + 1} 节</h2>
      ${section.map((block) => block.image ? `<figure><img src="${block.image}" alt="${safe(block.caption || item.english + " 原书插图")}" loading="lazy">
        ${block.caption ? `<figcaption lang="en">${safe(block.caption)}</figcaption>` : ""}</figure>` :
        `<p lang="en" id="paragraph-${block.key}" tabindex="-1" class="${block.verse ? "verse" : ""}">${markTerms(block.text, item.terms)}</p>
        <button type="button" class="paragraph-context" data-context="${block.key}">本段表达与笔记</button>
        <details class="analysis paragraph-translation"><summary>查看中文翻译</summary><p lang="zh-CN">${safe(block.translation)}</p></details>
        ${[...firstMentions].filter(([, note]) => note.index === block.index).map(([word, note]) =>
          `<details class="analysis"><summary>背景短注 · ${safe(word)}</summary><p>${safe(note.meaning)}</p></details>`).join("")}
        ${highlight?.analysis[block.index] ? `<details class="analysis deep-reading"><summary>深读 · ${safe(highlight.analysis[block.index][0])}</summary><p>${safe(highlight.analysis[block.index][1])}</p></details>` : ""}
        ${item.sentences.filter(([quote]) => block.text.includes(quote)).map(([quote, analysis]) =>
          `<details class="analysis"><summary>拆解这一段的好句</summary><blockquote lang="en">${safe(quote)}</blockquote><p>${analysis}</p></details>`).join("")}`).join("")}
      ${renderSectionReview(item, guide, section, i)}</section>`).join("")}</div>
      <nav class="read-controls" aria-label="章节翻页"><button type="button" id="read-prev">← 上一节</button><span id="read-position" role="status"></span><button type="button" id="read-next">下一节 →</button><button type="button" id="read-done">标记读完</button></nav>
      </div><aside class="term-list paragraph-sidebar" aria-label="重点表达与笔记">
        <h2>重点表达</h2>
        <p id="paragraph-label" class="muted"></p>
        <p><button id="paragraph-note" type="button" data-notes-article="${item.id}">本段笔记</button></p>
        <div id="paragraph-terms"></div>
        <details><summary>全文表达与笔记</summary><p><button type="button" data-notes-article="${item.id}" data-notes-title="${safe(item.title)}">全文笔记</button></p>${termList(item.terms)}</details>
      </aside></div>`;
  const pages = [...book.querySelectorAll("[data-section]")];
  const picker = byId("read-section");
  const full = byId("show-full");
  const last = pages.length - 1;
  const saved = progress[item.id];
  const target = blocks.find((block) => block.key && block.key === targetKey);
  let page = target ? Math.floor(target.index / sectionSize)
    : targetKey === "start" || saved?.done ? 0 : Math.min(last, Math.max(0, saved?.page || 0));

  function showContext(block) {
    if (!block) return;
    const note = byId("paragraph-note");
    if (note.dataset.notesArticle !== item.id + ":" + block.key && byId("reading-notes").open) {
      byId("reading-notes-close").click();
      if (byId("reading-notes").open) return;
    }
    const location = window.peaNoteLocation(item.id, block.key);
    byId("paragraph-label").textContent = location.label;
    note.dataset.notesArticle = item.id + ":" + block.key;
    note.dataset.notesTitle = item.title + " · " + location.label;
    const indexes = new Set([...byId("paragraph-" + block.key).querySelectorAll("[data-term]")].map((term) => Number(term.dataset.term)));
    const terms = item.terms.filter((_, index) => indexes.has(index));
    byId("paragraph-terms").innerHTML = terms.length ? termList(terms) : '<p class="muted">本段暂无标注表达。可以使用查词工具，或把疑问记进本段笔记。</p>';
    for (const button of book.querySelectorAll("[data-context]")) {
      button.setAttribute("aria-pressed", String(button.dataset.context === block.key));
    }
  }

  for (const button of book.querySelectorAll("[data-context]")) {
    button.onclick = () => {
      showContext(blocks.find((block) => block.key === button.dataset.context));
      if (byId("paragraph-note").dataset.notesArticle === item.id + ":" + button.dataset.context) {
        byId("paragraph-note").focus();
      }
    };
  }

  function update(moveFocus = false) {
    byId("selection-lookup").hidden = true;
    for (const [index, section] of pages.entries()) section.hidden = !full.checked && index !== page;
    picker.value = String(page);
    picker.disabled = full.checked;
    byId("read-prev").disabled = full.checked || page === 0;
    byId("read-next").disabled = full.checked || page === last;
    byId("read-position").textContent = full.checked ? "全文" : `第 ${page + 1} / ${pages.length} 节`;
    byId("read-done").textContent = progress[item.id]?.done ? "已读完" : "标记读完";
    byId("read-done").disabled = Boolean(progress[item.id]?.done);
    if (moveFocus) {
      showContext(sections[page].find((block) => block.text));
      pages[page].querySelector("h2").focus();
    }
  }

  function save(done) {
    progress[item.id] = { page, done };
    if (syncProgress) syncProgress(item.id, { page, done });
    else {
      try { localStorage.setItem(storageKey, JSON.stringify(guestProgress)); } catch {}
    }
  }

  function changePage(next) {
    if (byId("reading-notes").open) {
      byId("reading-notes-close").click();
      if (byId("reading-notes").open) {
        picker.value = String(page);
        return;
      }
    }
    page = next;
    save(Boolean(progress[item.id]?.done));
    update(true);
  }

  byId("open-lookup-tool").onclick = () => byId("lookup-tool").showModal();
  picker.onchange = () => changePage(Number(picker.value));
  full.onchange = () => update();
  byId("read-prev").onclick = () => changePage(page - 1);
  byId("read-next").onclick = () => changePage(page + 1);
  byId("read-done").onclick = () => { save(true); update(); };
  update();
  showContext(target || sections[page].find((block) => block.text));
  return target && byId("paragraph-" + target.key);
}

function renderEssay(item) {
  byId("reader").innerHTML = `<a class="text-link" href="#writing">← 返回 Simon 写作</a>
    <header class="article-head"><p class="kicker">${item.task} · ${item.type}</p>
      <h1 tabindex="-1">${safe(item.title)}</h1></header>
    <div class="reading-layout"><div class="prose"><h2>题目</h2>
      <p lang="en">${safe(item.prompt)}</p>
      ${item.task === "Task 1" ? '<p lang="en">Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>' : ""}
      ${item.chart ? `<figure class="writing-chart"><a href="${item.chart}" target="_blank" rel="noopener"><img src="${item.chart}" alt="${safe(item.title)}的原题图表"></a><figcaption>原题图表 · 点击放大</figcaption></figure>` : ""}
      ${item.sourceNote ? `<p class="muted">${safe(item.sourceNote)}</p>` : ""}
      <h2>参考答案</h2>${item.paragraphs.map((paragraph, i) => `
      <p lang="en">${markTerms(paragraph, item.terms)}</p>
      ${item.notes?.[i] ? `<details class="analysis"><summary>第 ${i + 1} 段怎么写的</summary><p>${safe(item.notes[i])}</p></details>` : ""}`).join("")}
      <section class="essay-sentences"><h2>好句拆解</h2>${item.goodSentences.map(([sentence, tip]) =>
        `<div class="analysis"><blockquote lang="en">${safe(sentence)}</blockquote><p>${safe(tip)}</p></div>`).join("")}</section></div>
    ${termList(item.terms)}</div>`;
}

function bindTerms(item) {
  for (const button of byId("reader").querySelectorAll("[data-term]")) {
    button.onclick = () => {
      const existing = button.nextElementSibling;
      if (existing?.classList.contains("inline-note")) {
        existing.remove();
        button.setAttribute("aria-expanded", "false");
        return;
      }
      const note = document.createElement("span");
      note.className = "inline-note";
      const [, meaning, exams] = item.terms[Number(button.dataset.term)];
      note.textContent = exams ? `${exams.join(" · ")}｜${meaning}` : meaning;
      button.after(note);
      button.setAttribute("aria-expanded", "true");
    };
  }
}

function updateSelectionLookup() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const paragraphFor = (node) => (node?.nodeType === 1 ? node : node?.parentElement)
    ?.closest('#passage .prose:not([hidden]) > p[lang="en"]');
  const paragraph = paragraphFor(selection.anchorNode);
  const bar = byId("selection-lookup");
  bar.hidden = true;
  if (!paragraph || paragraph !== paragraphFor(selection.focusNode)) return;
  const query = selection.toString().trim().replace(/\s+/g, " ").replace(/^[“”"‘'.,!?;:()]+|[“”"‘’'.,!?;:()]+$/g, "");
  if (!/[a-z]/i.test(query) || query.length > 90 || query.split(" ").length > 10) return;
  byId("lookup-text").textContent = query;
  byId("lookup-dictionary").href = "https://dictionary.cambridge.org/search/english-chinese-simplified/direct/?q=" + encodeURIComponent(query);
  byId("lookup-background").href = "https://zh.wikipedia.org/w/index.php?search=" + encodeURIComponent(query);
  bar.hidden = false;
}

function route() {
  const notesPanel = byId("reading-notes");
  if (byId("reader").contains(notesPanel)) {
    notesPanel.close();
    document.body.append(notesPanel);
  }
  if (byId("lookup-tool").open) byId("lookup-tool").close();
  byId("selection-lookup").hidden = true;
  const hash = location.hash;
  if (hash === "#main") return;
  const old = { "#read/mechelen": "#read/malines-full" };
  if (Object.hasOwn(old, hash)) { location.replace(old[hash]); return; }
  const [, editionId, targetKey, mode] = hash.split("/");
  const edition = hash.startsWith("#read/") && editions.find((item) => item.id === editionId);
  let target;
  const essay = writing.find((item) => hash === `#essay/${item.id}`);
  const isWriting = hash === "#writing" || Boolean(essay);
  byId("shelf").hidden = isWriting || Boolean(edition);
  byId("writing").hidden = hash !== "#writing";
  byId("reader").hidden = !(edition || essay);
  byId("travel-link").setAttribute("aria-current", isWriting ? "false" : "page");
  byId("writing-link").setAttribute("aria-current", isWriting ? "page" : "false");
  if (edition || essay) {
    if (edition) target = renderEdition(edition, targetKey, mode === "quick"); else renderEssay(essay);
    const article = edition || essay;
    bindTerms(article);
    if (essay) {
      const notesButton = document.createElement("button");
      notesButton.type = "button";
      notesButton.textContent = "我的笔记";
      notesButton.dataset.notesArticle = article.id;
      notesButton.dataset.notesTitle = article.title;
      const notesRow = document.createElement("p");
      notesRow.append(notesButton);
      byId("reader").querySelector(".term-list h2").after(notesRow);
    }
    if (!target) byId("reader").querySelector("h1").focus();
  } else {
    byId("reader").replaceChildren();
    if (isWriting) {
      renderWriting();
      byId("writing").querySelector("h1").focus();
    } else {
      renderDaily();
      renderShelf();
    }
  }
  document.title = `${(edition || essay)?.title || (isWriting ? "Simon 写作" : "旅行精读")} · 豌豆尖英语`;
  if (target) {
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
  } else window.scrollTo(0, 0);
}

for (const country of new Set(editions.map((item) => item.country))) byId("country").add(new Option(country, country));
byId("country").addEventListener("change", renderShelf);
const lookupBar = byId("selection-lookup");
const lookupQuery = byId("lookup-query");
byId("lookup-form").onsubmit = (event) => {
  lookupQuery.value = lookupQuery.value.trim();
  if (!lookupQuery.reportValidity()) event.preventDefault();
};
byId("lookup-tool-background").onclick = () => {
  lookupQuery.value = lookupQuery.value.trim();
  if (lookupQuery.reportValidity()) {
    window.open("https://zh.wikipedia.org/w/index.php?search=" + encodeURIComponent(lookupQuery.value), "_blank", "noopener,noreferrer");
  }
};
byId("lookup-tool-close").onclick = () => byId("lookup-tool").close();
byId("lookup-close").onclick = () => { lookupBar.hidden = true; };
document.addEventListener("selectionchange", updateSelectionLookup);
document.addEventListener("pointerdown", (event) => {
  if (!lookupBar.contains(event.target)) lookupBar.hidden = true;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") lookupBar.hidden = true;
});
window.addEventListener("hashchange", route);
route();
