import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

const client = createClient("https://eqowzqpxewffljrzcegf.supabase.co", "sb_publishable_VQcE6kZLH8l3ItAINqPwdw_pMYT8pUJ");
const byId = (id) => document.getElementById(id);
const opener = byId("open-reading-account");
const dialog = byId("reading-account");
const login = byId("reading-login");
const logout = byId("reading-logout");
const status = byId("reading-sync-status");
const reset = byId("reading-reset");
const recovery = byId("reading-recovery");
const recoveryForm = byId("reading-recovery-form");
const recoveryStatus = byId("reading-recovery-status");
const notes = byId("reading-notes");
const notesForm = byId("reading-notes-form");
const notesText = byId("reading-notes-text");
const notesStatus = byId("reading-notes-status");
const notesSave = notesForm.querySelector('button[type="submit"]');
let currentNote = null;
const noteDrafts = new Map();
const siteUrl = "https://wchengjia811-lang.github.io/english-study-library/";
let accountId = null;
let pending = Promise.resolve();

async function useSession(session) {
  const userId = session?.user.id;
  if (userId === accountId) return;
  accountId = userId;
  notes.close();
  window.peaReadingProgress.disconnect();
  login.hidden = Boolean(userId);
  logout.hidden = !userId;
  opener.textContent = userId ? session.user.email?.split("@")[0] || "已登录" : "登录账号";
  byId("reading-account-title").textContent = opener.textContent;
  if (!userId) {
    status.textContent = "登录同一个账号后，可以在手机和电脑之间续读。";
    return;
  }

  status.textContent = "正在读取云端进度…";
  const { data, error } = await client.from("reader_progress").select("article_id,page,done");
  if (accountId !== userId) return;
  if (error) {
    status.textContent = "云端进度暂时读取失败，请重新登录再试。";
    return;
  }
  window.peaReadingProgress.connect(
    Object.fromEntries(data.map(({ article_id, page, done }) => [article_id, { page, done }])),
    (articleId, { page, done }) => {
      pending = pending.then(async () => {
        if (accountId !== userId) return;
        const { error: saveError } = await client.from("reader_progress").upsert({
          user_id: userId, article_id: articleId, page, done
        });
        if (accountId !== userId) return;
        status.textContent = saveError ? "这次进度未同步，请联网后再翻一节重试。" : "阅读进度已同步。";
      }).catch(() => {
        if (accountId === userId) status.textContent = "阅读进度未同步。";
      });
    }
  );
  status.textContent = "已登录，新的阅读进度会保存到账号。";
}

document.querySelector(".masthead nav").append(opener);
opener.hidden = false;
opener.onclick = () => dialog.showModal();

function closeNotes(event) {
  event.preventDefault();
  if (currentNote && notesText.value !== currentNote.content && !window.confirm("笔记还没保存，确定要关闭吗？")) {
    return;
  }
  if (currentNote) noteDrafts.delete(currentNote.draftKey);
  notes.close();
}

notes.oncancel = closeNotes;
byId("reading-notes-close").onclick = closeNotes;
notes.onclose = () => {
  if (notes.open) return;
  currentNote = null;
  notesText.value = "";
};

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-notes-article]");
  if (!button) return;
  if (!accountId) {
    status.textContent = "登录后即可保存和同步笔记。";
    dialog.showModal();
    return;
  }
  if (notes.open) {
    notesText.focus();
    return;
  }
  const articleId = button.dataset.notesArticle;
  const note = { userId: accountId, articleId, draftKey: accountId + "/" + articleId, content: "", version: null };
  currentNote = note;
  byId("reading-notes-article").textContent = button.dataset.notesTitle;
  notesText.value = "";
  notesText.disabled = true;
  notesSave.disabled = true;
  notesStatus.textContent = "正在读取笔记…";
  button.parentElement.after(notes);
  notes.show();
  try {
    const { data, error } = await client.from("reader_notes").select("content,version")
      .eq("user_id", note.userId).eq("article_id", note.articleId).maybeSingle();
    if (!notes.open || currentNote !== note) return;
    if (error) throw error;
    const draft = noteDrafts.get(note.draftKey);
    if (draft) Object.assign(note, { content: draft.original, version: draft.version });
    else if (data) Object.assign(note, data);
    notesText.value = draft?.text ?? note.content;
    notesText.disabled = false;
    notesSave.disabled = false;
    notesStatus.textContent = draft ? "已恢复本页未保存的笔记。" : "";
    notesText.focus();
  } catch {
    if (notes.open && currentNote === note) notesStatus.textContent = "笔记读取失败，请关闭后重新打开。";
  }
});

notesText.oninput = () => {
  if (!currentNote) return;
  const { draftKey, content, version } = currentNote;
  if (notesText.value === content) noteDrafts.delete(draftKey);
  else noteDrafts.set(draftKey, { text: notesText.value, original: content, version });
};

