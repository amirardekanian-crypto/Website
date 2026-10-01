# The six sound effects used on HCTV3230, synthesised with ffmpeg (no downloads). Run from any folder; $s is where they land.
# Keep them well under the voice (data-volume 0.28-0.50): Amir adds music in Instagram afterwards.
$s = "public\sfx"
New-Item -ItemType Directory -Force $s | Out-Null
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.55*sin(2*PI*1318.5*t)*exp(-7*t)+0.25*sin(2*PI*2637*t)*exp(-10*t)+0.12*sin(2*PI*3951*t)*exp(-14*t)':d=0.8:s=48000" -af "afade=t=in:d=0.003" "$s\ding.wav"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.7*sin(2*PI*(520+300*exp(-30*t))*t)*exp(-28*t)':d=0.25:s=48000" -af "afade=t=in:d=0.002" "$s\pop.wav"
ffmpeg -y -loglevel error -f lavfi -i "anoisesrc=d=0.75:c=pink:r=48000:a=0.9" -af "highpass=f=350,lowpass=f=6500,afade=t=in:d=0.28,afade=t=out:st=0.3:d=0.45,volume=0.9" "$s\whoosh.wav"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.95*sin(2*PI*(55+90*exp(-14*t))*t)*exp(-5.5*t)+0.5*(random(0)-0.5)*exp(-38*t)':d=1.0:s=48000" -af "afade=t=in:d=0.002" "$s\hit.wav"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.65*sin(2*PI*190*t)*exp(-32*t)+0.9*(random(0)-0.5)*exp(-70*t)':d=0.3:s=48000" -af "bandpass=f=1800:width_type=h:w=2500,afade=t=in:d=0.001" "$s\thock.wav"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.9*sin(2*PI*(80+60*exp(-18*t))*t)*exp(-9*t)+0.45*(random(0)-0.5)*exp(-60*t)':d=0.5:s=48000" -af "afade=t=in:d=0.002" "$s\stamp.wav"
# added 2026-10-01 for the broadcast court and the depth family: a footfall and a short upward sweep (a number standing up)
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.75*sin(2*PI*(95+80*exp(-40*t))*t)*exp(-24*t)+0.3*(random(0)-0.5)*exp(-90*t)':d=0.2:s=48000" -af "afade=t=in:d=0.001" "$s\step.wav"
ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.5*sin(2*PI*(260*t+900*t*t))*pow(sin(PI*t/0.55),2)':d=0.55:s=48000" -af "lowpass=f=5200" "$s\rise.wav"
# added 2026-10-01 for the statement cards: tick, roll (an odometer slowing down), swipe (a highlighter pass). They are made by
# `python make_sfx3.py` (kept next to this file as make_sfx3.py), because the roll is a chain of clicks built with a filter graph.
