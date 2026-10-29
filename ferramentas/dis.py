import sys,struct; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from gm import GM
CMP={1:'<',2:'<=',3:'==',4:'!=',5:'>=',6:'>'}
BIN={0x08:'*',0x09:'/',0x0A:'rem',0x0B:'%',0x0C:'+',0x0D:'-',0x0E:'&',0x0F:'|',0x10:'^',0x13:'<<',0x14:'>>'}
INST={-1:'self',-2:'other',-3:'all',-4:'noone',-5:'global',-6:'builtin',-7:'local',-9:'stacktop',-15:'arg',-16:'static'}
import re as _re
_GOTO=_re.compile(r'goto L([0-9a-f]+)$')
def structure(res, labels):
    """Transforma 'if !c goto L' / 'goto M' em blocos if/else aninhados."""
    items=[]
    tg=sorted(set(int(l[1:],16) for l in labels))
    k=0; prev=-1
    for o,t in res:
        while k<len(tg) and tg[k]<=o:
            if tg[k]>prev: items.append(('L',tg[k],None))
            k+=1
        prev=o; items.append(('S',o,t))
    while k<len(tg): items.append(('L',tg[k],None)); k+=1
    ref={}
    for kind,o,t in items:
        if kind=='S':
            m=_GOTO.search(t)
            if m: ref[int(m.group(1),16)]=ref.get(int(m.group(1),16),0)+1
    out=[]; stack=[]
    def ind(): return '    '*(len(stack)+1)
    def limit(): 
        for b in reversed(stack):
            if b['end'] is not None: return b['end']
        return 1<<40
    i=0
    while i<len(items):
        kind,o,t=items[i]
        if kind=='L':
            while stack and stack[-1]['end']==o:
                stack.pop(); out.append(ind()+'}')
            if ref.get(o,0)>0: out.append(f'L{o:x}:')
            i+=1; continue
        m=_GOTO.search(t)
        if m and (t.startswith('if !') or t.startswith('if ')):
            L=int(m.group(1),16)
            if o<L<=limit():
                cond=t[3:m.start()].strip()
                cond=cond[1:] if cond.startswith('!') else '!('+cond+')'
                out.append(ind()+f'if {cond} {{'); stack.append({'end':L,'kind':'if'}); ref[L]-=1
                i+=1; continue
        if m and t.startswith('goto') and stack and stack[-1]['kind']=='if':
            M=int(m.group(1),16); top=stack[-1]
            nxt=items[i+1] if i+1<len(items) else None
            par=1<<40
            for b in reversed(stack[:-1]):
                if b['end'] is not None: par=b['end']; break
            if nxt and nxt[0]=='L' and nxt[1]==top['end'] and top['end']<M<=par:
                ref[M]-=1
                stack.pop(); out.append(ind()+'} else {'); stack.append({'end':M,'kind':'else'})
                i+=1; continue
        if t.startswith('with ('):
            out.append(ind()+t.split('   //')[0]); stack.append({'end':None,'kind':'with'}); i+=1; continue
        if t.startswith('} // popenv') or t.startswith('} //popenv'):
            if stack and stack[-1]['kind']=='with': stack.pop(); out.append(ind()+'}')
            else: out.append(ind()+'} // popenv')
            i+=1; continue
        out.append(ind()+t); i+=1
    while stack: stack.pop(); out.append(ind()+'}')
    return '\n'.join(out)

