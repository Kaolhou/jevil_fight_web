import sys,os,json,struct,re; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gm import GM
from tex import load_page, write_png
data=sys.argv[1]; out=sys.argv[2]; names=open(sys.argv[3]).read().split()
g=GM(data)
sprs={x['name']:x for x in g.sprites()}
meta={}
# sprites
for n in names:
    if n.startswith('snd:') or n.startswith('fnt:'): continue
    if n not in sprs: print('missing',n); continue
    s=sprs[n]; W,H=s['w'],s['h']; N=len(s['frames'])
    if N==0: print('noframes',n); continue
    img=bytearray(W*N*H*4)
    for f,tp in enumerate(s['frames']):
        t=g.tpag(tp); pw,ph,px=load_page(g,t['page'])
        for yy in range(min(t['sh'],t['th'])):
            sy=t['sy']+yy; dy=t['ty']+yy
            if dy>=H: break
            for xx in range(min(t['sw'],t['tw'])):
                dx=t['tx']+xx
                if dx>=W: break
                si=(sy*pw+t['sx']+xx)*4; di=(dy*W*N+f*W+dx)*4
                img[di:di+4]=px[si:si+4]
    write_png(os.path.join(out,'spr',n+'.png'),W*N,H,img)
    meta[n]=dict(w=W,h=H,n=N,ox=s['ox'],oy=s['oy'])
# fonts
fonts={}
for n,p in g.named('FONT'):
    if 'fnt:'+n not in names: continue
    tp=g.u32(p+28); t=g.tpag(tp); pw,ph,px=load_page(g,t['page'])
    W,H=t['sw'],t['sh']; img=bytearray(W*H*4)
    for yy in range(H):
        si=((t['sy']+yy)*pw+t['sx'])*4; img[yy*W*4:(yy+1)*W*4]=px[si:si+W*4]
    write_png(os.path.join(out,'spr',n+'.png'),W,H,img)
    gl={}
    for q in g.plist(p+52):
        c,x,y,w,h=struct.unpack_from('<5H',g.d,q); sh,off=struct.unpack_from('<hh',g.d,q+10)
        gl[c]=[x,y,w,h,sh,off]
    fonts[n]=dict(size=struct.unpack_from('<f',g.d,p+8)[0],glyphs=gl)
# sounds
groups={0:g}
snds={}
for p in g.chunk_list('SOND'):
    n=g.str_at(g.u32(p))
    if 'snd:'+n not in names: continue
    grp=g.i32(p+28); aid=g.i32(p+32); fn=g.str_at(g.u32(p+12))
    if grp not in groups:
        groups[grp]=GM(os.path.join(os.path.dirname(data),'audiogroup%d.dat'%grp))
    G=groups[grp]
    if aid<0: print('external',n,fn); continue
    a=G.chunk_list('AUDO')[aid]; ln=G.u32(a); blob=G.d[a+4:a+4+ln]
    ext='.ogg' if blob[:4]==b'OggS' else ('.wav' if blob[:4]==b'RIFF' else '.bin')
    open(os.path.join(out,'snd',n+ext),'wb').write(blob)
    snds[n]=n+ext
open(os.path.join(out,'meta.js'),'w').write('window.META='+json.dumps(dict(sprites=meta,fonts=fonts,sounds=snds))+';\n')
mus=os.path.join(os.path.dirname(os.path.dirname(data)),'mus','knight.ogg')
if os.path.exists(mus): open(os.path.join(out,'snd','mus_knight.ogg'),'wb').write(open(mus,'rb').read())
print('ok',len(meta),len(fonts),len(snds))
