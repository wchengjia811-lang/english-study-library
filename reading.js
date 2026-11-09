const editions = window.peaEditions;
const writing = window.peaWriting;
const byId = (id) => document.getElementById(id);
const storageKey = "pea-reading-progress-v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}

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
  byId("articles").innerHTML = editions.filter((item) => !country || item.country === country).map((item) => `
    <article class="card cover-card"><a href="#read/${item.id}" aria-label="${safe(item.title)}">
      <img src="${item.cover}" alt="" loading="lazy"></a>
      <div class="card-copy"><p class="kicker">${item.country} · 全章 · 约 ${item.minutes} 分钟</p>
      <h3><a href="#read/${item.id}">${item.title}</a></h3><p>${item.intro}</p>
      <a class="text-link" href="#read/${item.id}">${progress[item.id]?.done ? "重读原文" : progress[item.id] ? "继续精读" : "打开全文"} →</a></div></article>`).join("");
}

function renderDaily() {
  const elapsed = Math.floor((Date.now() - Date.parse("2026-11-09T00:00:00+08:00")) / 86400000);
  const item = editions[((elapsed % editions.length) + editions.length) % editions.length];
  byId("daily-read").innerHTML = `<div class="feature-copy"><p class="kicker">今日精读 · ${item.country}</p><h2>${item.title}</h2>
    <p>${item.intro}</p><a class="button" href="#read/${item.id}">打开完整章节 →</a></div>
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

function renderEdition(item) {
  const sections = [];
  for (let index = 0; index < item.blocks.length; index += 6) sections.push(item.blocks.slice(index, index + 6));
  const book = byId("reader");
  book.innerHTML = `<a class="text-link" href="./">← 返回旅行书架</a>
    <header class="article-head"><p class="kicker">${item.country} · 完整章节 · 约 ${item.minutes} 分钟</p>
      <h1 tabindex="-1">${item.title}</h1><p class="subtitle" lang="en">${item.english}</p><p>${item.intro}</p>
      <p class="muted">${item.sourceLabel} · <a href="${item.source}" target="_blank" rel="noopener">古腾堡原书与插图 ↗</a></p>
      <p class="muted">历史游记。可按节阅读，点蓝色词句看中文用法。波皮篇插图作者为 Lucy Du Bois-Reymond。</p></header>
    <div class="reading-layout"><div><div class="read-controls">
      <label>阅读位置 <select id="read-section">${sections.map((_, i) => `<option value="${i}">第 ${i + 1} 节</option>`).join("")}</select></label>
      <label><input type="checkbox" id="show-full"> 展开全文</label></div>
      <div id="passage">${sections.map((section, i) => `<section class="prose" data-section="${i}" hidden>
      <h2 tabindex="-1">第 ${i + 1} 节</h2>
      ${section.map((block) => block.image ? `<figure><img src="${block.image}" alt="${safe(block.caption || item.english + " 原书插图")}" loading="lazy">
        ${block.caption ? `<figcaption lang="en">${safe(block.caption)}</figcaption>` : ""}</figure>` :
        `<p lang="en" class="${block.verse ? "verse" : ""}">${markTerms(block.text, item.terms)}</p>
        ${item.sentences.filter(([quote]) => block.text.includes(quote)).map(([quote, analysis]) =>
          `<details class="analysis"><summary>拆解这一段的好句</summary><blockquote lang="en">${safe(quote)}</blockquote><p>${analysis}</p></details>`).join("")}`).join("")}</section>`).join("")}</div>
      <nav class="read-controls" aria-label="章节翻页"><button type="button" id="read-prev">← 上一节</button><span id="read-position" role="status"></span><button type="button" id="read-next">下一节 →</button><button type="button" id="read-done">标记读完</button></nav>
      </div>${termList(item.terms)}</div>`;
  const pages = [...book.querySelectorAll("[data-section]")];
  const picker = byId("read-section");
  const full = byId("show-full");
  const last = pages.length - 1;
  let page = Math.min(last, Math.max(0, progress[item.id]?.page || 0));

  function update(moveFocus = false) {
    for (const [index, section] of pages.entries()) section.hidden = !full.checked && index !== page;
    picker.value = String(page);
    picker.disabled = full.checked;
    byId("read-prev").disabled = full.checked || page === 0;
    byId("read-next").disabled = full.checked || page === last;
    byId("read-position").textContent = full.checked ? "全文" : `第 ${page + 1} / ${pages.length} 节`;
    byId("read-done").textContent = progress[item.id]?.done ? "已读完" : "标记读完";
    byId("read-done").disabled = Boolean(progress[item.id]?.done);
    if (moveFocus) pages[page].querySelector("h2").focus();
  }

  function save(done) {
    progress[item.id] = { page, done };
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch {}
  }

  function changePage(next) {
    page = next;
    save(Boolean(progress[item.id]?.done));
    update(true);
  }

  picker.onchange = () => changePage(Number(picker.value));
  full.onchange = () => update();
  byId("read-prev").onclick = () => changePage(page - 1);
  byId("read-next").onclick = () => changePage(page + 1);
  byId("read-done").onclick = () => { save(true); update(); };
  update();
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

function route() {
  const hash = location.hash;
  if (hash === "#main") return;
  const old = { "#read/mechelen": "#read/malines-full" };
  if (Object.hasOwn(old, hash)) { location.replace(old[hash]); return; }
  const edition = editions.find((item) => hash === `#read/${item.id}`);
  const essay = writing.find((item) => hash === `#essay/${item.id}`);
  const isWriting = hash === "#writing" || Boolean(essay);
  byId("shelf").hidden = isWriting || Boolean(edition);
  byId("writing").hidden = hash !== "#writing";
  byId("reader").hidden = !(edition || essay);
  byId("travel-link").setAttribute("aria-current", isWriting ? "false" : "page");
  byId("writing-link").setAttribute("aria-current", isWriting ? "page" : "false");
  if (edition || essay) {
    if (edition) renderEdition(edition); else renderEssay(essay);
    bindTerms(edition || essay);
    byId("reader").querySelector("h1").focus();
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
  window.scrollTo(0, 0);
}

for (const country of new Set(editions.map((item) => item.country))) byId("country").add(new Option(country, country));
byId("country").addEventListener("change", renderShelf);
window.addEventListener("hashchange", route);
route();