class Dis:
    def __init__(s,path):
        s.g=g=GM(path); s.strs=g.strings()
        s.objs=[n for n,p in g.named('OBJT')]
        s.ref={}
        vo,vs=g.ch['VARI']; p=vo+12
        while p+20<=vo+vs:
            name=g.str_at(g.u32(p)); occ=g.u32(p+12); a=g.u32(p+16)
            for i in range(occ):
                s.ref[a]=('v',name)
                if i<occ-1: a+=g.u32(a+4)&0x07FFFFFF
            p+=20
        fo,fs=g.ch['FUNC']; n=g.u32(fo); p=fo+4
        for k in range(n):
            name=g.str_at(g.u32(p)); occ=g.u32(p+4); a=g.u32(p+8)
            for i in range(occ):
                s.ref[a]=('f',name)
                if i<occ-1: a+=g.u32(a)&0x07FFFFFF
            p+=12
        s.code={n:p for n,p in g.named('CODE')}
    def inst(s,v):
        if v in INST: return INST[v]
        if 0<=v<len(s.objs): return s.objs[v]
        return str(v)
    def decomp(s,name):
        g=s.g; p=s.code[name]; ln=g.u32(p+4); rel=g.i32(p+12); off=g.u32(p+16)
        blob=p+12+rel; a=blob+off; end=blob+ln
        st=[]; out=[]; labels=set(); lines=[]
        def pop(): return st.pop() if st else '?'
        bc={}; carry=None; removed=set(); terns=[]
        while a<end:
            while terns and a==terns[-1][0]:
                E,c,v=terns.pop(); e=pop(); st.append(f'({c} ? {v} : {e})')
            if carry and a==carry[1] and (a-blob) in bc:
                conds=bc[a-blob]; w2=g.u32(a); isconst=((w2>>16)&0xFF0F) in (0x840f,0xc00f)
                cv=(w2&0xFFFF) if isconst else None
                lastop=conds[-1][2]; v=carry[2]
                short = isconst and ((lastop==0xB7 and cv==1) or (lastop==0xB8 and cv==0 and not v.lstrip('-').replace('.','',1).isdigit()))
                if not short and len(conds)==1 and lastop==0xB8 and conds[0][3]==len(st):
                    bc.pop(a-blob); removed.add(conds[0][0]); terns.append((carry[0],conds[0][1],v)); carry=None; continue
            if carry and a==carry[1] and (a-blob) in bc and ((g.u32(a)>>16)&0xFF0F) in (0x840f,0xc00f):
                E,F,v=carry; conds=bc.pop(a-blob)
                isand=(g.u32(a)&0xFFFF)==0
                for li,c,o,_d in conds: removed.add(li)
                j=' && ' if isand else ' || '
                st.append('('+j.join([c for li,c,o,_d in conds]+[v])+')')
                a+=4; carry=None; continue
            carry=None
            w=g.u32(a); op=w>>24; t1=(w>>16)&0xF; t2=(w>>20)&0xF; lo=w&0xFFFF; slo=struct.unpack('<h',struct.pack('<H',lo))[0]
            ia=a; a+=4; txt=None
            if op in (0xC0,0xC1,0xC2,0xC3):
                if t1==0: val=repr(round(struct.unpack_from('<d',g.d,a)[0],4)); a+=8
                elif t1==1: val=repr(struct.unpack_from('<f',g.d,a)[0]); a+=4
                elif t1==2: val=str(g.i32(a)); a+=4
                elif t1==3: val=str(struct.unpack_from('<q',g.d,a)[0]); a+=8
                elif t1==4: val=str(g.u32(a)); a+=4
                elif t1==6: val=repr(s.strs[g.u32(a)]); a+=4
                elif t1==15: val=str(slo)
                elif t1==5:
                    r=s.ref.get(ia,('v','?var')); vt=(g.u32(a)>>24)&0xF8; a+=4
                    nm=r[1]
                    if vt in (0x00,0x10,0x90):  # 0x10/0x90: inicio de acesso multidimensional (pushaf/popaf seguem)
                        idx=pop(); ins=pop()
                        if ins=='-9': ins=pop()
                        val=f'{s.ifmt(ins)}{nm}[{idx}]'
                    elif vt==0x80:
                        ins=pop()
                        if ins=='-9': ins=pop()
                        val=f'{s.ifmt(ins)}{nm}'
                    else:
                        pre='' if op in(0xC1,) else ('global.' if op==0xC2 else ('' if slo in(-1,-6,-7) else s.inst(slo)+'.'))
                        val=pre+nm
                else: val='?'
                st.append(val)
            elif op==0x84: st.append(str(slo))
            elif op==0x45:
                if t1==15: txt=f'/*swap {lo}*/'
                else:
                    r=s.ref.get(ia,('v','?var')); vt=(g.u32(a)>>24)&0xF8; a+=4; nm=r[1]
                    if vt==0x00:
                        if t1==5:
                            idx=pop(); ins=pop()
                            if ins=='-9': ins=pop()
                            val=pop()
                        else:
                            val=pop(); idx=pop(); ins=pop()
                            if ins=='-9': ins=pop()
                        tgt=f'{s.ifmt(ins)}{nm}[{idx}]'
                    elif vt==0x80:
                        if t1==5:
                            ins=pop()
                            if ins=='-9': ins=pop()
                            val=pop()
                        else:
                            val=pop(); ins=pop()
                            if ins=='-9': ins=pop()
                        tgt=f'{s.ifmt(ins)}{nm}'
                    else:
                        val=pop(); tgt=('' if slo in(-1,-6,-7) else s.inst(slo)+'.')+nm
                        if slo==-5: tgt='global.'+nm
                    txt=f'{tgt} = {val}'
            elif op in BIN: b=pop(); x=pop(); st.append(f'({x} {BIN[op]} {b})')
            elif op==0x11: st.append(f'-{pop()}')
            elif op==0x12: st.append(f'!{pop()}')
            elif op==0x07: pass
            elif op==0x15: b=pop(); x=pop(); st.append(f'({x} {CMP.get((w>>8)&0xFF,"?")} {b})')
            elif op==0x86:
                if t1==15 or (lo>>8): txt=f'/*dupswap {lo:x}*/'
                else:
                    n=(lo&0xFF)+1
                    if t1==2 and (lo&0xFF)==4 and st and st[-1]=='-9': n=2
                    elif t1==2 and (lo&0xFF)==4: n=2
                    st.extend(st[-n:] if len(st)>=n else ['?']*n)
            elif op==0x9C: txt=f'return {pop()}'
            elif op==0x9D: txt='exit'
            elif op==0x9E: txt=f'{pop()}'
            elif op in (0xB6,0xB7,0xB8,0xBA,0xBB):
                o=w&0x7FFFFF
                if o&0x400000: o-=0x800000
                tgt=ia+o*4; L=f'L{tgt-blob:x}'; labels.add(L)
                if op==0xB6:
                    if st and (op==0xB6):
                        carry=(tgt,a,pop()); continue
                    txt=f'goto {L}'
                elif op==0xB7:
                    c=pop(); bc.setdefault(tgt-blob,[]).append((len(lines),c,op,len(st))); txt=f'if {c} goto {L}'
                elif op==0xB8:
                    c=pop(); bc.setdefault(tgt-blob,[]).append((len(lines),c,op,len(st))); txt=f'if !{c} goto {L}'
                elif op==0xBA:
                    x=pop()
                    if x=='-9': x=pop()
                    txt=f'with ({s.inst(int(x)) if x.lstrip("-").isdigit() else x}) {{   // end {L}'
                else: txt=f'}} // popenv' if (w&0x7FFFFF)!=0xF00000&0x7FFFFF else '} //popenv-exit'
            elif op==0xD9:
                r=s.ref.get(ia+4,('f','?fn')); a+=4
                args=[pop() for _ in range(lo)]
                st.append(f'{r[1]}({", ".join(args)})')
            elif op==0x99:
                fn=pop(); this=pop(); args=[pop() for _ in range(lo)]
                st.append(f'{this}.{fn}({", ".join(args)})')
            elif op==0xFF:
                if t1==2: a+=4
                if slo==-11: st.append(f'ref{g.i32(a-4)&0xFFFFFF}')
                elif slo==-2: i=pop(); arr=pop(); st.append(f'{arr}[{i}]')
                elif slo==-3: i=pop(); arr=pop(); val=pop(); txt=f'{arr}[{i}] = {val}'
                elif slo==-4: i=pop(); arr=pop(); st.append(f'{arr}[{i}]')
                elif slo==-5: pop()
                elif slo==-6: st.append('isstaticok')
                elif slo==-10: st.append(f'isnullish({st[-1] if st else "?"})')
            else: txt=f'/*op {op:x} {w:08x}*/'
            if txt is not None: lines.append((ia-blob,txt))
        res=[(o,t) for i,(o,t) in enumerate(lines) if i not in removed]
        return structure(res, labels)
    def ifmt(s,ins):
        try: v=int(ins)
        except: return f'{ins}.'
        if v in(-1,-6,-7): return ''
        return s.inst(v)+'.'
if __name__=='__main__':
    D=Dis(sys.argv[1]); import re
    pat=re.compile(sys.argv[2])
    for n in D.code:
        if pat.search(n):
            print('=====',n); print(D.decomp(n))
