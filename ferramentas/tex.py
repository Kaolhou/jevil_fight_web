import sys,os,struct,bz2,zlib; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gm import GM
S2=[0,1,-2,-1]; S4=[i if i<8 else i-16 for i in range(16)]; S5=[i if i<16 else i-32 for i in range(32)]
def qoi_decode(d,w,h):
    # GameMaker variant (fioq)
    assert d[:4]==b'fioq', d[:4]
    ln=struct.unpack_from('<I',d,8)[0]
    pos=12; end=12+ln
    out=bytearray(w*h*4)
    r=g=b=0; a=255; idx=[0]*256; run=0
    o=0; n=w*h*4
    dd=d
    while o<n:
        if run>0: run-=1
        elif pos<end:
            b1=dd[pos]; pos+=1
            if (b1&0xC0)==0x00:
                i=(b1&0x3F)<<2; r=idx[i]; g=idx[i+1]; b=idx[i+2]; a=idx[i+3]
            elif (b1&0xE0)==0x40: run=b1&0x1F
            elif (b1&0xE0)==0x60:
                b2=dd[pos]; pos+=1; run=(((b1&0x1F)<<8)|b2)+32
            elif (b1&0xC0)==0x80:
                r=(r+S2[(b1>>4)&3])&255; g=(g+S2[(b1>>2)&3])&255; b=(b+S2[b1&3])&255
            elif (b1&0xE0)==0xC0:
                b2=dd[pos]; pos+=1; m=(b1<<8)|b2
                r=(r+S5[(m>>8)&31])&255; g=(g+S4[(m>>4)&15])&255; b=(b+S4[m&15])&255
            elif (b1&0xF0)==0xE0:
                b2=dd[pos]; b3=dd[pos+1]; pos+=2; m=(b1<<16)|(b2<<8)|b3
                r=(r+S5[(m>>15)&31])&255; g=(g+S5[(m>>10)&31])&255; b=(b+S5[(m>>5)&31])&255; a=(a+S5[m&31])&255
            else:
                if b1&8: r=dd[pos]; pos+=1
                if b1&4: g=dd[pos]; pos+=1
                if b1&2: b=dd[pos]; pos+=1
                if b1&1: a=dd[pos]; pos+=1
            i=((r^g^b^a)&63)<<2; idx[i]=r; idx[i+1]=g; idx[i+2]=b; idx[i+3]=a
        out[o]=r; out[o+1]=g; out[o+2]=b; out[o+3]=a; o+=4
    return out
def load_page(g,i,cache={}):
    if i in cache: return cache[i]
    p=g.chunk_list('TXTR')[i]; w=g.u32(p+12); h=g.u32(p+16); o=g.u32(p+24)
    d=g.d
    if d[o:o+4]==b'2zoq':
        W,H=struct.unpack_from('<HH',d,o+4)
        bz=d[o+12:]
        dec=bz2.BZ2Decompressor(); q=dec.decompress(bz)
        px=qoi_decode(q,W,H)
    elif d[o:o+4]==b'fioq':
        W,H=struct.unpack_from('<HH',d,o+4); px=qoi_decode(d[o:],W,H)
    elif d[o:o+8]==b'\x89PNG\r\n\x1a\n':
        raise Exception('png page not supported')
    cache[i]=(W,H,px); return cache[i]
def write_png(path,w,h,rgba):
    raw=b''.join(b'\0'+bytes(rgba[y*w*4:(y+1)*w*4]) for y in range(h))
    def chunk(t,data): c=t+data; return struct.pack('>I',len(data))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    open(path,'wb').write(png)
if __name__=='__main__':
    import time
    g=GM(sys.argv[1]); t=time.time(); W,H,px=load_page(g,int(sys.argv[2])); print(W,H,time.time()-t)
    write_png(sys.argv[3],W,H,px)
