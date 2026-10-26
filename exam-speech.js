/* Device speech only. No words or progress are sent to a website by this module. */
(()=>{'use strict';
let current=null,notify=null;
function supported(){return !!(window.speechSynthesis&&window.SpeechSynthesisUtterance);}
function stop(){const done=notify;current=null;notify=null;if(supported())window.speechSynthesis.cancel();if(done)done('ended');}
function speak(text,{accent='en-US',slow=false,onState=()=>{},onError=()=>{}}={}){
 if(!supported()){onError('当前浏览器不支持朗读，可打开词典听发音。');return false;}
 const voices=window.speechSynthesis.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
 if(!voices.length){onError('英语语音尚未就绪或未安装，请稍后重试；仍不可用时可打开词典听发音。');return false;}
 stop();const utterance=new window.SpeechSynthesisUtterance(String(text));current=utterance;notify=onState;
 utterance.lang=accent;utterance.voice=voices.find(v=>v.lang.replace('_','-').toLowerCase()===accent.toLowerCase())||voices[0];utterance.lang=utterance.voice.lang||accent;utterance.rate=slow?.65:.9;
 utterance.onstart=()=>{if(current===utterance)onState('playing',utterance.voice.lang);};
 utterance.onend=()=>{if(current===utterance){current=null;notify=null;onState('ended');}};
 utterance.onerror=e=>{if(current!==utterance)return;current=null;notify=null;onState('ended');if(!['canceled','interrupted'].includes(e.error))onError('朗读没有成功，请重试，或打开词典听发音。');};
 try{window.speechSynthesis.resume();window.speechSynthesis.speak(utterance);return true;}catch{current=null;notify=null;onState('ended');onError('设备无法播放英语语音，请打开词典听发音。');return false;}
}
if(supported())window.speechSynthesis.getVoices();
window.PeaExamSpeech={supported,stop,speak};
})();
