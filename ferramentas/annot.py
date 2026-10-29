import sys,re,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gm import GM
g=GM(sys.argv[1])
O=[n for n,p in g.named('OBJT')]; S=[n for n,p in g.named('SPRT')]; A=[n for n,p in g.named('SOND')]
def o(m): i=int(m.group(2)); return m.group(1)+(O[i] if 0<=i<len(O) else m.group(2))+m.group(3)
def sp(m): i=int(m.group(2)); return m.group(1)+(S[i] if 0<=i<len(S) else m.group(2))
def sn(m): i=int(m.group(2)); return m.group(1)+(A[i] if 0<=i<len(A) else m.group(2))
for line in open(sys.argv[2]):
    line=re.sub(r'((?:instance_create|scr_childbullet|scr_bulletspawner|instance_create_depth|instance_create_layer)\(.*, )(\d+)(\))',o,line)
    line=re.sub(r'((?:i_ex|instance_exists|instance_number|instance_destroy|instance_find)\()(\d+)([,)])',o,line)
    line=re.sub(r'(with \()(\d+)(\))',o,line)
    line=re.sub(r'((?:sprite_index|idlesprite|hurtsprite|sparedsprite|mask_index|\w*sprite\w*) = )(\d+)',sp,line)
    line=re.sub(r'((?:draw_sprite\w*|sprite_get_\w+)\()(\d+)',sp,line)
    line=re.sub(r'((?:snd_play\w*|snd_stop\w*|audio_play_sound\w*|snd_loop\w*|audio_stop_sound|snd_volume|snd_pitch)\()(\d+)',sn,line)
    sys.stdout.write(line)
