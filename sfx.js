/* Elevé — subtle synthesized PIANO note SFX for UI interactions */
(function(){
  "use strict";
  var KEY="eleve_sfx_muted";
  var muted = localStorage.getItem(KEY)==="1";
  var ctx=null, master=null;

  function init(){
    if(ctx) return;
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      ctx=new AC(); master=ctx.createGain(); master.gain.value=(typeof window.__SFX_VOLUME==="number")?window.__SFX_VOLUME:0.5; master.connect(ctx.destination);
    }catch(e){ ctx=null; }
  }
  function resume(){ if(ctx&&ctx.state==="suspended"){ try{ctx.resume();}catch(e){} } }

  // C major pentatonic across ~1.5 octaves — always consonant
  var SCALE=[146.83,220.00,233.08,261.63,293.66,329.63,349.23,392.00,440.00];
  var idx=4;

  function note(freq,vel,dur,delay){
    // warm tongue-drum / handpan tone: harmonic + inharmonic partials, each with its own decay
    if(muted||!ctx) return; var t=ctx.currentTime+(delay||0);
    var lp=ctx.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.setValueAtTime(3400,t); lp.frequency.exponentialRampToValueAtTime(900,t+dur*0.75);
    lp.connect(master);
    // [ratio, amplitude, decay-fraction]
    var parts=[[1,1,1.0],[2,0.5,0.78],[3,0.28,0.58],[4.02,0.10,0.36],[6.05,0.045,0.24]];
    parts.forEach(function(p){
      var o=ctx.createOscillator(); o.type="sine"; o.frequency.value=freq*p[0];
      var g=ctx.createGain();
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vel*p[1],t+0.004);
      g.gain.exponentialRampToValueAtTime(0.0003,t+dur*p[2]);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t+dur*p[2]+0.05);
    });
  }
  function nextFreq(){
    idx += (Math.random()<0.5?-1:1)*(1+Math.floor(Math.random()*2));
    if(idx<0) idx=1; if(idx>SCALE.length-1) idx=SCALE.length-3;
    return SCALE[idx];
  }
  function arp(){
    if(muted||!ctx) return;
    var start=Math.floor(Math.random()*(SCALE.length-4)), gap=0.085, n=4+Math.floor(Math.random()*2);
    for(var i=0;i<n;i++){ note(SCALE[Math.min(SCALE.length-1,start+i)], 0.15-i*0.012, 1.9, i*gap); }
    idx=Math.min(SCALE.length-1,start+n-1);
  }
  function tick(){
    if(muted||!ctx) return; var t=ctx.currentTime;
    // a soft, subtle mechanical click (distinct from the piano clicks)
    var o=ctx.createOscillator(); o.type="triangle"; o.frequency.value=1050+Math.random()*160;
    var bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=1150; bp.Q.value=1.1;
    var g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.025,t+0.0008); g.gain.exponentialRampToValueAtTime(0.0002,t+0.018);
    o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t+0.03);
  }
  window.__sfx={
    click:function(){ note(nextFreq(),0.16,2.3); },
    tick:function(){ tick(); },
    chord:function(){ arp(); },
    hover:function(){ note(SCALE[6+Math.floor(Math.random()*3)],0.045,1.1); },
    isMuted:function(){ return muted; },
    mute:function(m){ muted=!!m; localStorage.setItem(KEY,muted?"1":"0"); }
  };

  function unlock(){ init(); resume(); }
  window.addEventListener("pointerdown",unlock,true);
  window.addEventListener("keydown",unlock,true);
  window.addEventListener("wheel",unlock,{passive:true,capture:true});

  var INTER="a,button,select,input,textarea,label,.pill,.chip,.cbtn,.cdot,.dot,[data-tool],[data-theme],[role=button],.floor,.zoomctl button,.file-lbl,.toggle,#sfxBtn";

  // button/interactive -> full note cascade; empty space -> single note
  document.addEventListener("pointerdown",function(e){
    init(); resume();
    var el=e.target&&e.target.closest&&e.target.closest(INTER);
    if(el) window.__sfx.chord(); else window.__sfx.click();
  },true);

  var lastH=0;
  document.addEventListener("pointerover",function(e){
    if(!ctx) return;
    var el=e.target&&e.target.closest&&e.target.closest(INTER); if(!el) return;
    var now=performance.now(); if(now-lastH<95) return; lastH=now;
    window.__sfx.hover();
  },true);

  var lastTickY=(window.scrollY||window.pageYOffset||0);
  window.addEventListener("scroll",function(){
    if(!ctx) return;
    var y=window.scrollY||window.pageYOffset||document.documentElement.scrollTop||0;
    if(Math.abs(y-lastTickY)>=45){ lastTickY=y; tick(); }
  },{passive:true});

  function addToggle(){
    if(document.getElementById("sfxBtn")) return;
    var b=document.createElement("button"); b.id="sfxBtn"; b.type="button"; b.textContent="♪";
    b.style.cssText="position:fixed;left:1.2rem;bottom:3.4rem;z-index:1001;width:30px;height:30px;border:1px solid #17181b;background:rgba(255,255,255,.55);color:#17181b;font-size:14px;line-height:1;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:0;padding:0";
    function paint(){ b.style.opacity=muted?"0.4":"0.9"; b.style.textDecoration=muted?"line-through":"none"; b.title=muted?"Sound off":"Sound on"; }
    paint();
    b.addEventListener("click",function(){ muted=!muted; window.__sfx.mute(muted); paint(); if(!muted){ init(); resume(); window.__sfx.click(); } });
    document.body.appendChild(b);
  }
  if(document.readyState!=="loading") addToggle(); else document.addEventListener("DOMContentLoaded",addToggle);
})();
