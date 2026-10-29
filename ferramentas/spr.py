import sys,os,re; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gm import GM
g=GM(sys.argv[1]); pat=re.compile(sys.argv[2])
for i,x in enumerate(g.sprites()):
    if pat.search(x['name']): print(i,x['name'],x['w'],x['h'],len(x['frames']),'o',x['ox'],x['oy'])
