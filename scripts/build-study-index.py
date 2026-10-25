"""Build static search/excerpt/tag sidecars. Never edits original document.json files."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,hashlib
ROOT=Path(__file__).resolve().parent.parent
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,s):self.parts.append(s)
 def handle_starttag(self,tag,attrs):
  if tag=='br':self.parts.append(' ')
def plain(s):
 p=Text();p.feed(s);return re.sub(r'\s+',' ',' '.join(p.parts)).strip()
def norm(s):return re.sub(r'\s+',' ',s).strip()
TOPICS={
 '教育':r'education|schools?|students?|teachers?|universit|教育|学校|学生|教师|大学',
 '环境':r'environment|pollution|climate|recycl|global warming|环境|污染|气候|回收|垃圾',
 '科技':r'technolog|internet|computers?|digital|科技|技术|网络|电脑',
 '工作':r'employment|careers?|workplace|employees?|salary|工作|就业|薪水|职业',
 '健康':r'health|medical|obesity|健康|医疗|肥胖',
 '社会':r'societ|community|crime|government|社会|社区|犯罪|政府',
 '文化':r'cultur|tradition|museums?|language|文化|传统|博物馆|语言',
 '家庭':r'famil|parents?|children|家庭|父母|儿童',
 '交通':r'transport|traffic|commut|railway|交通|通勤|地铁',
 '经济':r'econom|business|advertis|consumer|经济|商业|广告|消费',
 '旅游':r'touris|travel|旅游|旅行',
 '动态图':r'line graph|line chart|trends?|over the.*years|折线|趋势|动态图',
 '静态图':r'bar chart|pie chart|table (?:shows|compares|gives)|柱状图|饼图|表格|静态图',
 '流程图':r'process|life cycle|流程图|生命周期',
 '地图':r'\bmaps?\b|village|地图|村庄|选址',
 '同义替换':r'同义|synonym|paraphras',
 '口语':r'口语|speaking'}
PHRASES=['plays an important role','play an important role','as a result','on the other hand','in contrast','by contrast','is likely to','are likely to','lead to','leads to','contribute to','for example','in conclusion','to some extent','in terms of','compared with','accounted for']
def tags(s):return [k for k,v in TOPICS.items() if re.search(v,s,re.I)]
def sections(blocks):
 groups=[];current=[];blank=0
 for html,text in blocks:
  empty=not text and '<img' not in html and '<table' not in html
  if not empty and blank>=2 and any(t for _,t in current):groups.append(current);current=[]
  current.append((html,text));blank=blank+1 if empty else 0
 if current:groups.append(current)
 if len(groups)>1:return groups
 out=[];current=[];size=0
 for html,text in blocks:
  if current and size+len(text)>3200:out.append(current);current=[];size=0
  current.append((html,text));size+=len(text)
 if current:out.append(current)
 return out
def clean_pdf(text,doc):
 lines=[]
 for line in text.splitlines():
  line=line.strip()
  if not line or re.search(r'[\u2c00-\u2dff\u3400-\u4dbf\ue000-\uf8ff\ufffd]',line):continue
  if doc=='doc-165' and re.search(r'[\u4e00-\u9fff]',line):continue
  if re.fullmatch(r'[\d\s/.,·—_-]+',line) or len(line)<3:continue
  if line.count('.')>14:continue
  lines.append(line)
 text=' '.join(lines)
 sentences=re.split(r'(?<=[.!?。！？])\s+(?=[A-Z\u4e00-\u9fff0-9])',text)
 chunks=[];current=''
 for sentence in sentences:
  if current and len(current)+len(sentence)>650:chunks.append(norm(current));current=''
  current+=(' ' if current else '')+sentence
 if current:chunks.append(norm(current))
 # Extremely long unpunctuated OCR tables are not offered as excerpts.
 return [s for s in chunks if 18<=len(s)<=1800]
def main():
 resource_text=(ROOT/'resources.js').read_text(encoding='utf-8');resources=json.loads(resource_text[resource_text.index('['):resource_text.rindex(']')+1]);meta_text=(ROOT/'study-meta.js').read_text(encoding='utf-8');meta=json.loads(meta_text[meta_text.index('{'):meta_text.rindex('}')+1]);allrows=[];documents={};out=ROOT/'study-data';out.mkdir(exist_ok=True)
 for resource in resources:
  doc=resource.get('readerId')
  if not doc:continue
  d=json.loads((ROOT/'library'/doc/'document.json').read_text(encoding='utf-8'));title=resource.get('title',resource['name']);items=[]
  if d['format']=='PDF':
   units=[(i+1,clean_pdf(t,doc)) for i,t in enumerate(d.get('text',[]))]
  else:
   raw=re.findall(r'<(p|table|h[1-6]|blockquote)\b[^>]*>.*?</\1>',d['html'],re.S)
   # finditer preserves the complete block, including tables and inline markup.
   blocks=[(m.group(0),plain(m.group(0))) for m in re.finditer(r'<(p|table|h[1-6]|blockquote)\b[^>]*>.*?</\1>',d['html'],re.S)]
   units=[(i+1,[t for _,t in group if len(t)>12]) for i,group in enumerate(sections(blocks))]
  doc_tags=set(tags(title+' '+resource.get('group','')+' '+resource['category']))
  for number,paragraphs in units:
   outline=[o for o in meta['outlines'].get(doc,[]) if o['page']<=number];topic=outline[-1]['title'] if outline else ''
   for text in paragraphs:
    identifier=doc+'-'+str(number)+'-'+hashlib.sha1(text.encode()).hexdigest()[:12];localtags=sorted(set(tags(text+' '+topic+' '+resource['category'])));doc_tags.update(localtags)
    row={'id':identifier,'resourceId':doc,'title':title,'topic':topic,'content':text,'tags':localtags,'category':resource['category'],'page':number,'format':d['format'],'path':f'reader.html?v=study-tools&id={doc}&page={number}&excerpt={identifier}#{identifier}','anchor':identifier,'expressions':[p for p in PHRASES if re.search(r'\b'+re.escape(p)+r'\b',text,re.I)]}
    if not any(existing['id']==identifier for existing in items):items.append(row);allrows.append(row)
  documents[doc]={'id':doc,'title':title,'category':resource['category'],'tags':sorted(doc_tags),'readable':bool(items),'format':d['format']}
  if not items:allrows.append({'id':'resource:'+doc,'kind':'resource','resourceId':doc,'title':title,'topic':'','content':'','tags':sorted(doc_tags),'category':resource['category'],'page':1,'format':d['format'],'path':f'reader.html?v=study-tools&id={doc}','anchor':'','expressions':[]})
  (out/(doc+'.json')).write_text(json.dumps({'items':items},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 (ROOT/'search-index.json').write_text(json.dumps({'version':1,'items':allrows},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 (ROOT/'tags-index.json').write_text(json.dumps({'tags':list(TOPICS),'documents':documents},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 print(json.dumps({'documents':len(documents),'searchableExcerpts':len(allrows),'searchBytes':(ROOT/'search-index.json').stat().st_size}))
if __name__=='__main__':main()
