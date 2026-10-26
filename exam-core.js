/* Shared learning rules adapted from the native mini program; no legacy storage changes. */
(()=>{'use strict';
const wx={getStorageSync(key){const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;},setStorageSync(key,value){localStorage.setItem(key,JSON.stringify(value));},showToast(o){window.dispatchEvent(new CustomEvent('exam-notice',{detail:o.title}));}};
const BOOKS = window.PeaExamBooks;
const KEY = 'pea-exams-web-v1', DAY = 86400000;
const GOALS=[10,20,40,60,80,100,150,200], ROUND=40;
let memory, warning = '';
const ids = BOOKS.map(b => b.id);
function blank() { return { version: 1, goal: 20, books: {} }; }
function fresh() { return { words: {}, days: {}, session: null }; }
function day(now = Date.now()) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
function validRecord(r) { return r && [0,1,2].includes(r.rating) && Number.isFinite(r.last) && r.last >= 0 && Number.isFinite(r.due) && r.due >= 0 && Number.isInteger(r.streak) && r.streak >= 0 && r.streak <= 10000; }
function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj,key); }
function safeTerm(s) { return typeof s === 'string' && s.length > 0 && s.length <= 160 && s !== '__proto__'; }
function sanitize(input) {
 if (!input || input.version !== 1 || !input.books || typeof input.books !== 'object') throw Error('不是新版词库备份');
 const out = blank(); out.goal = GOALS.includes(input.goal) ? input.goal : 20;
 for (const id of ids) {
  const b=input.books[id]; if(!b || typeof b !== 'object') continue;
  const v=fresh();
  for(const [term,r] of Object.entries(b.words || {})) if(safeTerm(term) && validRecord(r)) v.words[term]={rating:r.rating,last:r.last,due:r.due,streak:r.streak,favorite:Number.isFinite(r.favorite) && r.favorite>0?r.favorite:0};
  for(const [d,terms] of Object.entries(b.days || {})) if(/^\d{4}-\d{2}-\d{2}$/.test(d) && Array.isArray(terms)) v.days[d]=Array.from(new Set(terms.filter(safeTerm))).slice(0,1000);
  const s=b.session;
  if(s && Array.isArray(s.queue) && s.queue.length<=120 && s.queue.every(safeTerm) && Number.isInteger(s.at) && s.at>=0 && s.at<=s.queue.length) v.session={queue:s.queue.slice(),at:s.at,revealed:!!s.revealed,answer:typeof s.answer==='string'?s.answer.slice(0,160):'',dictation:!!s.dictation,retries:Object.fromEntries(Object.entries(s.retries || {}).filter(([k,n])=>safeTerm(k)&&Number.isInteger(n)&&n>=0&&n<=2))};
  out.books[id]=v;
 }
 return out;
}

