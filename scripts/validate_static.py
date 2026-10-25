from pathlib import Path
import json,re
from excerpt_quality import problems,normalize_text,clean_text
ROOT=Path(__file__).resolve().parent.parent
def main():
 data=json.loads((ROOT/'search-index.json').read_text(encoding='utf-8'));ids=[x['id'] for x in data['items']];assert len(ids)==len(set(ids))
 for row in data['items']:
  assert (row['content'] or row.get('kind')=='resource') and row['path'].startswith('reader.html?')
  assert not re.search(r'[\u2c00-\u2dff\u3400-\u4dbf\ue000-\uf8ff\ufffd]',row['content'])
  assert not problems(row['content']),row['id']
  assert row['content']==normalize_text(row['content']),row['id']
  assert clean_text(row['content'])==row['content'],row['id']
 pages=list(ROOT.glob('*.html'))
 for file in pages:
  f=file.name
  text=(ROOT/f).read_text(encoding='utf-8')
  for target in re.findall(r'(?:src|href)="([^"?#]+)',text):
   if ':' not in target and not target.startswith('#'):assert (ROOT/target).exists(),(f,target)
 assert len(re.findall(r'class="source-entry"',(ROOT/'sources.html').read_text(encoding='utf-8')))==51
 for file in pages:
  text=file.read_text(encoding='utf-8')
  for target in re.findall(r'(?:src|href)="([^"#?]+)',text):
   if ':' not in target and not target.startswith('#'):assert (ROOT/target).exists(),(file.name,target)
 assert (ROOT/'robots.txt').exists() and (ROOT/'sitemap.xml').exists()
 print(json.dumps({'validatedSearchEntries':len(ids),'pages':len(pages),'sourceRecords':51}))
if __name__=='__main__':main()
