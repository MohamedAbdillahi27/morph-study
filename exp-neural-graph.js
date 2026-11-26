'use strict';

const MorphNeuralGraph = (() => {
  const math = MorphNeural;
  const opening = math.calculate();
  const ns = 'http://www.w3.org/2000/svg';
  const inputs = ['Edge', 'Texture', 'Brightness'];
  const outputs = ['Pattern A', 'Pattern B'];
  const nodeNames = [...inputs, 'Hidden 1', 'Hidden 2', 'Hidden 3', 'Hidden 4', ...outputs];
  const positive = '#87dbaa';
  const negative = '#e5a58e';
  const paper = '#1c2822';
  const outline = '#87a597';
  const pillInk = '#dfdedb';
  const TAU = 2 * Math.PI;
  const steps = 36;
  const mix = (a,b,t) => a + (b-a)*t;
  const fraction = (a,b,q) => {
    const t = math.phase(q,a,b);
    return t*t*(3-2*t);
  };
  const number = value => Number(value.toFixed(4)).toString().replace('-', '−');
  function percentages(data) {
    const first = Math.round(data.probabilities[0] * 1000);
    return [first,1000-first].map(value => (value/10).toFixed(1) + '%');
  }
  function svg(tag, attrs = {}) {
    const node = document.createElementNS(ns,tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    return node;
  }
  function label(className, text = '') {
    const node = svg('text', {class:className, 'text-anchor':'middle','dominant-baseline':'central'});
    node.textContent = text;
    return node;
  }
  function place(node,x,y) {
    node.setAttribute('x',x);
    node.setAttribute('y',y);
  }
  function sample(fn) {
    return Array.from({length:steps+1},(_,i)=>fn(i/steps));
  }
  function distance(a,b) { return Math.hypot(a[0]-b[0],a[1]-b[1]); }
  function segments(points) {
    const lengths = [0];
    for(let i=1;i<points.length;i++) lengths.push(lengths[i-1]+distance(points[i],points[i-1]));
    const length = lengths.at(-1);
    return {
      at(p) {
        const target = length*p;
        const end = lengths.findIndex(value=>value>=target);
        if(end<=0) return points[end===0?0:points.length-1];
        const t = (target-lengths[end-1])/(lengths[end]-lengths[end-1] || 1);
        return points[end-1].map((value,axis)=>mix(value,points[end][axis],t));
      }
    };
  }
  function path(points, closed = false) {
    return 'M'+points.map(point=>point.map(x=>x.toFixed(2)).join(',')).join('L')+(closed?'Z':'');
  }

  function computeNeuralOpeningGeometry(width,height) {
    const compact = width<520;
    const columns = (compact?[.166,.50,.834]:[.162,.50,.838]).map(x=>x*width);
    const upper = compact?52:68;
    const usable = height-upper-(compact?28:36);
    const radius = Math.min(compact?26:37,width*(compact?.074:.063),usable*.115);
    const rows = [[.16,.50,.84],[.075,.358,.642,.925],[.30,.70]];
    const nodes = rows.flatMap((layer,col)=>layer.map((row,index)=>({
      id:'node-'+([0,3,7][col]+index), x:columns[col], y:upper+usable*row,
      r:radius*(col===1?.89:1), layer:col
    })));
    nodes.forEach(node=>{
      node.contour=sample(p=>[node.x+node.r*Math.cos(TAU*p),node.y+node.r*Math.sin(TAU*p)]);
      node.d=path(node.contour,true);
    });
    const edges = math.edges.map(edge=>{
      const a=nodes[edge.from], b=nodes[edge.to];
      const start=[a.x+a.r*.955,a.y], end=[b.x-b.r*.955,b.y];
      const run=(end[0]-start[0])*.45;
      const curve=sample(t=>{
        const s=1-t;
        return [s*s*s*start[0]+3*s*s*t*(start[0]+run)+3*s*t*t*(end[0]-run)+t*t*t*end[0],
          s*s*s*start[1]+3*s*s*t*start[1]+3*s*t*t*end[1]+t*t*t*end[1]];
      });
      const measure=segments(curve);
      const contour=sample(measure.at);
      return {...edge, contour, at:measure.at,d:path(contour)};
    });
    return { width,height,compact,columns,nodes,edges };
  }

  function create() {
    const root=svg('svg',{class:'nn-svg',role:'group','aria-label':'Neural network with three inputs, four hidden neurons and two outputs'});
    const overlay=svg('g',{'aria-hidden':'true',class:'nn-source-ink'});
    const edgesLayer=svg('g');
    const hitsLayer=svg('g');
    const nodesLayer=svg('g');
    const headings=['Inputs','Hidden layer','Outputs'].map(name=>label('nn-layer-label',name));
    const headers=svg('g',{'aria-hidden':'true'});
    headers.append(...headings);
    const paperPath=svg('path',{fill:'#efeeec'});
    const sourceText=label('nn-source-text');
    sourceText.setAttribute('text-anchor','start');
    const textClip=svg('clipPath',{id:'nn-source-clip'});
    const textWindow=svg('rect');
    textClip.append(textWindow);
    const inkGroup=svg('g',{'clip-path':'url(#nn-source-clip)'});
    inkGroup.append(sourceText);
    const arrow=svg('path',{fill:'none',stroke:'#292827','stroke-width':1.65,'stroke-linecap':'round','stroke-linejoin':'round'});
    const handle=svg('path',{fill:'none',stroke:'#716b61','stroke-width':1.4});
    const edgeViews=math.edges.map(edge=>{
      const visible=svg('path',{class:'nn-edge',fill:'none'});
      const pulse=svg('g',{class:'nn-pulse',visibility:'hidden','aria-hidden':'true'});
      const dot=svg('circle',{r:6});
      const mark=label('nn-pulse-label',edge.weight<0?'−':'+');
      pulse.append(dot,mark);
      edgesLayer.append(visible,pulse);
      const hit=svg('path',{class:'nn-edge-hit',role:'button','data-part':edge.id,
        tabindex:-1,'aria-label':'Weight from '+nodeNames[edge.from]+' to '+nodeNames[edge.to]});
      hitsLayer.append(hit);
      return {visible,pulse,dot,mark,hit};
    });
    const nodeViews=nodeNames.map((name,i)=>{
      const group=svg('g',{class:'nn-node',role:'button',tabindex:i===0?0:-1,'data-part':'node-'+i});
      const target=svg('circle',{class:'nn-node-hit',fill:'transparent'});
      const disc=svg('path',{class:'nn-disc'});
      const pulse=svg('circle',{fill:'none',stroke:positive,'stroke-width':1.35,visibility:'hidden','aria-hidden':'true'});
      const text=label('nn-node-name',i<3?name:i<7?'h'+(i-2):name);
      const value=label('nn-node-value');
      group.append(target,pulse,disc,text,value);
      nodesLayer.append(group);
      return {group,target,disc,pulse,text,value};
    });
    overlay.append(textClip,inkGroup,arrow,handle);
    root.append(paperPath,edgesLayer,hitsLayer,nodesLayer,headers,overlay);

    function layout(graph) {
      root.setAttribute('viewBox','0 0 '+graph.width+' '+graph.height);
      headings.forEach((label,index)=>place(label,graph.columns[index],24));
      graph.edges.forEach((edge,index)=>{
        edgeViews[index].visible.setAttribute('d',edge.d);
        edgeViews[index].hit.setAttribute('d',edge.d);
      });
      graph.nodes.forEach((node,index)=>{
        const view=nodeViews[index];
        view.disc.setAttribute('d',node.d);
        view.target.setAttribute('cx',node.x);
        view.target.setAttribute('cy',node.y);
        view.target.setAttribute('r',Math.max(22,node.r+3));
        view.pulse.setAttribute('cx',node.x);
        view.pulse.setAttribute('cy',node.y);
        place(view.text,node.x,node.y-(index<3?8:0));
        place(view.value,node.x,node.y+9);
      });
    }

    function paint(graph, values, data, p, selected='', quiet=false, weights=math.weights) {
      overlay.setAttribute('visibility','hidden');
      paperPath.setAttribute('visibility','hidden');
      headers.setAttribute('opacity',1);
      const scores=percentages(data);
      const hiddenReady=math.phase(p,.392,.485);
      const activation=math.phase(p,.532,.61);
      const outputReady=math.phase(p,.775,.823);
      const normalized=math.phase(p,.827,.88);
      const shownHidden=activation>=.48?data.hidden:data.hiddenSums;
      const selectedEdge=graph.edges.find(edge=>edge.id===selected);
      graph.edges.forEach((edge,index)=>{
        const view=edgeViews[index];
        const weight=weights[edge.from][edge.column];
        const color=weight<0?negative:weight>0?positive:outline;
        const hot=math.signalAt(edge,p);
        const inFocus=selected===edge.id || selected==='node-'+edge.from || selected==='node-'+edge.to;
        const present=hot>0&&hot<1;
        const source=edge.layer?data.hidden[edge.from-3]:values[edge.from];
        const contribution=source*weight;
        view.visible.setAttribute('stroke',color);
        view.visible.setAttribute('stroke-width',(inFocus?2.9:1.05)+Math.abs(weight)*.62);
        view.visible.setAttribute('stroke-dasharray',weight<0?'4 5':weight===0?'1 5':'none');
        view.visible.setAttribute('opacity',selected?(inFocus?.94:.16):present?.81:.32);
        view.pulse.setAttribute('visibility',!quiet&&present&&contribution!==0?'visible':'hidden');
        if(!quiet&&present&&contribution!==0){
          const [x,y]=edge.at(hot);
          view.pulse.setAttribute('transform','translate('+x+' '+y+')');
          view.pulse.removeAttribute('opacity');
          view.dot.setAttribute('fill',color);
          view.dot.setAttribute('r',3.5+Math.min(1,Math.abs(contribution))*3);
          view.mark.textContent=weight<0?'−':'+';
        }
      });
      graph.nodes.forEach((node,index)=>{
        const view=nodeViews[index];
        const chosen=selected===node.id || selectedEdge?.from===index || selectedEdge?.to===index;
        const focus=chosen || (index<3&&p>.10&&p<.38);
        const ready=index<3?1:index<7?hiddenReady:outputReady;
        const value=index<3?number(values[index]):index<7?number(shownHidden[index-3]):
          normalized>.44?scores[index-7]:number(data.logits[index-7]);
        const strength=index<3?values[index]:index<7?Math.abs(shownHidden[index-3]):data.probabilities[index-7];
        const name=index<3?(index===2&&graph.compact?'Light':inputs[index]):index<7?'h'+(index-2):outputs[index-7];
        const pulse=math.phase(p,.102+index*.012,.215);
        const pulseVisible=index<3&&!quiet&&pulse>0&&pulse<1;
        view.pulse.setAttribute('visibility',pulseVisible?'visible':'hidden');
        if(pulseVisible) {
          view.pulse.setAttribute('r',node.r+mix(2,13,pulse));
          view.pulse.setAttribute('opacity',Math.sin(Math.PI*pulse)*.54);
        }
        view.disc.setAttribute('fill',ready>0&&index>=3?
          blend(paper,index<7&&shownHidden[index-3]<0?'#543b33':'#2b4b3b',Math.min(1,strength)*ready):paper);
        view.disc.setAttribute('stroke',focus?positive:outline);
        view.disc.setAttribute('stroke-width',chosen?2.65:1.28);
        view.text.setAttribute('opacity',1);
        view.value.setAttribute('opacity',ready);
        view.text.textContent=name;
        view.value.textContent=value;
        place(view.text,node.x,node.y-mix(0,9,ready));
        place(view.value,node.x,node.y+9);
        view.group.setAttribute('aria-label',nodeNames[index]+(ready>.5?', '+value:''));
        view.group.setAttribute('aria-pressed',String(selected===node.id));
      });
    }

    function blend(a,b,t) {
      const rgb = color => color.slice(1).match(/../g).map(channel=>parseInt(channel,16));
      return 'rgb('+rgb(a).map((channel,i)=>Math.round(mix(channel,rgb(b)[i],t))).join(',')+')';
    }

    function pill(source,p) {
      const r=source.height/2-.5;
      const row=source.width-2*r-1;
      const length=2*row+TAU*r;
      let d=p*length;
      const x=source.left+r+.5, y=source.top+source.height/2;
      if(d<=row) return [x+d,y-r];
      d-=row;
      if(d<=Math.PI*r) {
        const a=d/r-Math.PI/2;
        return [x+row+r*Math.cos(a),y+r*Math.sin(a)];
      }
      d-=Math.PI*r;
      if(d<=row) return [x+row-d,y+r];
      const a=(d-row)/r+Math.PI/2;
      return [x+r*Math.cos(a),y+r*Math.sin(a)];
    }
    function circle(rect,p,r) {
      return [rect.left+rect.width/2+r*Math.cos(TAU*p),rect.top+rect.height/2+r*Math.sin(TAU*p)];
    }

    // Allocate contiguous pieces on both pill rails to individual graph
    // edges and node contours. Glyphs and the shortcut keep separate lineage.
    const mapping = (() => {
      const target=computeNeuralOpeningGeometry(660,410);
      const parts=target.edges.map((item,index)=>({kind:'edge',index,point:item.at(.5),rail:item.from%2}))
        .concat(target.nodes.map((item,index)=>({kind:'node',index,point:[item.x,item.y],rail:item.y>target.height*.53?1:0}))
          .filter(item=>item.index!==0&&item.index!==8));
      return [0,1].flatMap(rail=>{
        const row=parts.filter(item=>item.rail===rail).sort((a,b)=>(a.point[0]-b.point[0])*(rail?-1:1));
        return row.map((item,index)=>({...item,from:(rail+index/row.length)/2,to:(rail+(index+1)/row.length)/2}));
      });
    })();

    function morph(width,height,source,target,graph,t) {
      root.setAttribute('viewBox','0 0 '+width+' '+height);
      overlay.setAttribute('visibility','visible');
      paperPath.setAttribute('visibility','visible');
      const fx=fraction(.04,.83,t);
      const fy=fraction(.15,.93,t);
      const close=fraction(.39,.94,t);
      const material=fraction(.06,.91,t);
      const reveal=fraction(.74,.98,t);
      const center=[source.left+source.width/2,source.top+source.height/2];
      const skin=sample(p=>pill(source,p)).map(([x,y])=>[
        mix(x,center[0]+(x-center[0])*.67,fx),mix(y,center[1]+(y-center[1])*.48,fy)
      ]);
      paperPath.setAttribute('d',path(skin,true));
      paperPath.setAttribute('opacity',1-fraction(.12,.58,t));

      function mapped(from,to,lag=0) {
        const horizontal=fraction(.04+lag,.94,t);
        const vertical=fraction(.14+lag,.97,t);
        return from.map(([x,y],i)=>[mix(x,target.left+to[i][0],horizontal),mix(y,target.top+to[i][1],vertical)]);
      }

      const anchors=[];
      for(const part of mapping){
        if(part.kind==='node') drawNode(part.index,sample(p=>pill(source,mix(part.from,part.to,p))),pillInk);
      }
      drawNode(0,sample(p=>circle(source.icon,p,source.icon.width*.271)),'#716b61');
      const {submit}=source;
      const arrowPoint=([x,y])=>[submit.left+submit.width*x/24,submit.top+submit.height*y/24];
      drawNode(8,sample(p=>arrowPoint([4+15*p,12])),'#292827');
      for(const part of mapping){
        if(part.kind!=='edge')continue;
        const segment=sample(p=>pill(source,mix(part.from,part.to,p)));
        const edge=graph.edges[part.index],view=edgeViews[part.index];
        const color=edge.weight<0?negative:positive;
        const curve=mapped(segment,edge.contour,edge.layer*.065);
        // Rail segments continue into the same two gathering points while
        // neighbouring border pieces curl into their node contours.
        const join=fraction(.14,.56,t)*(1-fraction(.85,.997,t));
        const first=curve[0], last=curve.at(-1);
        const a=anchors[edge.from].out,b=anchors[edge.to].in;
        const joined=curve.map(([x,y],index)=>{
          const p=index/steps;
          const start=join*(1-p)**2,end=join*p*p;
          return [x+(a[0]-first[0])*start+(b[0]-last[0])*end,
            y+(a[1]-first[1])*start+(b[1]-last[1])*end];
        });
        view.visible.setAttribute('d',path(joined));
        view.visible.setAttribute('stroke',blend(pillInk,color,material));
        const dash=fraction(.69,.98,t);
        view.visible.setAttribute('stroke-dasharray',edge.weight<0?(mix(80,4,dash)+' '+5*dash):'none');
        view.visible.setAttribute('stroke-width',mix(1,1.05+Math.abs(edge.weight)*.62,material));
        view.visible.setAttribute('opacity',mix(1,.32,fraction(.64,.995,t)));
        view.hit.setAttribute('d','');
        const fromInput=edge.layer===0;
        const departure=(fromInput ? .60 : .77)+edge.column*.011+(edge.from%3)*.006;
        const q=math.phase(t,departure,departure+(fromInput ? .18 : .16));
        const contribution=edge.weight*(fromInput?math.inputs[edge.from]:opening.hidden[edge.from-3]);
        view.pulse.setAttribute('visibility',q>0&&q<1&&contribution!==0?'visible':'hidden');
        if(q>0&&q<1&&contribution!==0){
          const step=q*steps;
          const [x,y]=joined[Math.floor(step)];
          const [xx,yy]=joined[Math.ceil(step)];
          const ratio=step-Math.floor(step);
          view.pulse.setAttribute('transform',`translate(${mix(x,xx,ratio)} ${mix(y,yy,ratio)})`);
          view.pulse.setAttribute('opacity',Math.sin(Math.PI*q)*.75);
          view.dot.setAttribute('fill',color);
          view.dot.setAttribute('r',2+Math.min(1,Math.abs(contribution))*3);
          view.mark.textContent='';
        }
      }

      function drawNode(i,from,color){
        const node=graph.nodes[i],view=nodeViews[i];
        const contour=mapped(from,node.contour,node.layer*.047);
        const xs=contour.map(point=>point[0]),ys=contour.map(point=>point[1]);
        const y=(Math.min(...ys)+Math.max(...ys))/2;
        anchors[i]={in:[Math.min(...xs),y],out:[Math.max(...xs),y]};
        view.disc.setAttribute('d',path(contour,t>=.99||i===0));
        view.disc.setAttribute('stroke',blend(color,outline,material));
        view.disc.setAttribute('stroke-width',mix(1,1.28,material));
        view.disc.setAttribute('fill',paper);
        view.disc.setAttribute('fill-opacity',close);
        place(view.text,target.left+node.x,target.top+node.y-(i<3?9:0));
        place(view.value,target.left+node.x,target.top+node.y+9);
        view.text.setAttribute('opacity',reveal);
        view.value.setAttribute('opacity',i<3?reveal:0);
      }

      headings.forEach((heading,index)=>place(heading,target.left+graph.columns[index],target.top+24));
      headers.setAttribute('opacity',reveal);
      sourceText.textContent=source.text;
      sourceText.style.font=source.font;
      sourceText.style.fill=source.color;
      sourceText.setAttribute('opacity',1-fraction(.02,.20,t));
      const first=graph.nodes[0];
      const textX=mix(source.input.left,target.left+first.x-first.r*.72,fx);
      const textY=mix(center[1],target.top+first.y,fy);
      place(sourceText,textX,textY);
      place(textWindow,textX,textY-source.height/2);
      textWindow.setAttribute('height',source.height);
      textWindow.setAttribute('width',mix(source.input.width,0,fraction(.36,.89,t)));
      const last=graph.nodes[8];
      arrow.setAttribute('d',path([[12,5],[19,12],[12,19]].map(point=>{
        const [x,y]=arrowPoint(point);
        return [mix(x,target.left+last.x,fx),mix(y,target.top+last.y,fy)];
      })));
      arrow.setAttribute('opacity',1-fraction(.58,.87,t));
      const e=graph.edges[0];
      const stem=[[source.icon.left+source.icon.width*.66,source.icon.top+source.icon.height*.66],
        [source.icon.left+source.icon.width*.84,source.icon.top+source.icon.height*.84]];
      handle.setAttribute('d',path(stem.map(([x,y],i)=>{
        const [xx,yy]=e.at(.14+.09*i);
        return [mix(x,target.left+xx,fx),mix(y,target.top+yy,fy)];
      })));
      handle.setAttribute('opacity',1-fraction(.78,.98,t));
    }
    function showLive() {
      nodeViews.forEach(view=>view.disc.removeAttribute('fill-opacity'));
    }
    function paintIdle(graph, pulses, weights) {
      const active = new Map(pulses.map(pulse => [pulse.index, pulse.amount]));
      graph.edges.forEach((edge,index) => {
        const view = edgeViews[index];
        const amount = active.get(index);
        view.pulse.setAttribute('visibility', amount === undefined ? 'hidden' : 'visible');
        if (amount === undefined) return;
        const [x,y] = edge.at(amount);
        view.pulse.setAttribute('transform','translate('+x+' '+y+')');
        view.pulse.setAttribute('opacity',Math.sin(Math.PI*amount)*.74);
        view.dot.setAttribute('fill',weights[edge.from][edge.column]<0?negative:positive);
        view.dot.setAttribute('r',4);
        view.mark.textContent='';
      });
      for(const view of nodeViews)view.pulse.setAttribute('visibility','hidden');
    }

    return {root,layout,paint,paintIdle,morph,showLive};
  }
  return {create,computeNeuralOpeningGeometry,inputs,outputs,nodeNames,number,percentages};
})();
