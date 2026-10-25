"""Conservative, deterministic normalization for extracted Chinese/English text."""
import re,unicodedata
RADICALS={'⺠':'民','⻅':'见','⻋':'车'}
PUNCT=set('，。！？：；、（）【】《》“”‘’—–…·°£€¥×÷≤≥±•●○■□◆◇★☆✓✔✗→←↑↓©®')
def normalize_text(text):
 chars=list(text);out=[]
 for i,c in enumerate(chars):
  n=RADICALS.get(c,unicodedata.normalize('NFKC',c));decorated='\u2e80'<=c<='\u2fd5' or '\uf900'<=c<='\ufaff'
  following=RADICALS.get(chars[i+1],unicodedata.normalize('NFKC',chars[i+1])) if i+1<len(chars) else ''
  if decorated and len(n)==1 and '\u4e00'<=n<='\u9fff' and (following==n or out and out[-1]==n):continue
  out.append(n)
 normalized=re.sub(r'\s+',' ',unicodedata.normalize('NFKC',''.join(out))).strip()
 return re.sub(r'\bp\s+o\s+r\s+t\s+r\s+a\s+y\s+a\s+l\b','portrayal',normalized,flags=re.I)
def problems(text):
 reasons=[]
 if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]',text):reasons.append('control')
 if re.search(r'Ã.|Â.|â€|ï¿|锟斤|烫烫|屯屯',text):reasons.append('encoding')
 if re.search(r'(?:\b[a-z]\s+){5,}',text):reasons.append('letter_spacing')
 for c in text:
  if c.isspace() or 32<=ord(c)<=126 or '\u4e00'<=c<='\u9fff' or c in PUNCT:continue
  if 0xc0<=ord(c)<=0xff and unicodedata.category(c).startswith('L'):continue
  reasons.append('unexpected_glyph');break
 return reasons
def clean_text(text):
 normalized=normalize_text(text)
 return None if problems(normalized) else normalized
