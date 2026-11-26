'use strict';

// Atmospheric paint is separate from the specimen and shares its timeline.
const MorphWorld = (() => {
  const canvas = document.querySelector('#scene-world');
  let ctx;
  try { ctx = canvas?.getContext('2d'); }
  catch { /* The exhibits supply their own visual fallbacks. */ }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = 2 * Math.PI;
  const clamp = n => Math.min(1, Math.max(0, n));
  const mix = (a,b,t) => a+(b-a)*t;
  const ease = (a,b,t) => {
    const q = clamp((t-a)/(b-a));
    return q*q*(3-2*q);
  };
  const seed = index => {
    const n = Math.sin(index*127.1+13.1)*43758.5453123;
    return n-Math.floor(n);
  };
  const stars = Array.from({length:81},(_,i)=>({
    x:seed(i*3+1),y:seed(i*3+2),depth:seed(i*3+3),r:.35+seed(i+511)*.70
  }));
  const digits = Array.from({length:28},(_,i)=>({
    x:(i+.32+seed(i+102)*.45)/28, y:seed(i+70)*33,
    depth:.3+seed(i+30)*.7, start:seed(i+880)
  }));
  let width=0,height=0,current,key='',frame=0,clock=0,previousTime=null;

  function animate(now) {
    frame=0;
    if(current?.topic!=='neural-networks'||motion.matches||document.hidden){
      previousTime=null;
      return;
    }
    if(previousTime!==null)clock+=Math.min(now-previousTime,60)/1000;
    previousTime=now;
    paint();
  }

  function resize() {
    if(!ctx)return;
    width=document.documentElement.clientWidth;
    height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,1.35,Math.sqrt(1_350_000/Math.max(1,width*height)));
    canvas.width=Math.max(1,Math.round(width*ratio));
    canvas.height=Math.max(1,Math.round(height*ratio));
    ctx.setTransform(canvas.width/Math.max(1,width),0,0,canvas.height/Math.max(1,height),0,0);
    key='';
    paint();
  }

  function paint() {
    if(!ctx)return;
    const { topic,u,p,centre }=current||{};
    const moving=topic==='neural-networks'&&u===1&&!motion.matches&&!document.hidden;
    if(moving&&!frame)frame=requestAnimationFrame(animate);
    const tick=moving?Math.floor(clock*22):0;
    const next=[topic,u,p,centre?.x,centre?.y,centre?.radius,centre?.shadowRadius,motion.matches,tick].join('|');
    if(key===next)return;
    key=next;
    canvas.hidden=!topic;
    ctx.clearRect(0,0,width,height);
    if(!topic)return;
    const reveal=ease(.015,.80,u);
    const scroll=motion.matches?0:p;
    if(topic==='black-hole')drawStars(reveal,scroll,centre);
    else if(topic==='neural-networks')drawDigits(reveal,u,scroll,tick/22);
    else if(topic==='dna')drawPairs(reveal,scroll);
    ctx.globalAlpha=1;
  }

  function drawStars(reveal,p,g) {
    const x0=g?.x??width*.5, y0=g?.y??height*.52, r=g?.radius??width*.22;
    const shadow = r * (g?.shadowRadius ?? .27);
    for(const star of stars){
      const x=star.x*width, y=(star.y+.022*p*star.depth)%1*height;
      const dx=x-x0,dy=y-y0,d=Math.hypot(dx,dy);
      // A restrained displacement of the background near the lens. The
      // foreground and the apparent shadow stay clear of the star layer.
      const shift=.17*shadow*reveal*Math.exp(-(((d-shadow*1.15)/(shadow*.64))**2));
      const near=1-ease(shadow*.94,r*.96,d);
      const edge=ease(.25,.48,Math.abs(star.x-.5));
      ctx.globalAlpha=reveal*(.028+.17*edge)*(.34+.66*star.depth)*(1-near*.95);
      ctx.fillStyle=star.depth>.7?'#f1d6ae':'#b9cadf';
      ctx.beginPath();
      ctx.arc(x+shift*dx/Math.max(1,d),y+shift*dy/Math.max(1,d),star.r,0,TAU);
      ctx.fill();
    }
  }

  function drawPairs(reveal,p) {
    for(let i=0;i<12;i++){
      const x=seed(i+741)*width,y=(seed(i+402)+p*.11)%1*height;
      const peripheral=ease(.25,.50,Math.abs(x/width-.5));
      if(!peripheral)continue;
      ctx.globalAlpha=reveal*peripheral*.12;
      ctx.strokeStyle=i%2?'#9ab690':'#879ba2';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.arc(x,y,7,0,TAU);
      ctx.arc(x+22,y-9,4,0,TAU);
      ctx.moveTo(x+7,y-2);ctx.lineTo(x+18,y-7);
      ctx.stroke();
    }
  }

  function drawDigits(reveal,u,p,time) {
    ctx.font='12px Geist, system-ui, sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle='#8cd7a2';
    const row=22;
    const rows=Math.ceil(height/row)+2;
    const settle=mix(.86,.62,ease(.55,1,u));
    for(const [index,column] of digits.entries()){
      const edge=ease(.23,.48,Math.abs(column.x-.5));
      const density=width<550?.68:1;
      if(edge===0||column.start>density)continue;
      const drift=time*(index%3===0?-1:1)*(.32+.78*column.depth);
      const head=(column.y+14*(u-1)*column.depth+p*15*column.depth+drift)%rows;
      for(let i=0;i<rows;i++){
        const y=(((head+i)%rows+rows)%rows)*row-17;
        const pattern=seed(index*69+i+1000);
        if(pattern<.33||y<0||y>height)continue;
        ctx.globalAlpha=edge*reveal*settle*column.depth*(.22+.49*pattern);
        const bit=seed(index*345+i*91+Math.floor(time*(.7+column.depth)+pattern*5));
        ctx.fillText(bit>.5?'1':'0',column.x*width,y);
      }
    }
  }

  function update(topic,u,p,centre) {
    if(topic!==current?.topic){clock=0;previousTime=null;}
    current={topic,u,p,centre};
    paint();
  }
  function transition(topic,u,source,target) {
    let centre;
    if(topic==='black-hole'&&source&&target){
      const end=MorphBlackHole.geometry(target.width,target.height);
      const q=ease(.13,.91,u);
      centre={
        x:mix(source.left+source.width*.5,target.left+end.x,q),
        y:mix(source.top+source.height*.5,target.top+end.y,q),
        radius:end.radius,
        shadowRadius:end.shadowRadius
      };
    }
    update(topic,u,0,centre);
  }
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{previousTime=null;paint();});
  motion.addEventListener('change',paint);
  resize();
  return {transition,live:(topic,p,centre)=>update(topic,1,p,centre)};
})();
