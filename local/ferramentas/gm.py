import struct
class GM:
    def __init__(s,path):
        s.d=d=open(path,'rb').read(); s.ch={}
        p=8
        while p<len(d):
            n=d[p:p+4].decode(); sz=struct.unpack_from('<I',d,p+4)[0]; s.ch[n]=(p+8,sz); p+=8+sz
    def u32(s,o): return struct.unpack_from('<I',s.d,o)[0]
    def i32(s,o): return struct.unpack_from('<i',s.d,o)[0]
    def str_at(s,o):
        if o==0: return None
        e=s.d.index(b'\0',o); return s.d[o:e].decode('utf8','replace')
    def plist(s,o):
        n=s.u32(o); return [s.u32(o+4+4*i) for i in range(n)]
    def chunk_list(s,name): return s.plist(s.ch[name][0])
    def strings(s):
        return [s.d[p+4:p+4+s.u32(p)].decode('utf8','replace') for p in s.chunk_list('STRG')]
    def tpag(s,o):
        v=struct.unpack_from('<11H',s.d,o)
        return dict(sx=v[0],sy=v[1],sw=v[2],sh=v[3],tx=v[4],ty=v[5],tw=v[6],th=v[7],bw=v[8],bh=v[9],page=v[10])
    def sprites(s):
        out=[]
        for p in s.chunk_list('SPRT'):
            name=s.str_at(s.u32(p)); w,h=s.u32(p+4),s.u32(p+8)
            ox,oy=s.i32(p+48),s.i32(p+52)
            q=p+56
            frames=[];speed=None
            if s.i32(q)==-1:
                ver=s.u32(q+4); typ=s.u32(q+8); speed=struct.unpack_from('<f',s.d,q+12)[0]; stype=s.u32(q+16)
                q+=20
                if ver>=2: q+=4
                if ver>=3: q+=4
                if typ!=0: out.append(dict(name=name,w=w,h=h,ox=ox,oy=oy,frames=[],speed=speed,type=typ)); continue
            else: stype=None
            frames=s.plist(q)
            out.append(dict(name=name,w=w,h=h,ox=ox,oy=oy,frames=frames,speed=speed,stype=stype))
        return out
    def named(s,chunk):
        return [(s.str_at(s.u32(p)),p) for p in s.chunk_list(chunk)]
