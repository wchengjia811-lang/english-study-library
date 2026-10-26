"""Produce an offline ZIP with a file:// data adapter; no network or server needed."""
from pathlib import Path
import json,zipfile,argparse
ROOT=Path(__file__).resolve().parent.parent
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args();output=Path(args.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
 data={}
 for path in [ROOT/'search-index.json',ROOT/'tags-index.json',*sorted((ROOT/'exam-data').glob('*.json')),*sorted((ROOT/'study-data').glob('*.json')),*sorted((ROOT/'library').glob('*/document.json'))]:data[path.relative_to(ROOT).as_posix()]=json.loads(path.read_text(encoding='utf-8'))
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for path in ROOT.rglob('*'):
   rel=path.relative_to(ROOT)
   if not path.is_file() or any(part.startswith('.') for part in rel.parts) or rel.parts[0] in ('scripts','tests') or path.suffix in ('.zip','.py') or path.resolve()==output:continue
   z.write(path,rel.as_posix())
  z.writestr('offline-data.js','window.PEA_OFFLINE='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';')
  z.writestr('开始阅读.txt','完整解压后，用电脑浏览器打开 index.html。无需启动服务器。\n收藏和背诵记录只存在当前浏览器，和在线版互不共享。\n')
 print(json.dumps({'zip':str(output),'bytes':output.stat().st_size,'dataFiles':len(data)}))
if __name__=='__main__':main()
