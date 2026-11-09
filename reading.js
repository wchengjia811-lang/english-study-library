const articles = window.peaArticles;
const byId = (id) => document.getElementById(id);
const key = "pea-reading-progress-v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(key)) || {}; } catch {}

function save(id, values) {
  progress[id] = { ...progress[id], ...values, updated: new Date().toISOString() };
  try { localStorage.setItem(key, JSON.stringify(progress)); } catch {
    byId("storage-note").textContent = "浏览器无法保存记录，本次记录只保留在当前页面。";
  }
}

function renderShelf() {
  const query = byId("query").value.trim().toLowerCase();
  const topic = byId("topic").value;
  const matches = articles.filter((article) =>
    (!topic || article.topic === topic) && JSON.stringify(article).toLowerCase().includes(query)
  );
  byId("count").textContent = matches.length ? `共 ${matches.length} 篇` : "没有找到文章，试试其他关键词或主题。";
  byId("articles").innerHTML = matches.map((article) => `
    <article class="card"><p class="eyebrow">${article.topic} · 约 ${article.minutes} 分钟</p>
    <h3><a href="#read/${article.id}">${article.title}</a></h3>
    <p lang="en" class="muted">${article.english}</p><p>${article.intro}</p>
    <a class="button" href="#read/${article.id}">${progress[article.id]?.done ? "重读文章" : progress[article.id] ? "继续阅读" : "开始精读"} →</a></article>`).join("");
}

function renderDailyRead() {
  const travel = articles.filter((article) => article.source);
  const elapsed = Math.floor((Date.now() - Date.parse("2026-11-09T00:00:00+08:00")) / 86400000);
  const article = travel[((elapsed % travel.length) + travel.length) % travel.length];
  byId("daily-read").innerHTML = `<p class="eyebrow">今日精读 · 欧洲小城</p>
    <h2><a href="#read/${article.id}">${article.title}</a></h2>
    <p>${article.intro}</p><a class="button" href="#read/${article.id}">读今天这篇 →</a>
    <p class="muted">每天从现有旅行选文中轮换一篇。</p>`;
}

function markTerms(text, terms) {
  if (!terms) return text;
  const escaped = terms.map(([term]) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}

function renderReader(article) {
  const reader = byId("reader");
  reader.innerHTML = `<a href="./">← 返回书库</a>
    <p class="eyebrow">${article.topic} · 约 ${article.minutes} 分钟 · ${article.source ? "外刊导读" : "自编学习短文"}</p>
    <h1 tabindex="-1">${article.title}</h1><p class="subtitle" lang="en">${article.english}</p>
    ${article.source ? `<aside class="card"><p><a href="${article.source}" target="_blank" rel="noopener">打开原刊 ↗</a> · ${article.sourceLabel}</p>
    <p>原文短引：<q lang="en">${markTerms(article.excerpt, article.terms)}</q></p>
    <p class="muted">下面是本站编写的英文导读与中文对照。</p></aside>` : ""}
    <div class="passage">${article.paragraphs.map(([english, chinese], index) => `
      <section class="paragraph"><p lang="en">${markTerms(english, article.terms)}</p><div class="paragraph-tools">
      <button type="button" data-listen="${index}" aria-label="朗读第${index + 1}段">朗读</button>
      <details><summary>查看译文</summary><p>${chinese}</p></details></div></section>`).join("")}</div>
    <p id="audio-note" class="muted" role="status">朗读使用设备提供的英语合成语音。</p>
    <aside class="card"><h2>重点词句</h2><dl class="reading-terms">${(article.terms || [article.expression]).map(([term, meaning]) =>
      `<dt lang="en">${term}</dt><dd>${meaning}</dd>`).join("")}</dl></aside>
    <form class="card quiz"><fieldset><legend>读后练习</legend><p>${article.question}</p>
    ${article.options.map((option, index) => `<label><input type="radio" name="answer" value="${index}" required> ${option}</label>`).join("")}
    </fieldset><button class="button" type="submit">检查答案</button>
    <p id="answer" role="status">${progress[article.id]?.done ? "已完成，可再次练习。" : ""}</p></form>`;
  reader.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = Number(new FormData(event.currentTarget).get("answer"));
    const correct = answer === article.correct;
    byId("answer").textContent = correct ? `答对了。${article.explanation}` : "再读一下原文，试着找出支持答案的句子。";
    if (correct) save(article.id, { done: true });
  });
  for (const button of reader.querySelectorAll("[data-listen]")) {
    button.addEventListener("click", () => {
      const synth = window.speechSynthesis;
      if (!synth || !window.SpeechSynthesisUtterance) {
        byId("audio-note").textContent = "当前浏览器无法播放合成语音。";
        return;
      }
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(article.paragraphs[Number(button.dataset.listen)][0]);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.voice = synth.getVoices().find((voice) => /^en(-|$)/i.test(voice.lang)) || null;
      utterance.onstart = () => { if (byId("audio-note")) byId("audio-note").textContent = "正在朗读…"; };
      utterance.onend = () => { if (byId("audio-note")) byId("audio-note").textContent = "朗读结束。"; };
      utterance.onerror = ({ error }) => {
        if (byId("audio-note") && !["canceled", "interrupted"].includes(error)) {
          byId("audio-note").textContent = "这次没能播放。请检查浏览器或设备的英语语音设置。";
        }
      };
      synth.speak(utterance);
    });
  }
}

function route() {
  window.speechSynthesis?.cancel();
  const hash = location.hash;
  const article = articles.find((item) => hash === `#read/${item.id}`);
  byId("shelf").hidden = Boolean(article) || hash === "#records";
  byId("reader").hidden = !article;
  byId("records").hidden = hash !== "#records";
  if (article) {
    if (!progress[article.id]) save(article.id, { done: false });
    renderReader(article);
    byId("reader").querySelector("h1").focus();
  } else if (hash === "#records") {
    const seen = articles.filter((item) => progress[item.id]).sort((a, b) =>
      progress[b.id].updated.localeCompare(progress[a.id].updated));
    byId("record-list").innerHTML = seen.length ? seen.map((item) => `
      <li><a href="#read/${item.id}">${item.title}</a> · ${progress[item.id].done ? "已完成练习" : "已开始阅读"}</li>`).join("")
      : "<li>还没有阅读记录，先从书库选一篇。</li>";
    byId("records").querySelector("h1").focus();
  } else {
    renderDailyRead();
    renderShelf();
  }
  window.scrollTo(0, 0);
}

for (const topic of new Set(articles.map((item) => item.topic))) byId("topic").add(new Option(topic, topic));
byId("query").addEventListener("input", renderShelf);
byId("topic").addEventListener("change", renderShelf);
window.addEventListener("hashchange", route);
route();
