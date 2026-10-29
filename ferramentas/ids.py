import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from gm import GM
g=GM(sys.argv[1]); kind=sys.argv[2]
L=[n for n,p in g.named(kind)]
for a in sys.argv[3:]: print(a, L[int(a)])
