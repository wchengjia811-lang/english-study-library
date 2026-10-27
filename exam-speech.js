/* Device speech only. An empty voice list does not prove a language is uninstalled. */
(()=>{'use strict';
let current=null;
function supported(){return !!(window.speechSynthesis&&window.SpeechSynthesisUtterance);}
function voices(){try{return window.speechSynthesis.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang));}catch{return [];}}
function cleanup(r){if(!r)return;clearTimeout(r.wait);clearTimeout(r.watch);if(r.listener)window.speechSynthesis.removeEventListener?.('voiceschanged',r.listener);r.listener=null;}
function stop(){const r=current;current=null;cleanup(r);if(supported())window.speechSynthesis.cancel();if(r)r.onState('ended');}
function speak(text,{accent='en-US',slow=false,onState=()=>{},onError=()=>{}}={}){
 if(!supported()){onError('当前浏览器不支持网页朗读，请使用词典发音入口。');return false;}
 stop();const r={onState,onError,wait:null,watch:null,listener:null,started:false};current=r;
 function fail(error){if(current!==r)return;current=null;cleanup(r);window.speechSynthesis.cancel();onState('ended');onError(error==='not-allowed'?'浏览器没有开始播放，请再次点击发音按钮。':'网页朗读暂不可用，请使用词典发音入口，或检查浏览器与设备的语音设置。');}
 function launch(){
  if(current!==r||r.started)return;r.started=true;cleanup(r);
  const available=voices(),selected=available.find(v=>v.lang.replace('_','-').toLowerCase()===accent.toLowerCase())||available[0];
  const u=new window.SpeechSynthesisUtterance(String(text));r.utterance=u;u.lang=selected?.lang||accent;if(selected)u.voice=selected;u.rate=slow?.65:.9;
  u.onstart=()=>{if(current!==r)return;clearTimeout(r.watch);onState('playing',selected?.lang||null);};
  u.onend=()=>{if(current!==r)return;current=null;cleanup(r);onState('ended');};
  u.onerror=e=>{if(current!==r)return;if(['canceled','interrupted'].includes(e.error)){current=null;cleanup(r);onState('ended');}else fail(e.error);};
  r.watch=setTimeout(()=>fail('start-timeout'),12000);
  try{window.speechSynthesis.resume();window.speechSynthesis.speak(u);}catch{fail('synthesis-unavailable');}
 }
 if(voices().length)launch();
 else{
  onState('loading');r.listener=()=>{if(voices().length)launch();};
  window.speechSynthesis.addEventListener?.('voiceschanged',r.listener);
  // Wait for late voices, then try language selection without an explicit voice.
  r.wait=setTimeout(launch,1500);r.listener();
 }
 return true;
}
if(supported())voices();
window.PeaExamSpeech={supported,stop,speak};
})();
