import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

const client = createClient("https://eqowzqpxewffljrzcegf.supabase.co", "sb_publishable_VQcE6kZLH8l3ItAINqPwdw_pMYT8pUJ");
const byId = (id) => document.getElementById(id);
const opener = byId("open-reading-account");
const dialog = byId("reading-account");
const login = byId("reading-login");
const logout = byId("reading-logout");
const status = byId("reading-sync-status");
const reset = byId("reading-reset");
const siteUrl = "https://wchengjia811-lang.github.io/english-study-library/";
let accountId = null;
let pending = Promise.resolve();

async function useSession(session) {
  const userId = session?.user.id;
  if (userId === accountId) return;
  accountId = userId;
  window.peaReadingProgress.disconnect();
  login.hidden = Boolean(userId);
  logout.hidden = !userId;
  opener.textContent = userId ? "阅读账号" : "登录账号";
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
        opener.textContent = saveError ? "阅读进度未同步" : "阅读账号";
      }).catch(() => {
        if (accountId === userId) opener.textContent = "阅读进度未同步";
      });
    }
  );
  status.textContent = "已登录，新的阅读进度会保存到账号。";
}

document.querySelector(".masthead nav").append(opener);
opener.hidden = false;
opener.onclick = () => dialog.showModal();

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

byId("reading-forgot").onclick = async (event) => {
  const email = login.elements.namedItem("email");
  if (!email.reportValidity()) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: siteUrl });
    status.textContent = error ? "暂时无法发送重置邮件，请稍后再试。" : "请查收密码重置邮件，并用浏览器打开链接。";
  } catch {
    status.textContent = "连接失败，请稍后再试。";
  } finally {
    button.disabled = false;
  }
};

reset.onsubmit = async (event) => {
  event.preventDefault();
  const button = event.submitter;
  if (button) button.disabled = true;
  try {
    const { error } = await client.auth.updateUser({ password: new FormData(reset).get("password") });
    if (error) {
      status.textContent = error.code === "same_password" ? "请选择一个不同的新密码。" : "密码未保存，请重新发送重置邮件再试。";
      return;
    }
    reset.reset();
    reset.hidden = true;
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
      login.hidden = true;
      logout.hidden = true;
      reset.hidden = false;
      if (!dialog.open) dialog.showModal();
      reset.elements.namedItem("password").focus();
      status.textContent = "请输入至少 8 位的新密码。";
    }
  }, 0);
});