// Each WeChat storage value stays small: 32 stable shards per book.
// Existing pea-mini-v1 is never written here.
let serialized = {};
function shard(term) { let n=0;for(let i=0;i<term.length;i++)n=(n*31+term.charCodeAt(i))>>>0;return n%32; }
function load() {
 if(memory) return memory;
 memory=blank();
 try {
  const meta=wx.getStorageSync(KEY+'-settings');if(meta && GOALS.includes(meta.goal))memory.goal=meta.goal;
  for(const id of ids) {
   const base=wx.getStorageSync(KEY+'-'+id);if(!base)continue;
   const b={words:{},days:base.days,session:base.session};
   for(let i=0;i<32;i++){const part=wx.getStorageSync(KEY+'-'+id+'-'+i);if(part && typeof part==='object')for(const [t,v] of Object.entries(part))if(safeTerm(t))b.words[t]=v;}
   memory.books[id]=sanitize({version:1,books:{[id]:b}}).books[id];
  }
 } catch(e) { warning='部分词库记录读取失败；请先导出备份，勿清理微信数据'; }
 return memory;
}
function save() {
 try {
  const all=load(),write=(key,value)=>{const text=JSON.stringify(value);if(serialized[key]!==text){wx.setStorageSync(key,value);serialized[key]=text;}};
  write(KEY+'-settings',{version:1,goal:all.goal});
  for(const id of ids){const b=all.books[id];if(!b)continue;const parts=Array.from({length:32},()=>({}));for(const [t,v] of Object.entries(b.words))parts[shard(t)][t]=v;for(let i=0;i<32;i++)if(Object.keys(parts[i]).length || serialized[KEY+'-'+id+'-'+i])write(KEY+'-'+id+'-'+i,parts[i]);write(KEY+'-'+id,{version:1,days:b.days,session:b.session});}
  warning=''; return true;
 } catch(e) { warning='本次记录未保存到手机，请腾出空间并导出备份'; wx.showToast({title:'记录未保存，请备份',icon:'none'}); return false; }
}
function book(id) { if(!ids.includes(id)) throw Error('未知词库'); const all=load(); if(!all.books[id]) all.books[id]=fresh(); return all.books[id]; }
function stats(id,now=Date.now()) {
 const b=book(id), records=Object.values(b.words), learned=records.filter(r=>r.last>0);
 return { studied:learned.length,known:learned.filter(r=>r.rating===2).length,due:learned.filter(r=>r.due<=now).length,favorites:records.filter(r=>r.favorite).length,today:(b.days[day(now)]||[]).length,resume:!!(b.session && b.session.at<b.session.queue.length) };
}
function stateOf(id,term) { const b=book(id); return own(b.words,term)?b.words[term]:null; }
function favorite(id,term) { if(!safeTerm(term))return; const b=book(id),r=stateOf(id,term)||{rating:0,last:0,due:0,streak:0,favorite:0}; r.favorite=r.favorite?0:Date.now(); b.words[term]=r; save(); }
function start(id,terms,dictation=false) { const b=book(id); b.session={queue:Array.from(new Set(terms.filter(safeTerm))).slice(0,40),at:0,revealed:false,answer:'',dictation:!!dictation,retries:{}}; save(); return b.session; }
function grade(id,rating,now=Date.now()) {
 const b=book(id),s=b.session; if(!s || !s.revealed || s.at>=s.queue.length || ![0,1,2].includes(rating)) return false;
 const term=s.queue[s.at],old=stateOf(id,term),streak=rating===2?Math.min(10000,(old?old.streak:0)+1):0;
 const days=[1,3,7,14,30]; b.words[term]={rating,last:now,due:now+(rating===0?600000:rating===1?DAY:days[Math.min(streak-1,4)]*DAY),streak,favorite:old?old.favorite:0};
 const d=day(now); if(!b.days[d]) b.days[d]=[]; if(!b.days[d].includes(term)) b.days[d].push(term);
 const retried=own(s.retries,term)?s.retries[term]:0; if(rating===0 && retried<2 && s.queue.length<120) { s.queue.push(term); s.retries[term]=retried+1; }
 s.at++; s.answer=''; s.revealed=false; save(); return true;
}
function select(id,rows,filter='all',query='',now=Date.now()) {
 const q=query.trim().toLowerCase(); return rows.filter(w=>{const r=stateOf(id,w[0]); return (!q || w.join(' ').toLowerCase().includes(q)) && (filter==='all' || filter==='new' && (!r || !r.last) || filter==='due' && r && r.last>0 && r.due<=now || filter==='weak' && r && r.last>0 && r.rating===0 || filter==='favorites' && r && r.favorite || filter==='known' && r && r.last>0 && r.rating===2);});
}
function shuffle(list,random=Math.random) { const result=list.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result; }
function queue(id,rows,kind='daily',now=Date.now()) {
 if(kind!=='daily') return shuffle(select(id,rows,kind,'',now)).slice(0,20).map(w=>w[0]);
 const due=select(id,rows,'due','',now).sort((a,b)=>stateOf(id,a[0]).due-stateOf(id,b[0]).due), unseen=shuffle(select(id,rows,'new','',now));
 const count=Math.max(0,load().goal-stats(id,now).today); return due.concat(unseen).slice(0,Math.min(count,ROUND)).map(w=>w[0]);
}
function exportText() { return JSON.stringify({version:1,application:'pea-exams',goal:load().goal,books:load().books,exportedAt:Date.now()}); }
function merge(text) {
 if(typeof text!=='string' || text.length>8000000) throw Error('备份过大或无效'); const incoming=sanitize(JSON.parse(text)),local=load();
 for(const id of ids) { const src=incoming.books[id]; if(!src)continue; const dest=book(id); for(const [term,r] of Object.entries(src.words)){const old=stateOf(id,term); if(!old || r.last>old.last) dest.words[term]={...r,favorite:Math.max(r.favorite,old?old.favorite:0)}; else old.favorite=Math.max(old.favorite,r.favorite); } for(const [d,list] of Object.entries(src.days)) dest.days[d]=Array.from(new Set([...(dest.days[d]||[]),...list])); }
 if(!save()) throw Error('合并在内存中完成，但未保存，请立即导出');
}
window.PeaExamCore={KEY,DAY,GOALS,ROUND,shuffle,day,load,save,book,stats,stateOf,favorite,start,grade,select,queue,exportText,merge,sanitize,reload(){memory=undefined;serialized={};return load();},getWarning:()=>warning};

})();