notesForm.onsubmit = async (event) => {
  event.preventDefault();
  const note = currentNote;
  if (!note || note.userId !== accountId || notesSave.disabled) return;
  const content = notesText.value;
  const version = (note.version ?? 0) + 1;
  notesSave.disabled = true;
  notesStatus.textContent = "正在保存…";
  try {
    const table = client.from("reader_notes");
    const request = note.version === null
      ? table.insert({ user_id: note.userId, article_id: note.articleId, content, version })
      : table.update({ content, version }).eq("user_id", note.userId)
        .eq("article_id", note.articleId).eq("version", note.version);
    const { data, error } = await request.select("version").maybeSingle();
    if (!notes.open || currentNote !== note) return;
    if (error && error.code !== "23505") throw error;
    if (!data) {
      notesStatus.textContent = "另一台设备已更新笔记。请先复制这次编辑，再关闭并重新打开，合并后保存。";
      return;
    }
    Object.assign(note, { content, version: data.version });
    notesText.oninput();
    notesStatus.textContent = notesText.value === content ? "笔记已保存并同步。" : "已保存上一版，新的编辑还没保存。";
  } catch {
    if (notes.open && currentNote === note) notesStatus.textContent = "保存失败，文字还在，请重试。";
  } finally {
    if (notes.open && currentNote === note) notesSave.disabled = false;
  }
};

login.onsubmit = async (event) => {
  event.preventDefault();
  const fields = new FormData(login);
  const credentials = { email: fields.get("email").trim(), password: fields.get("password") };
  const signup = event.submitter?.value === "signup";
  for (const button of login.querySelectorAll("button")) button.disabled = true;
  try {
    status.textContent = signup ? "正在注册…" : "正在登录…";
    const result = signup
      ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: siteUrl } })
      : await client.auth.signInWithPassword(credentials);
    if (result.error) {
      status.textContent = signup ? "注册未完成。请检查邮箱后再试。" : "登录失败，请检查邮箱、密码和邮箱验证状态。";
    } else if (!result.data.session) {
      login.reset();
      status.textContent = "请查看验证邮件，确认邮箱后返回登录。";
    } else {
      login.reset();
      await useSession(result.data.session);
    }
  } catch {
    status.textContent = "连接失败，请稍后再试。";
  } finally {
    for (const button of login.querySelectorAll("button")) button.disabled = false;
  }
};

byId("reading-forgot").onclick = () => {
  recoveryForm.elements.namedItem("email").value = login.elements.namedItem("email").value;
  recoveryStatus.textContent = "";
  dialog.close();
  recovery.showModal();
};
recovery.onclose = () => {
  if (!dialog.open) dialog.showModal();
};

recoveryForm.onsubmit = async (event) => {
  event.preventDefault();
  const email = recoveryForm.elements.namedItem("email").value.trim();
  const button = recoveryForm.querySelector("button");
  button.disabled = true;
  recoveryStatus.textContent = "正在发送重置邮件…";
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: siteUrl });
    recoveryStatus.textContent = error ? "暂时无法发送重置邮件，请稍后再试。" : "如果该邮箱已注册，请查收重置邮件，并用浏览器打开链接。";
  } catch {
    recoveryStatus.textContent = "连接失败，请稍后再试。";
  } finally {
    button.disabled = false;
  }
};

reset.onsubmit = async (event) => {
  event.preventDefault();
  const fields = new FormData(reset);
  const password = fields.get("password");
  if (password !== fields.get("confirmation")) {
    status.textContent = "两次输入的新密码不一致。";
    reset.elements.namedItem("confirmation").focus();
    return;
  }
  const button = event.submitter;
  if (button) button.disabled = true;
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      status.textContent = error.code === "same_password" ? "请选择一个不同的新密码。" : "密码未保存，请重新发送重置邮件再试。";
      return;
    }
    reset.reset();
    reset.hidden = true;
    byId("reading-account-title").textContent = opener.textContent;
    logout.hidden = false;
    status.textContent = "新密码已保存。以后可用邮箱和新密码直接登录。";
  } catch {
    status.textContent = "连接失败，请稍后再试。";
  } finally {
    if (button) button.disabled = false;
  }
};

logout.onclick = async () => {
  await pending;
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) status.textContent = "退出失败，请稍后再试。";
};

client.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    try {
      await useSession(session);
    } catch {
      status.textContent = "暂时无法连接云端阅读进度。";
    }
    if (event === "PASSWORD_RECOVERY" && session) {
      byId("reading-account-title").textContent = "设置新密码";
      login.hidden = true;
      logout.hidden = true;
      reset.hidden = false;
      if (!dialog.open) dialog.showModal();
      reset.elements.namedItem("password").focus();
      status.textContent = "请输入至少 8 位的新密码。";
    }
  }, 0);
});
