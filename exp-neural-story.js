'use strict';

const MorphNeuralStory = (() => {
  const math=MorphNeural;
  const graph=MorphNeuralGraph;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sections=[
    ['The network at rest','A network runs a series of mathematical operations. Each hidden neuron receives all three inputs. Its weights and bias determine which combinations produce a strong response.','This example assigns a small image patch to one of two fictional patterns. The weights are set by hand so you can follow the arithmetic.'],
    ['Inputs enter','Each feature measures one property of the patch. Edge strength, texture and brightness are scaled from 0 to 1, so the numbers fit the range expected by this model.','Select an input to edit it. Its value stays with you as you scroll through the calculation.'],
    ['Weights shape the signal','Every wire multiplies its source value by a fixed weight. A solid wire carries a positive weight and a dashed wire carries a negative one. A wider wire indicates a larger magnitude.','Select a wire to see the exact product. In this model, the source values are nonnegative, so the weight determines the sign of its contribution.'],
    ['Add the weighted inputs','A hidden neuron adds its three products and a bias. The bias shifts the sum even when every input is zero. Follow the first hidden neuron’s calculation.'],
    ['Apply an activation','ReLU keeps positive sums and maps zero or negative sums to zero. The nonlinear step lets the network represent relationships that a stack of linear layers alone could not express.','The four hidden activations together form a representation of the input patch. Each one is a computed value, and its meaning comes from the network as a whole.'],
    ['Send the hidden activations onward','The four hidden activations are the inputs to the next layer. Each output neuron multiplies them by a different set of weights and adds its own bias.','A hidden activation of zero contributes zero through every outgoing wire. The resulting sums are called logits.'],
    ['Turn logits into scores','Softmax compares both logits. It gives the larger logit a larger share of the total, and the two shares add to 100%.','These percentages describe this illustrative model’s output. They are not calibrated probabilities about real image patches.'],
    ['Change an input or a weight','Change the edge-strength input and all four hidden sums can move. Change just the Edge → h1 weight and only h1’s sum changes in the hidden layer. Try pushing it below zero to see ReLU shut off that path.'],
    ['One complete forward pass','Inputs become weighted sums, then nonlinear activations, then output scores. That forward calculation is inference. In training, backpropagation computes how weights affect a loss, and gradient descent uses that information to adjust them.','The controls above let you change numbers by hand and compare the resulting scores. Reset the example to run the original inputs and weights again.']
  ];

  function el(tag,cls,text) {
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(text!==undefined) node.textContent=text;
    return node;
  }
  function button(text,cls) {
    const item=el('button',cls,text);
    item.type='button';
    return item;
  }
  function create(host) {
    const heading=el('header','nn-heading');
    const intro=el('div','nn-intro');
    const kicker=el('p','nn-index','Computer science');
    const title=el('div','nn-title','Neural Networks');
    title.setAttribute('aria-hidden','true');
    intro.append(title,el('p','nn-deck','How a network turns inputs into a prediction.'));
    heading.append(kicker,intro);

    const story=el('div','nn-story');
    const narrative=el('div','nn-narrative');
    const sum=el('p','nn-equation');
    const result=el('p','nn-equation');
    const comparison=el('p','nn-comparison');
    const edit=button('Edit edge strength','nn-text-action');
    const editWeight=button('Edit Edge → h1 weight','nn-text-action');
    const reset=button('Reset example','nn-text-action');
    const share=button('Share this exhibit','nn-text-action');
    const sectionsDOM=sections.map(([title,body,detail],index)=>{
      const section=el('section','nn-beat');
      section.append(el('h2','',title),el('p','',body));
      if(detail) section.append(el('p','',detail));
      if(index===3) section.append(sum);
      if(index===6) section.append(result);
      if(index===7) {
        const actions=el('div','nn-actions');
        actions.append(edit,editWeight,reset);
        section.append(actions,comparison);
      }
      if(index===8) {
        const details=el('details','nn-deeper');
        const link=el('a','','Explore gradient descent · Distill');
        link.href='https://distill.pub/2017/momentum/';
        details.append(el('summary','','Go deeper'),
          el('p','','A neuron first computes z = Σ(w × a) + b. The hidden layer then computes max(0, z). Softmax divides each output’s exponential by the sum of both exponentials.'),link);
        section.append(details,share);
      }
      narrative.append(section);
      return section;
    });

    const figure=el('figure','nn-specimen');
    const device=el('div','nn-device');
    const scene=graph.create();
    const fallback=el('div','nn-fallback');
    fallback.hidden=true;
    fallback.append(el('h2','','Example values'),el('p','','Three inputs feed four ReLU neurons, then two softmax outputs.'));
    const fallbackValues=el('p','nn-equation');
    fallback.append(fallbackValues);
    device.append(scene.root,fallback);
    const caption=el('figcaption','nn-caption');
    const legend=el('span','nn-legend');
    legend.append(el('span','nn-positive','Positive weight'),el('span','nn-negative','Negative weight'));
    const label=el('label','sr-only','Inspect a node or a weight');
    const picker=el('select');
    picker.id='nn-picker';
    picker.setAttribute('aria-controls','nn-inspector');
    label.htmlFor=picker.id;
    picker.append(new Option('Inspect a part',''));
    const nodes=el('optgroup');
    nodes.label='Nodes';
    graph.nodeNames.forEach((name,index)=>nodes.append(new Option(name,'node-'+index)));
    const edges=el('optgroup');
    edges.label='Weights';
    math.edges.forEach(edge=>edges.append(new Option(graph.nodeNames[edge.from]+' → '+graph.nodeNames[edge.to],edge.id)));
    picker.append(nodes,edges);
    caption.append(legend,label,picker);

    const inspector=el('aside','nn-inspector');
    inspector.setAttribute('aria-labelledby','nn-inspect-title');
    inspector.id='nn-inspector';
    inspector.hidden=true;
    const close=button('Close','nn-text-action');
    const inspectTitle=el('h2');
    inspectTitle.id='nn-inspect-title';
    const detail=el('p','nn-inspect-copy');
    const calc=el('p','nn-equation');
    const control=el('label','nn-input-control');
    const controlHeading=el('span','','Normalized value');
    const input=el('input');
    input.type='range';
    input.min=0;
    input.max=1;
    input.step=.01;
    const readout=el('output');
    control.append(controlHeading,input,readout);
    const inspectComparison=el('p','nn-comparison');
    inspectComparison.hidden=true;
    inspector.append(close,inspectTitle,detail,calc,control,inspectComparison);
    const status=el('span','sr-only');
    status.setAttribute('role','status');
    figure.append(device,caption,inspector,status);
    story.append(figure,narrative);
    host.replaceChildren(heading,story);
    return { host, story, figure, device, scene, fallback, fallbackValues, picker, sections:sectionsDOM,
      inspector,close,inspectTitle,detail,calc,control,controlHeading,input,readout,sum,result,comparison,inspectComparison,edit,editWeight,reset,share,status };
  }

  function mount(view, options) {
    const { story,figure,device,scene,fallback,fallbackValues,picker,inspector,close,inspectTitle,detail,calc,
      control,controlHeading,input,readout,sum,result,comparison,inspectComparison,edit,editWeight,reset,share,status }=view;
    const scope=new AbortController();
    const {signal}=scope;
    const canonical=[...math.inputs];
    const values=options.values?.length===3&&options.values.every(Number.isFinite)?
      options.values.map(value=>Math.max(0,Math.min(1,value))):canonical.slice();
    const weights=math.weights.map(row=>row.slice());
    if(Number.isFinite(options.weight))weights[0][0]=Math.max(-1,Math.min(1,options.weight));
    let data=math.calculate(values,weights);
    let selected='';
    let lastChange=null;
    let geometry;
    let offsets;
    let bounds;
    let inspectorBounds;
    let visible=true;
    let frame=0;
    let idleFrame=0;
    let idleAfter=performance.now()+430;
    let nextPulse=0;
    let lastPulsePaint=0;
    let pulses=[];
    let layoutDirty=true;
    let stage=-1;
    let progress=0;
    let opener;
    const svgAvailable=typeof SVGSVGElement!=='undefined'&&scene.root instanceof SVGSVGElement;
    const compact=matchMedia('(max-width: 730px)');
    const num=graph.number;
    const nums=list=>list.map(num).join(' and ');
    const idIndex=id=>Number(id.split('-')[1]);
    const signalFrom=edge=>edge.layer?data.hidden[edge.from-3]:values[edge.from];
    fallback.hidden=svgAvailable;
    scene.root.hidden=!svgAvailable;

    function equation(layer,index) {
      const upper=layer===1;
      const source=upper?values:data.hidden;
      const bias=math.biases[upper?index:index+4];
      const products=source.map((value,i)=>num(value)+' × ('+num(weights[upper?i:i+3][index])+')');
      return products.join(' + ')+' + ('+num(bias)+') = '+num((upper?data.hiddenSums:data.logits)[index]);
    }
    function readouts() {
      sum.textContent='h1 sum = '+equation(1,0);
      const scores=graph.percentages(data);
      result.textContent='Logits '+nums(data.logits)+' → '+scores.join(' / ');
      fallbackValues.textContent='Inputs '+values.map(num).join(', ')+' · ReLU '+data.hidden.map(num).join(', ')+' · '+scores.join(' / ');
      comparison.textContent=lastChange?lastChange.name+' '+num(lastChange.from)+' → '+num(lastChange.to)+
        '. Pattern A '+lastChange.before+' → '+scores[0]+'. Pattern B '+lastChange.beforeOther+' → '+scores[1]+'.':'';
    }

    function range(min, value, label) {
      control.hidden=false;
      controlHeading.textContent=label;
      input.min=min;
      input.value=value;
      input.setAttribute('aria-label',label);
      readout.value=num(value);
      inspectComparison.textContent=comparison.textContent;
      inspectComparison.hidden=lastChange?.id!==selected;
    }

    function describe() {
      if(!selected)return;
      const index=idIndex(selected);
      control.hidden=true;
      inspectComparison.hidden=true;
      if(selected.startsWith('edge-')){
        const edge=math.edges[index];
        const from=signalFrom(edge);
        const weight=weights[edge.from][edge.column];
        const sign=weight<0?'negative':weight>0?'positive':'zero';
        inspectTitle.textContent=graph.nodeNames[edge.from]+' → '+graph.nodeNames[edge.to];
        detail.textContent='The '+sign+' weight multiplies the source '+(edge.layer?'activation.':'feature value.');
        calc.textContent=num(from)+' × ('+num(weight)+') = '+num(from*weight);
        if(index===0)range(-1,weight,'Edge → h1 weight');
      } else if(index<3) {
        inspectTitle.textContent=graph.inputs[index];
        detail.textContent=[
          'Edge strength measures how sharply nearby pixels change. Zero represents a smooth patch and one represents a strong boundary.',
          'Texture measures local variation in the patch. This example scales the measurement from zero to one.',
          'Brightness measures average light intensity. Zero represents dark and one represents bright.'
        ][index];
        calc.textContent='Input '+(index+1)+' = '+num(values[index])+' · feeds all four hidden units';
        range(0,values[index],graph.inputs[index]+' normalized value');
      } else if(index<7){
        const i=index-3;
        inspectTitle.textContent=graph.nodeNames[index];
        detail.textContent='Add all three weighted contributions and a bias of '+num(math.biases[i])+'. Apply ReLU to the resulting sum.';
        calc.textContent=equation(1,i)+'. ReLU('+num(data.hiddenSums[i])+') = '+num(data.hidden[i])+'.';
      } else {
        const i=index-7;
        inspectTitle.textContent=graph.nodeNames[index];
        detail.textContent='The four weighted hidden activations plus bias produce this logit. Softmax compares it with the other logit.';
        calc.textContent=equation(2,i)+'. Softmax score '+graph.percentages(data)[i]+'.';
      }
      measureInspector();
    }

    function measureInspector() {
      inspectorBounds=selected&&!compact.matches?
        {top:parseFloat(getComputedStyle(inspector).top),height:inspector.offsetHeight}:null;
    }

    function syncReadingColumn(y) {
      if(!bounds)return;
      const sticky=Math.max(bounds.start,Math.min(y+bounds.sticky,bounds.end-bounds.height));
      const start=sticky+(inspectorBounds?.top||0);
      const end=start+(inspectorBounds?.height||0);
      view.sections.forEach((section,index)=>{
        const [top,bottom]=bounds.sections[index];
        const covered=Boolean(selected&&inspectorBounds&&top<end&&bottom>start);
        if(section.hasAttribute('data-covered')!==covered){
          section.toggleAttribute('data-covered',covered);
          section.inert=covered;
        }
      });
    }

    function select(id,from) {
      if(from) opener=from;
      selected=id;
      picker.value=id;
      inspector.hidden=!id;
      describe();
      if(!id)inspectorBounds=null;
      syncReadingColumn(window.scrollY);
      status.textContent=id?inspectTitle.textContent+' selected':'Inspection closed';
      if(id) {
        for(const part of scene.root.querySelectorAll('[data-part]')){
          part.tabIndex=part.dataset.part===id?0:-1;
        }
      }
      schedule();
    }

    function dismiss() {
      select('');
      (opener?.isConnected && !opener.closest('[hidden]') ? opener : picker).focus({preventScroll:true});
    }

    function change(raw) {
      if(!Number.isFinite(raw)) return;
      const weight=selected==='edge-0';
      const index=idIndex(selected);
      if(!weight && (!selected.startsWith('node-') || index>=values.length))return;
      const value=Math.round(Math.max(weight?-1:0,Math.min(1,raw))*100)/100;
      const target=weight?weights[0]:values;
      if(target[index]===value)return;
      const prior=graph.percentages(data);
      if(lastChange?.id!==selected) {
        lastChange={id:selected,name:weight?'Edge → h1 weight':graph.inputs[index],from:target[index],before:prior[0],beforeOther:prior[1]};
      }
      lastChange.to=value;
      target[index]=value;
      data=math.calculate(values,weights);
      readouts();
      describe();
      schedule();
    }
    reset.addEventListener('click',()=>{
      canonical.forEach((value,index)=>{values[index]=value;});
      weights[0][0]=math.weights[0][0];
      data=math.calculate(values,weights);
      lastChange=null;
      readouts();
      describe();
      status.textContent='Inputs and weight reset to example values';
      schedule();
    },{signal});
    edit.addEventListener('click',()=>{
      select('node-0',edit);
      input.focus({preventScroll:true});
    },{signal});
    editWeight.addEventListener('click',()=>{
      select('edge-0',editWeight);
      input.focus({preventScroll:true});
    },{signal});
    input.addEventListener('input',()=>change(input.valueAsNumber),{signal});
    input.addEventListener('change',()=>{status.textContent='New model scores '+graph.percentages(data).join(' and ');},{signal});
    share.addEventListener('click',options.share,{signal});
    picker.addEventListener('change',()=>select(picker.value,picker),{signal});
    close.addEventListener('click',dismiss,{signal});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&selected&&!document.querySelector('dialog[open]'))dismiss();
    },{signal});
    scene.root.addEventListener('click',event=>{
      const part=event.target.closest('[data-part]');
      if(part) select(part.dataset.part,part);
    },{signal});
    scene.root.addEventListener('keydown',event=>{
      const part=event.target.closest('[data-part]');
      if(!part)return;
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        select(part.dataset.part,part);
      }
      const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
      if(direction){
        event.preventDefault();
        const parts=[...scene.root.querySelectorAll('.nn-node'),...scene.root.querySelectorAll('.nn-edge-hit')];
        const next=parts[(parts.indexOf(part)+direction+parts.length)%parts.length];
        part.tabIndex=-1;
        next.tabIndex=0;
        next.focus({preventScroll:true});
      }
    },{signal});

    function schedule(){ if(!frame)frame=requestAnimationFrame(paint); }
    function invalidate(){layoutDirty=true;schedule();}
    function ambient(now) {
      idleFrame=0;
      if(!svgAvailable||!geometry||!visible||reduced.matches||document.hidden||selected)return;
      idleFrame=requestAnimationFrame(ambient);
      if(now<idleAfter||now-lastPulsePaint<33)return;
      lastPulsePaint=now;
      pulses=pulses.filter(pulse=>now-pulse.start<pulse.duration);
      if(now>=nextPulse){
        const candidates=geometry.edges.map((edge,index)=>({edge,index})).filter(({edge,index})=>
          weights[edge.from][edge.column]!==0&&!pulses.some(pulse=>pulse.index===index));
        if(candidates.length){
          const {index}=candidates[Math.floor(Math.random()*candidates.length)];
          pulses.push({index,start:now,duration:620+Math.random()*410});
        }
        nextPulse=now+170+Math.random()*420;
      }
      scene.paintIdle(geometry,pulses.map(pulse=>({index:pulse.index,amount:(now-pulse.start)/pulse.duration})),weights);
    }
    function paint(){
      frame=0;
      if(layoutDirty){
        const rect=device.getBoundingClientRect();
        geometry=graph.computeNeuralOpeningGeometry(rect.width,rect.height);
        scene.layout(geometry);
        scene.showLive();
        const scroll=window.scrollY;
        const lead=Math.min(innerHeight*.24,205);
        const sections=view.sections.map(section=>{
          const box=section.getBoundingClientRect();
          return [box.top+scroll,box.bottom+scroll];
        });
        offsets=sections.map(([top],i)=>i?Math.max(1,top-lead):0);
        const end=story.getBoundingClientRect().bottom+scroll;
        bounds={sections,end,start:story.getBoundingClientRect().top+scroll,
          height:figure.offsetHeight,sticky:parseFloat(getComputedStyle(figure).top)};
        measureInspector();
        offsets.push(Math.max(offsets.at(-1)+100,end-innerHeight*.52));
        layoutDirty=false;
      }
      const y=window.scrollY;
      if(selected)syncReadingColumn(y);
      progress=math.progressAt(y,offsets);
      MorphWorld.live('neural-networks',progress);
      const nextStage=math.stageAt(progress);
      if(nextStage!==stage){
        view.sections[stage]?.removeAttribute('data-current');
        view.sections[nextStage].setAttribute('data-current','');
        scene.root.setAttribute('aria-label','Neural network. Stage: '+sections[nextStage][0]);
        stage=nextStage;
      }
      if(!svgAvailable||!visible)return;
      const snapshot=stage===2?.30:stage===5?.69:math.stages[stage+1];
      scene.paint(geometry,values,data,reduced.matches?snapshot:progress,selected,reduced.matches,weights);
      if(!idleFrame&&!reduced.matches&&!selected)idleFrame=requestAnimationFrame(ambient);
    }
    const size=new ResizeObserver(invalidate);
    size.observe(device);
    size.observe(story);
    const intersection=new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(visible)schedule();
    });
    intersection.observe(figure);
    document.fonts.addEventListener('loadingdone',invalidate,{signal});
    window.addEventListener('scroll',()=>{
      idleAfter=performance.now()+430;
      pulses=[];
      schedule();
    },{signal,passive:true});
    window.addEventListener('resize',invalidate,{signal,passive:true});
    document.addEventListener('visibilitychange',()=>{
      pulses=[];
      if(!document.hidden)schedule();
    },{signal});
    reduced.addEventListener('change',schedule,{signal});
    readouts();
    paint();
    return {
      state:()=>({values:values.slice(),weight:weights[0][0],scroll:window.scrollY}),
      dispose(){
        cancelAnimationFrame(frame);
        cancelAnimationFrame(idleFrame);
        scope.abort();
        size.disconnect();
        intersection.disconnect();
        inspector.hidden=true;
        selected='';
        inspectorBounds=null;
        syncReadingColumn(window.scrollY);
        picker.value='';
        status.textContent='';
        for(const [index,part] of [...scene.root.querySelectorAll('.nn-node'),...scene.root.querySelectorAll('.nn-edge-hit')].entries()){
          part.tabIndex=index===0?0:-1;
        }
      }
    };
  }
  return {create,mount};
})();
