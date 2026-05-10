'use strict';

function dbg(m){
  var e=document.getElementById('debug-status');
  if(e)e.textContent=m;
  console.log(m);
}

const PLAYER_W = 16, PLAYER_H = 18, CS = 20;
const DEBUG_SENSORS = false;

const GRAVITY    = 900;
const JUMP_VEL  = -380;
const MOVE_SPD  = 150;
const MAX_FALL  = 600;
const DEATH_DUR = 1.0;
const INVIN_DUR = 1.333;
const GRAV_DUR  = 3.0;
const FLASH_DUR = 0.133;
const MSG_DUR   = 2.2;
const TARGET_DT = 1 / 60;
const MAX_DT    = 1 / 20;

const PAL = {
  bg:'#04060f',floor:'#0e2030',floorG:'#1a3a50',steel:'#1a2a3a',
  spike:'#ff3040',spikeG:'#ff8090',ghost:'rgba(40,180,120,.45)',
  fake:'rgba(100,80,160,.5)',exit:'#00ffcc',grav:'#ff00aa',
  player:'#e0f0ff',eye:'#00ffcc',pupil:'#003020',
  gold:'#ffe040',
};

const TAUNTS = [
  'NICE TRY','SKILL ISSUE','PATHETIC','THAT WAS OBVIOUS','LOL',
  'ARE YOU EVEN TRYING?','PREDICTED','L RATIO','STILL ALIVE?','TOUCH GRASS',
  'JUST STOP','PAIN IS INFORMATION','COPE','YOU FOOL','CLASSIC',
  'MAYBE PLAY EASIER','WOW...','BRUH','GET GOOD',
];

const _rnd = arr => arr[Math.floor(Math.random()*arr.length)];

/* ========== SAVE ========== */
const SAVE_KEY = 'ft2_save';
const DEFAULT_SAVE = {
  version:2, deaths:0, hi:0, totalDeaths:0, totalJumps:0, totalWins:0, playTime:0,
  xp:0, level:1, stars:{}, bestTimes:{}, bestDeaths:{},
  unlockedSkins:['default'], equippedSkin:'default', coins:0, gems:0,
  streak:0, lastDaily:'', dailyDone:false, weeklyDone:{},
  achievements:{}, seenOnboarding:false, removedAds:false,
};

const SKIN_DB = {
  default:{name:'CLASSIC',color:'#e0f0ff',eye:'#00ffcc',cost:0},
  neon:{name:'NEON',color:'#ff00aa',eye:'#ffff00',cost:500},
  ghost:{name:'GHOST',color:'rgba(40,180,120,.6)',eye:'#44ffaa',cost:800},
  gold:{name:'GOLD',color:'#ffe040',eye:'#ff8040',cost:1200},
  void:{name:'VOID',color:'#1a0a2a',eye:'#aa44ff',cost:2000},
  frost:{name:'FROST',color:'#88ddff',eye:'#ffffff',cost:1500},
  lava:{name:'LAVA',color:'#ff4400',eye:'#ffe000',cost:2500},
  rainbow:{name:'RAINBOW',color:'#ff0066',eye:'#00ffcc',cost:5000},
};

const ACHIEVEMENT_DB = {
  firstBlood:{name:'FIRST BLOOD',desc:'Die for the first time',icon:'skull',xp:50},
  century:{name:'CENTURY',desc:'Die 100 times',icon:'skull',xp:200},
  masochist:{name:'MASOCHIST',desc:'Die 1000 times',icon:'skull',xp:1000},
  unkillable:{name:'UNKILLABLE',desc:'Complete a level without dying',icon:'trophy',xp:500},
  zoneClear:{name:'ZONE CLEAR',desc:'Complete all regular levels',icon:'crown',xp:1000},
  gravityMaster:{name:'GRAVITY MASTER',desc:'Survive gravity flip 10 times',icon:'cycle',xp:300},
  jumper:{name:'JUMPER',desc:'Jump 1000 times',icon:'jump',xp:200},
  noob:{name:'NOOB',desc:'Die in the first 5 seconds',icon:'baby',xp:25},
  streak3:{name:'HOT STREAK',desc:'3 day login streak',icon:'fire',xp:150},
  streak7:{name:'WEEK WARRIOR',desc:'7 day login streak',icon:'fire',xp:500},
  completionist:{name:'COMPLETIONIST',desc:'3-star all levels',icon:'star',xp:2000},
  dailyChamp:{name:'DAILY CHAMP',desc:'Complete 7 daily challenges',icon:'cal',xp:700},
  speedrun:{name:'SPEEDRUNNER',desc:'Complete game in under 100 dea ths',icon:'run',xp:1000},
};

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw) return Object.assign({}, DEFAULT_SAVE, JSON.parse(raw));
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

function writeSave(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(window._save)); }catch(e){}
}

/* ========== ERROR CATCHER ========== */
(function(){
  const el = document.createElement('div');
  el.id='err-catcher';el.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#c00;color:#fff;font:14px monospace;padding:8px;z-index:9999;display:none;white-space:pre-wrap;word-break:break-all';
  document.body.appendChild(el);
  window.onerror = function(msg, src, line, col, err){
    el.style.display='block';
    el.textContent = 'JS ERROR: ' + msg + '\n' + (src||'') + ':' + (line||'') + ':' + (col||'');
    return true;
  };
  window.addEventListener('unhandledrejection', function(e){
    el.style.display='block';
    el.textContent = 'PROMISE ERROR: ' + e.reason;
  });
})();

/* ========== AUDIO ========== */
let actx = null;
function initAudio(){
  if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
}
function sfx(type){
  try{
    if(!actx) return;
    const g=actx.createGain(),o=actx.createOscillator(),t=actx.currentTime;
    o.connect(g); g.connect(actx.destination);
    const m = {
      jump:{s:'square',f0:220,f1:440,d0:.08,g0:.18,g1:.001,d1:.12},
      die:{s:'sawtooth',f0:440,f1:55,d0:.35,g0:.25,g1:.001,d1:.35},
      trap:{s:'square',f0:880,f1:110,d0:.15,g0:.2,g1:.001,d1:.15},
      win:{s:'triangle',f0:440,f1:1760,d0:.2,g0:.22,g1:.001,d1:.3},
      troll:{s:'sine',f0:660,f1:220,d0:.4,g0:.2,g1:.001,d1:.5},
      whoosh:{s:'sine',f0:200,f1:80,d0:.18,g0:.15,g1:.001,d1:.2},
      coin:{s:'square',f0:880,f1:1320,d0:.08,g0:.12,g1:.001,d1:.12},
      powerup:{s:'triangle',f0:330,f1:880,d0:.2,g0:.15,g1:.001,d1:.25},
      portal:{s:'sine',f0:220,f1:660,d0:.15,g0:.1,g1:.001,d1:.2},
      achieve:{s:'triangle',f0:523,f1:1047,d0:.3,g0:.2,g1:.001,d1:.4},
      checkpoint:{s:'triangle',f0:440,f1:660,d0:.15,g0:.12,g1:.001,d1:.18},
      buy:{s:'triangle',f0:660,f1:1320,d0:.2,g0:.15,g1:.001,d1:.25},
    }[type];
    if(m){o.type=m.s;o.frequency.setValueAtTime(m.f0,t);o.frequency.exponentialRampToValueAtTime(m.f1,t+m.d0);g.gain.setValueAtTime(m.g0,t);g.gain.exponentialRampToValueAtTime(m.g1,t+m.d1);o.start(t);o.stop(t+m.d1);}
  }catch(e){}
}

function _aabb(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}

const FSM = Object.freeze({IDLE:0,TRIGGERED:1,ANIMATING:2,RESET:3});

/* ========== ENTITY BASE ========== */
class Entity{
  constructor(def){
    this.id=def.id;this.type=def.type;
    this.col=def.col??0;this.row=def.row??0;
    this.trigger=def.trigger??null;
    this.triggerDelay=def.triggerDelay??0.05;
    this.resetDelay=def.resetDelay??-1;
    this.oneShot=def.oneShot??true;
    this.x=this.col*CS;this.y=this.row*CS;
    this.state=FSM.IDLE;this.timer=0;this._dead=false;
  }
  update(dt,game){
    switch(this.state){
      case FSM.IDLE:
        if(this.trigger&&this._sense(game)){this.state=FSM.TRIGGERED;this.timer=0;sfx('trap');this.onTrigger(game);}
        break;
      case FSM.TRIGGERED:
        this.timer+=dt;if(this.timer>=this.triggerDelay){this.state=FSM.ANIMATING;this.timer=0;}
        break;
      case FSM.ANIMATING:
        this.timer+=dt;
        if(this.onUpdate(dt,game)){if(this.resetDelay<0)this._dead=true;else{this.state=FSM.RESET;this.timer=0;}}
        break;
      case FSM.RESET:
        this.timer+=dt;
        if(this.timer>=Math.max(this.resetDelay,0)){this.onReset(game);if(this.oneShot)this._dead=true;else{this.state=FSM.IDLE;this.timer=0;}}
        break;
    }
  }
  draw(ctx,game){if(DEBUG_SENSORS&&this.trigger&&this.state===FSM.IDLE)this._sd(ctx);this.onDraw(ctx,game);}
  onTrigger(game){}
  onUpdate(dt,game){return true;}
  onReset(game){}
  onDraw(ctx,game){}
  _sense(game){
    if(!game.state.player)return false;
    const p=game.state.player,px=(p.x+PLAYER_W/2)/CS,py=(p.y+PLAYER_H/2)/CS,tr=this.trigger;
    if(tr.radius!==undefined)return Math.hypot(px-(tr.col+0.5),py-(tr.row+0.5))<=tr.radius;
    const tw=tr.w??1,th=tr.h??1;
    return px>=tr.col&&px<=tr.col+tw&&py>=tr.row&&py<=tr.row+th;
  }
  _sd(ctx){
    const tr=this.trigger;ctx.save();
    ctx.strokeStyle='rgba(255,255,0,0.55)';ctx.lineWidth=0.8;ctx.setLineDash([3,3]);
    if(tr.radius!==undefined){ctx.beginPath();ctx.arc((tr.col+0.5)*CS,(tr.row+0.5)*CS,tr.radius*CS,0,Math.PI*2);ctx.stroke();}
    else ctx.strokeRect(tr.col*CS,tr.row*CS,(tr.w??1)*CS,(tr.h??1)*CS);
    ctx.setLineDash([]);ctx.restore();
  }
}

/* ========== ENTITIES ========== */
class SpikeLauncher extends Entity{
  constructor(def){super(def);this.speed=def.speed??480;this.travelDist=def.travelDist??CS*2;this._off=0;this._st=0;}
  onTrigger(g){this._st=g.tileAt(this.col,this.row);g.setTile(this.col,this.row,3);this._off=0;sfx('whoosh');}
  onUpdate(dt,g){this._off=Math.min(this._off+this.speed*dt,this.travelDist);if(_aabb(g.state.player.x,g.state.player.y,PLAYER_W,PLAYER_H,this.x,this.y-this._off,CS,CS))g.killPlayer();return this._off>=this.travelDist;}
  onReset(g){g.setTile(this.col,this.row,this._st);this._off=0;}
  onDraw(ctx){
    if(this.state!==FSM.ANIMATING&&this.state!==FSM.TRIGGERED)return;
    const x=this.x,y=this.y-this._off,s=CS;
    ctx.fillStyle=PAL.spike;ctx.beginPath();ctx.moveTo(x+s/2,y+2);ctx.lineTo(x+s*0.9,y+s-2);ctx.lineTo(x+s*0.1,y+s-2);ctx.closePath();ctx.fill();
    ctx.strokeStyle=PAL.spikeG;ctx.lineWidth=1.5;ctx.stroke();
    const g=ctx.createLinearGradient(0,y+s,0,y+s+this._off*0.4);g.addColorStop(0,'rgba(255,48,64,0.35)');g.addColorStop(1,'rgba(255,48,64,0)');
    ctx.fillStyle=g;ctx.fillRect(x+4,y+s,s-8,this._off*0.4);
  }
}
class VanishPlatform extends Entity{
  constructor(def){super(def);this.fadeTime=def.fadeTime??0.6;this.triggerDelay=0.08;this._el=0;this._bl=0;}
  onTrigger(g){this._el=0;this._bl=0;}
  onUpdate(dt,g){this._el+=dt;this._bl+=dt;const p=this._el/this.fadeTime;if(p>0.6){const br=0.045*(1-p+0.1);g.setTile(this.col,this.row,Math.floor(this._bl/br)%2===0?1:0);}if(this._el>=this.fadeTime){g.setTile(this.col,this.row,0);return true;}return false;}
  onReset(g){g.setTile(this.col,this.row,1);this._el=0;}
  onDraw(ctx){if(this.state!==FSM.ANIMATING)return;ctx.save();ctx.globalAlpha=Math.max(0,1-this._el/this.fadeTime)*0.6;ctx.fillStyle='#ff8040';ctx.fillRect(this.x,this.y,CS,CS);ctx.restore();}
}
class DropBlock extends Entity{
  constructor(def){super(def);this._fy=this.row*CS;this._spd=120;this._acc=1440;this._max=840;}
  onTrigger(g){this._fy=this.row*CS;this._spd=120;sfx('whoosh');}
  onUpdate(dt,g){this._spd=Math.min(this._spd+this._acc*dt,this._max);this._fy+=this._spd*dt;const p=g.state.player,pc=Math.floor((p.x+PLAYER_W/2)/CS);if(pc===this.col&&Math.abs(p.y+PLAYER_H/2-this._fy)<CS*1.5)g.killPlayer();const row=Math.floor(this._fy/CS);if(row>=g.state.lvl.ph-1||g.isSolid(g.tileAt(this.col,row+1))){g.setTile(this.col,row,1);return true;}return false;}
  onDraw(ctx){if(this.state!==FSM.ANIMATING&&this.state!==FSM.TRIGGERED)return;const x=this.col*CS,y=this._fy,s=CS;const g=ctx.createLinearGradient(x,y,x,y+s);g.addColorStop(0,'#e04020');g.addColorStop(1,'#802010');ctx.fillStyle=g;ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle='#ff8060';ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,s-2,s-2);}
}
class CrushCeiling extends Entity{
  constructor(def){super(def);this.targetRow=def.targetRow??this.row+4;this.speed=def.speed??600;this._fy=this.row*CS;this._or=this.row;this._dir=1;}
  onTrigger(g){this._fy=this._or*CS;this._dir=1;sfx('whoosh');}
  onUpdate(dt,g){this._fy+=this.speed*this._dir*dt;if(this._dir===1){if(_aabb(g.state.player.x,g.state.player.y,PLAYER_W,PLAYER_H,this.x,this._fy,CS,(this.targetRow-this._or+1)*CS))g.killPlayer();if(this._fy>=this.targetRow*CS){this._fy=this.targetRow*CS;this._dir=-1;return true;}}return false;}
  onReset(g){this._fy=this._or*CS;this._dir=1;}
  onDraw(ctx){if(this.state!==FSM.ANIMATING&&this.state!==FSM.TRIGGERED)return;const x=this.x,y=this._fy,s=CS;const g=ctx.createLinearGradient(x,y,x,y+s);g.addColorStop(0,'#223348');g.addColorStop(1,'#0e1e2e');ctx.fillStyle=g;ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle='#4488aa';ctx.lineWidth=1.5;ctx.strokeRect(x+1,y+1,s-2,s-2);}
}
class PatrolSpike extends Entity{
  constructor(def){super(def);this.colEnd=def.colEnd??this.col+3;this.speed=def.speed??120;this._px=this.x;this._dir=1;this.state=FSM.ANIMATING;}
  update(dt,g){this._px+=this.speed*this._dir*dt;const r=this.colEnd*CS,l=this.col*CS;if(this._px>=r){this._px=r;this._dir=-1;}if(this._px<=l){this._px=l;this._dir=1;}if(_aabb(g.state.player.x,g.state.player.y,PLAYER_W,PLAYER_H,this._px,this.y,CS,CS))g.killPlayer();}
  onDraw(ctx){const x=this._px,y=this.y,s=CS;ctx.fillStyle=PAL.spike;ctx.beginPath();ctx.moveTo(this._dir>0?x+s-2:x+2,y+s/2);ctx.lineTo(x+s*0.5,y+4);ctx.lineTo(this._dir>0?x+2:x+s-2,y+s/2);ctx.lineTo(x+s*0.5,y+s-4);ctx.closePath();ctx.fill();ctx.strokeStyle=PAL.spikeG;ctx.lineWidth=1.2;ctx.stroke();}
}
class GravityZone extends Entity{
  constructor(def){super(def);this.duration=def.duration??GRAV_DUR;}
  onTrigger(g){g.state.gravFlip=true;g.state.gravTimer=this.duration;g._showMsg('GRAVITY INVERTED');}
  onUpdate(dt,g){return true;}
  onDraw(ctx){if(this.state!==FSM.IDLE||!this.trigger)return;const tr=this.trigger,p=Math.sin(Date.now()*0.004)*0.5+0.5;ctx.strokeStyle=`rgba(255,0,170,${p*0.3})`;ctx.lineWidth=1;ctx.setLineDash([3,4]);if(tr.radius!==undefined){ctx.beginPath();ctx.arc((tr.col+0.5)*CS,(tr.row+0.5)*CS,tr.radius*CS,0,Math.PI*2);ctx.stroke();}else ctx.strokeRect(tr.col*CS,tr.row*CS,(tr.w??1)*CS,(tr.h??1)*CS);ctx.setLineDash([]);}
}
class FakeExit extends Entity{
  constructor(def){super(def);this.triggerDelay=0;this.resetDelay=def.resetDelay??1.5;this.oneShot=def.oneShot??false;}
  onTrigger(g){g.setTile(this.col,this.row,3);g._showMsg('NICE TRY - NOT THE EXIT');sfx('troll');}
  onUpdate(dt,g){return true;}
  onReset(g){g.setTile(this.col,this.row,8);}
}
class TimedSpikes extends Entity{
  constructor(def){super(def);this.upTime=def.upTime??1;this.downTime=def.downTime??1;this._cycle=this.upTime+this.downTime;this._el=0;this._act=false;this._ot=def.origTile??0;}
  onTrigger(g){this._el=0;this._act=true;this._ot=g.tileAt(this.col,this.row);g.setTile(this.col,this.row,3);}
  onUpdate(dt,g){this._el+=dt;const cp=this._el%this._cycle,sa=cp<this.upTime;if(sa!==this._act){this._act=sa;g.setTile(this.col,this.row,this._act?3:this._ot);}if(this._act&&_aabb(g.state.player.x,g.state.player.y,PLAYER_W,PLAYER_H,this.x,this.y,CS,CS))g.killPlayer();return false;}
  onReset(g){this._act=false;this._el=0;g.setTile(this.col,this.row,this._ot);}
  onDraw(ctx){if(!this._act)return;const x=this.x,y=this.y,s=CS;ctx.fillStyle=PAL.spike;ctx.beginPath();ctx.moveTo(x+s/2,y+2);ctx.lineTo(x+s-2,y+s/2);ctx.lineTo(x+s/2,y+s-2);ctx.lineTo(x+2,y+s/2);ctx.closePath();ctx.fill();ctx.strokeStyle=PAL.spikeG;ctx.lineWidth=1.5;ctx.stroke();}
}
class MovingPlatform extends Entity{
  constructor(def){super(def);this.colEnd=def.colEnd??this.col+4;this.rowEnd=def.rowEnd??this.row;this.speed=def.speed??80;this._px=this.x;this._py=this.y;this._dx=def.dirX??1;this._dy=def.dirY??0;this._oc=this.col;this._or=this.row;}
  onTrigger(g){this._px=this._oc*CS;this._py=this._or*CS;this._dx=this._dx||1;this._dy=this._dy||0;}
  onUpdate(dt,g){const ex=this.colEnd*CS,ey=this.rowEnd*CS;if(this._dx!==0){this._px+=this.speed*this._dx*dt;if(this._dx>0&&this._px>=ex){this._px=ex;this._dx=-1;}else if(this._dx<0&&this._px<=this._oc*CS){this._px=this._oc*CS;this._dx=1;}}if(this._dy!==0){this._py+=this.speed*this._dy*dt;if(this._dy>0&&this._py>=ey){this._py=ey;this._dy=-1;}else if(this._dy<0&&this._py<=this._or*CS){this._py=this._or*CS;this._dy=1;}}const p=g.state.player;if(_aabb(p.x,p.y+PLAYER_H-4,PLAYER_W,4,this._px+2,this._py,CS-4,CS)){p.x+=this.speed*this._dx*dt;p.y+=this.speed*this._dy*dt;}if(_aabb(p.x,p.y,PLAYER_W,PLAYER_H,this._px,this._py,CS,CS))g.killPlayer();return false;}
  onReset(g){this._px=this._oc*CS;this._py=this._or*CS;this._dx=1;this._dy=0;}
  onDraw(ctx){const x=this._px,y=this._py,s=CS;const g=ctx.createLinearGradient(x,y,x,y+s);g.addColorStop(0,'#3a5a7a');g.addColorStop(1,'#1a3a5a');ctx.fillStyle=g;ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle='#6a9aba';ctx.lineWidth=1.5;ctx.strokeRect(x+1,y+1,s-2,s-2);ctx.fillStyle='#8abade';ctx.fillRect(x+3,y+3,s-6,2);ctx.fillRect(x+3,y+s-5,s-6,2);}
}

/* ========== NEW ENTITIES ========== */
class Portal extends Entity{
  constructor(def){super(def);this.targetCol=def.targetCol??this.col+3;this.targetRow=def.targetRow??this.row;this.triggerDelay=0;this.resetDelay=-1;this.oneShot=false;this._cd=0;}
  onTrigger(g){if(this._cd>0)return;const p=g.state.player;p.x=this.targetCol*CS+CS/2-PLAYER_W/2;p.y=this.targetRow*CS+CS/2-PLAYER_H/2;p.vx=0;p.vy=0;this._cd=0.5;sfx('portal');g._showMsg('PORTAL');}
  update(dt,g){if(this._cd>0)this._cd-=dt;super.update(dt,g);}
  onDraw(ctx){const p=Math.sin(Date.now()*0.006)*0.3+0.7;const x=this.x,y=this.y,s=CS;ctx.fillStyle=`rgba(170,68,255,${p*0.15})`;ctx.fillRect(x,y,s,s);ctx.strokeStyle=`rgba(170,68,255,${p})`;ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.strokeRect(x+2,y+2,s-4,s-4);ctx.setLineDash([]);ctx.fillStyle=`rgba(170,68,255,${p})`;ctx.font=`bold ${s*0.5}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('P',x+s/2,y+s/2);}
}
class Checkpoint extends Entity{
  constructor(def){super(def);this.triggerDelay=0;this.resetDelay=-1;this.oneShot=true;this._act=false;}
  onTrigger(g){if(this._act)return;this._act=true;g.state.checkX=this.col*CS+CS/2-PLAYER_W/2;g.state.checkY=this.row*CS-PLAYER_H;g._showMsg('CHECKPOINT');sfx('checkpoint');}
  onDraw(ctx){const x=this.x,y=this.y,s=CS;const p=this._act?1:Math.sin(Date.now()*0.004)*0.3+0.7;ctx.fillStyle=`rgba(68,255,170,${this._act?0.2:0.1})`;ctx.fillRect(x,y,s,s);ctx.strokeStyle=`rgba(68,255,170,${p})`;ctx.lineWidth=this._act?2:1;ctx.setLineDash(this._act?[]:[3,3]);ctx.strokeRect(x+2,y+2,s-4,s-4);ctx.setLineDash([]);if(this._act){ctx.fillStyle='#44ffaa';ctx.font=`bold ${s*0.4}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('OK',x+s/2-5,y+s/2);}}
}
class PowerUp extends Entity{
  constructor(def){super(def);this.powerType=def.powerType??'doubleJump';this.triggerDelay=0;this.resetDelay=-1;this.oneShot=true;this._got=false;}
  onTrigger(g){if(this._got)return;this._got=true;const p=g.state.player;switch(this.powerType){case'doubleJump':p.hasDoubleJump=true;p.jumpsLeft=2;g._showMsg('DOUBLE JUMP!');break;case'shield':p.hasShield=true;g._showMsg('SHIELD!');break;case'speed':p.hasSpeed=true;p.speedBoost=5;g._showMsg('SPEED BOOST!');break;}sfx('powerup');}
  onDraw(ctx){if(this._got)return;const x=this.x,y=this.y,s=CS;const cols={doubleJump:'#ffaa00',shield:'#44aaff',speed:'#ff4400'};const c=cols[this.powerType]||'#ffaa00';ctx.fillStyle=c+'22';ctx.fillRect(x,y,s,s);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,s-4,s-4);const icons={doubleJump:'^',shield:'S',speed:'>>'};ctx.fillStyle=c;ctx.font=`bold ${s*0.45}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icons[this.powerType]||'?',x+s/2,y+s/2);}
}
class Enemy extends Entity{
  constructor(def){super(def);this.colEnd=def.colEnd??this.col+3;this.speed=def.speed??80;this._px=this.x;this._dir=1;this.state=FSM.ANIMATING;}
  update(dt,g){this._px+=this.speed*this._dir*dt;const r=this.colEnd*CS,l=this.col*CS;if(this._px>=r){this._px=r;this._dir=-1;}if(this._px<=l){this._px=l;this._dir=1;}if(_aabb(g.state.player.x,g.state.player.y,PLAYER_W,PLAYER_H,this._px,this.y,CS,CS))g.killPlayer();}
  onDraw(ctx){const x=this._px,y=this.y,s=CS;const grad=ctx.createRadialGradient(x+s/2,y+s/2,0,x+s/2,y+s/2,s);grad.addColorStop(0,'#ff8844');grad.addColorStop(1,'#cc3300');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x+s/2,y+s/2,s/2-2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+s/2-3,y+s/2-4,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#220000';ctx.beginPath();ctx.arc(x+s/2-2,y+s/2-3,1.5,0,Math.PI*2);ctx.fill();if(this._dir>0){ctx.fillStyle='#ff8844';ctx.beginPath();ctx.arc(x+s/2+3,y+s/2-4,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#220000';ctx.beginPath();ctx.arc(x+s/2+4,y+s/2-3,1.5,0,Math.PI*2);ctx.fill();}}
}
class SwitchBlock extends Entity{
  constructor(def){super(def);this.targetCol=def.targetCol??this.col+1;this.targetRow=def.targetRow??this.row;this.triggerDelay=0;this.resetDelay=def.resetDelay??-1;this.oneShot=def.oneShot??false;this._act=false;}
  onTrigger(g){this._act=!this._act;const t=g.tileAt(this.targetCol,this.targetRow);g.setTile(this.targetCol,this.targetRow,this._act?(t===0?1:0):(t===0?1:0));sfx('trap');g._showMsg(this._act?'SWITCH ON':'SWITCH OFF');}
  onDraw(ctx){const x=this.x,y=this.y,s=CS;ctx.fillStyle=this._act?'#ffdd00':'#665500';ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle=this._act?'#ffff88':'#887744';ctx.lineWidth=1.5;ctx.strokeRect(x+1,y+1,s-2,s-2);ctx.fillStyle=this._act?'#000':'#aaa';ctx.font=`bold ${s*0.5}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this._act?'I':'O',x+s/2,y+s/2);}
}

const ENTITY_TYPES = {
  spike_launcher:SpikeLauncher, vanish_platform:VanishPlatform, drop_block:DropBlock,
  crush_ceiling:CrushCeiling, patrol_spike:PatrolSpike, gravity_zone:GravityZone,
  fake_exit:FakeExit, timed_spikes:TimedSpikes, moving_platform:MovingPlatform,
  portal:Portal, checkpoint:Checkpoint, powerup:PowerUp, enemy:Enemy, switch_block:SwitchBlock,
};

function createEntity(def){
  const C=ENTITY_TYPES[def.type];
  if(!C){console.warn('Unknown entity:',def.type);return null;}
  return new C(def);
}

/* ========== PROGRESSION HELPERS ========== */
function xpForLevel(lvl){return Math.floor(100*Math.pow(1.2,lvl-1));}
function addXP(amount){
  const s=window._save;s.xp+=amount;
  while(s.xp>=xpForLevel(s.level+1)){s.level++;sfx('achieve');}
  writeSave();
}
function checkAchievement(id){
  const s=window._save,a=ACHIEVEMENT_DB[id];
  if(!a||s.achievements[id])return false;
  s.achievements[id]=true;addXP(a.xp);sfx('achieve');return true;
}
function calcStars(d){if(d<=1)return 3;if(d<=3)return 2;if(d<=8)return 1;return 0;}

/* ========== DAILY / WEEKLY ========== */
function dailySeed(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}
function weeklySeed(){const d=new Date(),s=new Date(d.getFullYear(),0,1);return d.getFullYear()*100+Math.ceil((((d-s)/86400000)+s.getDay()+1)/7);}

function getDailyChallenge(){
  const seed=dailySeed();return{id:`d_${seed}`,title:'DAILY FLUX',desc:'Complete any level with max 3 deaths',xp:200,coins:50,done:window._save.dailyDone&&window._save.lastDaily===`${seed}`};
}
function getWeeklyChallenge(){
  const seed=weeklySeed();return{id:`w_${seed}`,title:'WEEKLY TORTURE',desc:'Complete level 5 with max 5 deaths',xp:1000,coins:200,gems:10,done:!!window._save.weeklyDone[seed]};
}

function getDailyStreakStatus(){
  const s=window._save;
  return {current:s.streak,days:Array.from({length:7},(_,i)=>i<s.streak)};
}

/* ========== LEADERBOARD LOCAL ========== */
function getLB(idx){
  try{const r=localStorage.getItem(`ft2_lb_${idx}`);return r?JSON.parse(r):[];}catch(e){return[];}
}
function submitLB(idx,name,deaths){
  const lb=getLB(idx);lb.push({name,deaths,date:Date.now()});
  lb.sort((a,b)=>a.deaths-b.deaths);
  if(lb.length>50)lb.length=50;
  localStorage.setItem(`ft2_lb_${idx}`,JSON.stringify(lb));
}

/* ========== UI PANELS ========== */
let activePanel=null;

function showPanel(id){
  hidePanel();const el=document.getElementById('panel-'+id);
  if(!el)return;activePanel=id;el.classList.remove('panel-hidden');
  if(id==='profile')renderProfile();
  if(id==='shop')renderShop();
  if(id==='challenges')renderChallenges();
  if(id==='leaderboard')renderLeaderboard();
  if(id==='stats')renderStats();
  if(id==='achievements')renderAchievements();
}
function hidePanel(){document.querySelectorAll('.panel').forEach(e=>e.classList.add('panel-hidden'));activePanel=null;}

function renderProfile(){
  const s=window._save,skin=SKIN_DB[s.equippedSkin]||SKIN_DB.default;
  const el=document.getElementById('panel-profile-content');if(!el)return;
  el.innerHTML=`<div class="p-head"><div class="p-av" style="background:${skin.color};border-color:${skin.eye}"><span style="color:${skin.eye}">:)</span></div><div class="p-info"><div class="p-name">PLAYER</div><div class="p-skin">${skin.name}</div><div class="p-lvl">LVL ${s.level}</div></div></div><div class="p-xp-bg"><div class="p-xp-fill" style="width:${Math.min(100,s.xp/xpForLevel(s.level+1)*100)}%"></div></div><div class="p-grid"><div><span class="p-v">${s.totalDeaths}</span><span class="p-l">DEATHS</span></div><div><span class="p-v">${s.totalWins}</span><span class="p-l">WINS</span></div><div><span class="p-v">${s.totalJumps}</span><span class="p-l">JUMPS</span></div><div><span class="p-v">${Math.floor(s.playTime/60)}m</span><span class="p-l">PLAYTIME</span></div><div><span class="p-v">${s.coins}</span><span class="p-l">COINS</span></div><div><span class="p-v">${s.gems}</span><span class="p-l">GEMS</span></div></div>`;
}
function renderShop(){
  const s=window._save,el=document.getElementById('panel-shop-content');if(!el)return;
  let h='<div class="sg">';
  for(const[id,sk]of Object.entries(SKIN_DB)){
    const owned=s.unlockedSkins.includes(id),eq=s.equippedSkin===id;
    h+=`<div class="si ${owned?'ow':''} ${eq?'eq':''}" data-i="${id}"><div class="sp" style="background:${sk.color}"><span style="color:${sk.eye}">:)</span></div><div class="sn">${sk.name}</div><div class="sp2">${owned?(eq?'EQUIPPED':'OWNED'):sk.cost+'xc'}</div></div>`;
  }
  h+='</div>';el.innerHTML=h;
  el.querySelectorAll('.si').forEach(e=>e.addEventListener('click',()=>{
    const id=e.dataset.i,sk=SKIN_DB[id];
    if(s.equippedSkin===id)return;
    if(s.unlockedSkins.includes(id)){s.equippedSkin=id;writeSave();renderShop();renderProfile();return;}
    if(s.coins>=sk.cost){s.coins-=sk.cost;s.unlockedSkins.push(id);s.equippedSkin=id;writeSave();sfx('buy');renderShop();renderProfile();}
    else window._game._showMsg('NOT ENOUGH COINS');
  }));
}
function renderChallenges(){
  const s=window._save,el=document.getElementById('panel-challenges-content');if(!el)return;
  const dc=getDailyChallenge(),wc=getWeeklyChallenge(),st=getDailyStreakStatus();
  el.innerHTML=`<div class="cc ${dc.done?'d':''}"><div class="ct">${dc.title}</div><div class="cd">${dc.desc}</div><div class="cr">+${dc.xp}XP +${dc.coins}xc</div><div class="cs">${dc.done?'OK DONE':'PENDING'}</div></div><div class="cc ${wc.done?'d':''}"><div class="ct">${wc.title}</div><div class="cd">${wc.desc}</div><div class="cr">+${wc.xp}XP +${wc.coins}xc +${wc.gems}ge</div><div class="cs">${wc.done?'OK DONE':'PENDING'}</div></div><div class="streak"><div class="st-title">LOGIN STREAK</div><div class="st-count">${st.current} ${st.current===1?'DAY':'DAYS'}</div><div class="st-bar">${st.days.map((a,i)=>'<div class="st-dot'+(a?' act':'')+'"></div>').join('')}</div></div>`;
}
function renderLeaderboard(){
  const el=document.getElementById('panel-lb-content');if(!el)return;
  const idx=window._lbIdx||0,lb=getLB(idx);
  let h=`<div class="lb-h">LEVEL ${idx+1}</div><div class="lb-c"><button class="lb-b" id="lb-p">&lt;</button><span>ZONE ${String(idx+1).padStart(2,'0')}</span><button class="lb-b" id="lb-n">&gt;</button></div><div class="lb-l">`;
  if(lb.length===0)h+='<div class="lb-e">NO ENTRIES</div>';
  else for(let i=0;i<Math.min(lb.length,20);i++){
    const e=lb[i],m=['#ffe040','#c0c0c0','#cd7f32'],c=i<3?m[i]:'#446';
    h+=`<div class="lb-e2" style="border-color:${c}"><span class="lb-r" style="color:${c}">#${i+1}</span><span class="lb-n2">${e.name||'PLAYER'}</span><span class="lb-s">${e.deaths} deaths</span></div>`;
  }
  h+='</div>';el.innerHTML=h;
  document.getElementById('lb-p')?.addEventListener('click',()=>{if(window._lbIdx>0){window._lbIdx--;renderLeaderboard();}});
  document.getElementById('lb-n')?.addEventListener('click',()=>{if(window._lbIdx<window._game.levels.length-1){window._lbIdx++;renderLeaderboard();}});
}
function renderStats(){
  const s=window._save,el=document.getElementById('panel-stats-content');if(!el)return;
  const totalStars=Object.values(s.stars).reduce((a,b)=>a+b,0),maxStars=window._game.levels.filter(l=>l.id!=='tutorial').length*3;
  el.innerHTML=`<div class="sr"><span>TOTAL DEATHS</span><span>${s.totalDeaths}</span></div><div class="sr"><span>TOTAL WINS</span><span>${s.totalWins}</span></div><div class="sr"><span>TOTAL JUMPS</span><span>${s.totalJumps}</span></div><div class="sr"><span>PLAY TIME</span><span>${Math.floor(s.playTime/60)}m ${Math.floor(s.playTime%60)}s</span></div><div class="sr"><span>STARS</span><span>${totalStars}/${maxStars}</span></div><div class="sr"><span>LEVEL</span><span>${s.level}</span></div><div class="sr"><span>XP</span><span>${s.xp}</span></div><div class="sr"><span>COINS</span><span>${s.coins}</span></div><div class="sr"><span>GEMS</span><span>${s.gems}</span></div><div class="sr"><span>STREAK</span><span>${s.streak} days</span></div><div class="sr"><span>SKINS</span><span>${s.unlockedSkins.length}/${Object.keys(SKIN_DB).length}</span></div><div class="sr"><span>ACHIEVEMENTS</span><span>${Object.values(s.achievements).filter(Boolean).length}/${Object.keys(ACHIEVEMENT_DB).length}</span></div>`;
}
function renderAchievements(){
  const s=window._save,el=document.getElementById('panel-achievements-content');if(!el)return;
  let h='<div class="ag">';
  for(const[id,a]of Object.entries(ACHIEVEMENT_DB)){
    const u=s.achievements[id];
    h+=`<div class="ai ${u?'u':''}"><div class="ai-n">${a.name}</div><div class="ai-d">${a.desc}</div><div class="ai-x">${u?'OK':'+'+a.xp+'XP'}</div></div>`;
  }
  h+='</div>';el.innerHTML=h;
}

/* ========== GAME ========== */
class Game{
  constructor(){
    this.canvas=document.getElementById('c');
    this.ctx=this.canvas.getContext('2d');
    this.levels=[];
    this.levelsLoaded=false;
    this._loadingLevels=false;
    this._loadFailed=false;
    this._startPending=false;
    this.SCALE=1;
    this.state={
      lvlIdx:0,deaths:0,hi:+(localStorage.getItem('ft_hi')||0),
      player:null,map:null,lvl:null,triggers:[],firedTriggers:new Set(),
      ghostTiles:new Map(),spikeReveal:new Set(),fallingBlocks:[],
      gravFlip:false,gravTimer:0,running:false,paused:false,dying:false,
      deathTimer:0,flashTimer:0,invinTimer:0,entities:[],checkX:-1,checkY:-1,
      started:false,
    };
    this.keys={left:false,right:false,jump:false};
    this._lastTS=0;this._msgTimer=null;
    this._bindAll();
  }

  async _loadLevels(){
    if(this._loadingLevels)return;
    this._loadingLevels=true;
    this._loadFailed=false;
    for(const url of['./mapa.json','../www/mapa.json']){
      try{
        const r=await fetch(url);
        if(r.ok){this.levels=await r.json();this.levelsLoaded=true;console.log('loaded',url);this._loadingLevels=false;this._onLevelsLoaded();return;}
      }catch(e){}
      try{const x=new XMLHttpRequest();
        x.open('GET',url);x.overrideMimeType('application/json');
        await new Promise((a,b)=>{x.onload=()=>a();x.onerror=()=>b();x.send();});
        if(x.status===200||x.status===0){this.levels=JSON.parse(x.responseText);this.levelsLoaded=true;console.log('loaded',url);this._loadingLevels=false;this._onLevelsLoaded();return;}
      }catch(e){}
    }
    // Last resort: sync XHR with timeout
    for(const url of['./mapa.json','../www/mapa.json']){
      try{const x=new XMLHttpRequest();
        x.open('GET',url,false);x.timeout=2000;x.overrideMimeType('application/json');
        x.send();
        if(x.status===200||x.status===0){this.levels=JSON.parse(x.responseText);this.levelsLoaded=true;console.log('loaded(sync)',url);this._loadingLevels=false;this._onLevelsLoaded();return;}
      }catch(e){}
    }
    this._loadingLevels=false;
    this._loadFailed=true;
    console.warn('mapa.json NOT LOADED - game will not render');
  }

  _onLevelsLoaded(){
    if(this._startPending&&this.levelsLoaded){
      this._startPending=false;
      this.start();
    }
  }

  init(){
    const dot=document.getElementById('js-dot');
    if(dot)dot.style.background='#0f0';
    this._loadLevels();
    this.resizeCanvas();
    requestAnimationFrame(ts=>this._loop(ts));
  }

  start(){
    if(this.state.started)return;
    if(!this.levelsLoaded){
      if(this._loadFailed){
        this._loadFailed=false;
        this._startPending=true;
        this._loadLevels();
        return;
      }
      this._startPending=true;
      const btn=document.getElementById('ov-start');
      if(btn)btn.textContent='LOADING...';
      this._loadLevels();
      return;
    }
    initAudio();this._checkDaily();this._hideOverlay();
    const lastIdx=this.levels.length-1;
    const hasTutorial=this.levels[lastIdx]?.id==='tutorial';
    if(!window._save.seenOnboarding&&hasTutorial){this.loadLevel(lastIdx);window._save.seenOnboarding=true;writeSave();}
    else this.loadLevel(0);
    this.state.running=true;this.state.paused=false;this.state.started=true;
    this._lastTS=performance.now();
  }

  _checkDaily(){
    const s=window._save,today=`${dailySeed()}`;
    if(s.lastDaily!==today){
      s.dailyDone=false;
      // Streak reset if missed a day
      if(s.lastDaily&&s.lastDaily!==''){
        try{
          const diff=parseInt(today)-parseInt(s.lastDaily);
          if(diff>1)s.streak=0;
        }catch(e){}
      }
      s.lastDaily=today;writeSave();
    }
  }

  loadLevel(idx){
    const s=this.state,lvl=this.levels[idx];
    if(!lvl)return;
    s.lvlIdx=idx;s.lvl=lvl;s.map=[...lvl.map];
    s.triggers=lvl.triggers?lvl.triggers.map(t=>({...t})):[];
    s.firedTriggers=new Set();s.ghostTiles=new Map();s.spikeReveal=new Set();
    s.fallingBlocks=[];s.gravFlip=false;s.gravTimer=0;s.dying=false;s.deathTimer=0;
    s.invinTimer=0;s.checkX=-1;s.checkY=-1;
    s.entities=[];
    if(lvl.entities){for(const d of lvl.entities){const e=createEntity(d);if(e)s.entities.push(e);}}
    s.player={
      x:lvl.sx*CS+CS/2-PLAYER_W/2,y:lvl.sy*CS-PLAYER_H,
      vx:0,vy:0,onGround:false,eyeAng:0,stretch:1,lean:0,blinking:0,
      trailPts:[],hasDoubleJump:false,jumpsLeft:1,hasShield:false,speedBoost:0,hasSlowFall:false,
    };
    this.resizeCanvas();
    const h=document.getElementById('hv-lvl');if(h)h.textContent=String(idx+1).padStart(2,'0');
  }

  resizeCanvas(retries){
    if(retries===undefined)retries=0;
    const a=document.getElementById('arena'),aw=a.clientWidth,ah=a.clientHeight;
    if((aw===0||ah===0)&&retries<10){setTimeout(()=>this.resizeCanvas(retries+1),100);return;}
    const lvl=this.levels[this.state.lvlIdx];
    if(!lvl){
      this.canvas.width=aw;this.canvas.height=ah;
      this.SCALE=1;
      return;
    }
    const gw=lvl.pw*CS,gh=lvl.ph*CS;
    this.SCALE=Math.min(aw/gw,ah/gh,2);
    this.canvas.width=gw;this.canvas.height=gh;
    this.canvas.style.width=Math.floor(gw*this.SCALE)+'px';
    this.canvas.style.height=Math.floor(gh*this.SCALE)+'px';
  }

  tileAt(col,row){
    const lvl=this.state.lvl;
    if(!lvl)return 1;
    if(col<0||row<0||col>=lvl.pw||row>=lvl.ph)return 1;
    return this.state.map[row*lvl.pw+col];
  }
  setTile(col,row,val){
    const lvl=this.state.lvl;
    if(col<0||row<0||col>=lvl.pw||row>=lvl.ph)return;
    this.state.map[row*lvl.pw+col]=val;
  }
  isSolid(t){return t===1||t===5||t===6;}

  _sx(x,y,dx){
    if(dx===0)return{nx:x,hw:false};
    const nx=x+dx,col=dx>0?Math.floor((nx+PLAYER_W-1)/CS):Math.floor(nx/CS),r0=Math.floor(y/CS),r1=Math.floor((y+PLAYER_H-1)/CS);
    for(let r=r0;r<=r1;r++){const t=this.tileAt(col,r);this._hst(t,col,r);if(!this.isSolid(t))continue;return{nx:dx>0?col*CS-PLAYER_W:(col+1)*CS,hw:true};}
    return{nx,hw:false};
  }
  _sy(x,y,dy){
    if(dy===0)return{ny:y,hf:false,hc:false};
    const ny=y+dy,row=dy>0?Math.floor((ny+PLAYER_H-1)/CS):Math.floor(ny/CS),c0=Math.floor(x/CS),c1=Math.floor((x+PLAYER_W-1)/CS);
    for(let c=c0;c<=c1;c++){const t=this.tileAt(c,row);this._hst(t,c,row);if(!this.isSolid(t))continue;return{ny:dy>0?row*CS-PLAYER_H:(row+1)*CS,hf:dy>0,hc:dy<0};}
    return{ny,hf:false,hc:false};
  }
  _hst(t,c,r){
    const gk=`${c},${r}`;
    if(t===4&&!this.state.spikeReveal.has(gk)){this.state.spikeReveal.add(gk);this.setTile(c,r,3);sfx('trap');}
    if(t===7&&!this.state.firedTriggers.has(gk)){this.state.firedTriggers.add(gk);this.state.gravFlip=true;this.state.gravTimer=GRAV_DUR;this._showMsg('GRAVITY INVERTED');sfx('trap');}
  }
  _csf(x,y,vy){
    const r=Math.floor((y+PLAYER_H)/CS),c0=Math.floor(x/CS),c1=Math.floor((x+PLAYER_W-1)/CS);
    for(let c=c0;c<=c1;c++){const t=this.tileAt(c,r-1),gk=`${c},${r-1}`;
      if(t===6){const cnt=(this.state.ghostTiles.get(gk)||0)+1;this.state.ghostTiles.set(gk,cnt);if(cnt>4){this.setTile(c,r-1,0);this.state.ghostTiles.delete(gk);sfx('trap');}}
      if(t===5&&vy>0&&!this.state.firedTriggers.has('f5'+gk)){this.state.firedTriggers.add('f5'+gk);setTimeout(()=>this.setTile(c,r-1,0),300);sfx('trap');}
    }
  }
  _ts(x,y){
    const c0=Math.floor(x/CS),c1=Math.floor((x+PLAYER_W-1)/CS),r0=Math.floor(y/CS),r1=Math.floor((y+PLAYER_H-1)/CS);
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const t=this.tileAt(c,r);if(t===3||t===4)return true;}return false;
  }
  _ct(){
    const p=this.state.player;if(!p)return;
    const pc=(p.x+PLAYER_W/2)/CS,pr=(p.y+PLAYER_H/2)/CS;
    for(const tr of this.state.triggers){
      if(this.state.firedTriggers.has(tr.id))continue;
      if(Math.hypot(pc-tr.cx,pr-tr.cy)<tr.r){this.state.firedTriggers.add(tr.id);sfx('trap');
        if(tr.action==='drop_block')this.state.fallingBlocks.push({c:tr.blockCol,fy:0,speed:120,landed:false});
        else if(tr.action==='spike_wall')for(const c of tr.cols)this.setTile(c,tr.row,3);
        else if(tr.action==='reveal_spikes')for(let r=0;r<this.state.lvl.ph;r++)for(let c=0;c<this.state.lvl.pw;c++)if(this.tileAt(c,r)===4)this.setTile(c,r,3);
        else if(tr.action==='gravity_flip'){this.state.gravFlip=true;this.state.gravTimer=GRAV_DUR;this._showMsg('GRAVITY INVERTED');}
      }
    }
  }
  _ufb(dt){
    const ACC=1440,MAX=840;
    for(let i=this.state.fallingBlocks.length-1;i>=0;i--){
      const fb=this.state.fallingBlocks[i];if(fb.landed)continue;
      fb.speed=Math.min(fb.speed+ACC*dt,MAX);fb.fy+=fb.speed*dt;
      const row=Math.floor(fb.fy/CS);
      if(row>=this.state.lvl.ph-1||this.isSolid(this.tileAt(fb.c,row+1))){this.setTile(fb.c,row,1);this.state.fallingBlocks.splice(i,1);const p=this.state.player;if(Math.floor((p.x+PLAYER_W/2)/CS)===fb.c&&Math.abs(p.y+PLAYER_H/2-fb.fy)<CS*1.5)this.killPlayer();}
    }
  }

  killPlayer(){
    const s=this.state;
    if(s.dying||s.invinTimer>0){if(s.invinTimer>0&&s.player&&s.player.hasShield){s.player.hasShield=false;s.invinTimer=0;sfx('trap');s.flashTimer=FLASH_DUR;this._showMsg('SHIELD BROKEN!');return;}return;}
    s.dying=true;s.deathTimer=DEATH_DUR;s.deaths++;s.flashTimer=FLASH_DUR;
    const sv=window._save;sv.totalDeaths++;writeSave();
    if(sv.totalDeaths===1)checkAchievement('firstBlood');
    if(sv.totalDeaths>=100)checkAchievement('century');
    if(sv.totalDeaths>=1000)checkAchievement('masochist');
    sfx('die');this._showMsg(_rnd(TAUNTS));
    const h=document.getElementById('hv-deaths');if(h)h.textContent=s.deaths;
    const a=document.getElementById('arena');a.style.animation='shake .25s';setTimeout(()=>a.style.animation='',280);
  }

  respawn(){
    const lvl=this.state.lvl;const p=this.state.player;
    if(!lvl||!p)return;
    if(this.state.checkX>=0&&this.state.checkY>=0){
      p.x=this.state.checkX;p.y=this.state.checkY;
    }else{
      p.x=lvl.sx*CS+CS/2-PLAYER_W/2;p.y=lvl.sy*CS-PLAYER_H;
    }
    p.vx=0;p.vy=0;p.onGround=false;p.eyeAng=0;p.stretch=1;p.lean=0;
    p.trailPts=[];p.hasDoubleJump=false;p.jumpsLeft=1;p.hasShield=false;p.speedBoost=0;p.hasSlowFall=false;
    this.state.dying=false;this.state.invinTimer=INVIN_DUR;this.state.gravFlip=false;this.state.gravTimer=0;
  }

  handleExit(ec,er){
    if(Math.random()<0.5){this.setTile(ec,er,4);sfx('troll');this._showMsg('NICE TRY - NOT THE EXIT');setTimeout(()=>this.setTile(ec,er,8),1500);return;}
    sfx('win');
    const s=this.state,sv=window._save;sv.totalWins++;
    const stars=calcStars(s.deaths);
    if(!sv.stars[s.lvlIdx]||sv.stars[s.lvlIdx]<stars)sv.stars[s.lvlIdx]=stars;
    if(!sv.bestDeaths[s.lvlIdx]||s.deaths<sv.bestDeaths[s.lvlIdx])sv.bestDeaths[s.lvlIdx]=s.deaths;
    addXP(100+Math.max(0,3-stars)*50);sv.coins+=10+stars*5;
    submitLB(s.lvlIdx,'PLAYER',s.deaths);
    writeSave();
    if(s.deaths===0)checkAchievement('unkillable');
    if(sv.totalJumps>=1000)checkAchievement('jumper');
    const nonTutCount=this.levels.filter(l=>l.id!=='tutorial').length;
    if(s.lvl?.id!=='tutorial'&&s.lvlIdx>=nonTutCount-1)checkAchievement('zoneClear');
    if(s.lvl?.id!=='tutorial'&&sv.totalDeaths<=100&&s.lvlIdx>=nonTutCount-1)checkAchievement('speedrun');
    const all3=this.levels.filter(l=>l.id!=='tutorial').every((_,i)=>sv.stars[i]===3);
    if(all3)checkAchievement('completionist');
    // Daily check
    if(s.deaths<=3&&s.lvl?.id!=='tutorial'){const dc=getDailyChallenge();if(!dc.done){sv.dailyDone=true;sv.lastDaily=`${dailySeed()}`;sv.streak++;addXP(dc.xp);sv.coins+=dc.coins;if(sv.streak>=3)checkAchievement('streak3');if(sv.streak>=7)checkAchievement('streak7');writeSave();sfx('coin');this._showMsg('DAILY COMPLETE!');}}
    if(s.lvlIdx===4&&s.deaths<=5&&s.lvl?.id!=='tutorial'){const wc=getWeeklyChallenge();if(!wc.done){sv.weeklyDone[weeklySeed()]=true;addXP(wc.xp);sv.coins+=wc.coins;sv.gems+=wc.gems;writeSave();sfx('coin');this._showMsg('WEEKLY COMPLETE!');}}

    const nonTutCount=this.levels.filter(l=>l.id!=='tutorial').length;
    const isLastNormal=s.lvlIdx>=nonTutCount-1;
    if(s.lvl?.id==='tutorial'){
      // Tutorial complete - go to main game
      this._showOverlay('TUTORIAL COMPLETE','','','PLAY GAME',()=>{this.loadLevel(0);this._hideOverlay();});
    }else if(isLastNormal){
      // Game complete
      localStorage.setItem('ft_hi',sv.totalDeaths);
      this._showOverlay('YOU SURVIVED',`Total deaths: ${sv.totalDeaths}`,'ALL ZONES CLEARED','PLAY AGAIN',()=>{sv.deaths=0;const h=document.getElementById('hv-deaths');if(h)h.textContent='0';this.loadLevel(0);this._hideOverlay();});
    }else{
      this._showOverlay('ZONE CLEARED',`ZONE ${s.lvlIdx+1} COMPLETE`,`Deaths: ${s.deaths} Stars: ${stars}`,'NEXT ZONE',()=>{this.loadLevel(s.lvlIdx+1);this._hideOverlay();});
    }
  }

  _loop(ts){
    requestAnimationFrame(t=>this._loop(t));
    const s=this.state;if(!s.running||s.paused)return;
    if(this._lastTS===0)this._lastTS=ts;
    const dt=Math.min((ts-this._lastTS)*0.001,MAX_DT);this._lastTS=ts;
    this._step(TARGET_DT);this.render();
  }

  _step(dt){
    const s=this.state;
    if(s.flashTimer>0)s.flashTimer=Math.max(0,s.flashTimer-dt);
    if(s.invinTimer>0)s.invinTimer=Math.max(0,s.invinTimer-dt);
    if(s.gravTimer>0){s.gravTimer=Math.max(0,s.gravTimer-dt);if(s.gravTimer===0){s.gravFlip=false;this._showMsg('GRAVITY RESTORED');}}
    // update entities
    const ents=s.entities;
    for(let i=ents.length-1;i>=0;i--){ents[i].update(dt,this);if(ents[i]._dead)ents.splice(i,1);}
    if(s.dying){s.deathTimer=Math.max(0,s.deathTimer-dt);if(s.deathTimer===0)this.respawn();return;}
    const p=s.player;if(!p)return;
    const gDir=s.gravFlip?-1:1;
    p.vy+=GRAVITY*gDir*dt;
    if(Math.abs(p.vy)>MAX_FALL)p.vy=MAX_FALL*Math.sign(p.vy);
    const spd=p.speedBoost>0?MOVE_SPD*1.5:MOVE_SPD;
    if(this.keys.left)p.vx=-spd;else if(this.keys.right)p.vx=spd;else p.vx=0;
    if(this.keys.jump&&(p.onGround||s.gravFlip)){
      p.vy=JUMP_VEL*(s.gravFlip?-1:1);p.onGround=false;p.stretch=1.3;sfx('jump');
      window._save.totalJumps++;writeSave();this.keys.jump=false;p.jumpsLeft=p.hasDoubleJump?2:1;
    }else if(this.keys.jump&&p.hasDoubleJump&&p.jumpsLeft>0&&!p.onGround){
      p.vy=JUMP_VEL*(s.gravFlip?-1:1);p.jumpsLeft--;sfx('jump');this.keys.jump=false;p.stretch=1.3;
    }
    p.trailPts.push({x:p.x,y:p.y});if(p.trailPts.length>6)p.trailPts.shift();
    p.onGround=false;
    const rx=this._sx(p.x,p.y,p.vx*dt);if(rx.hw)p.vx=0;p.x=rx.nx;
    const ry=this._sy(p.x,p.y,p.vy*dt);
    if(ry.hf){p.onGround=true;p.vy=0;p.y=Math.round(ry.ny);p.stretch=1;p.jumpsLeft=p.hasDoubleJump?2:1;}
    if(ry.hc)p.vy=0;else p.y=ry.ny;
    this._csf(p.x,p.y,p.vy);
    if(!p.onGround)p.stretch=1+(p.vy<0?0.2:-0.1);else p.stretch=1;
    p.lean=0;p.eyeAng=0;p.blinking=0;
    if(this._ts(p.x,p.y))this.killPlayer();
    if(p.y>this.canvas.height+CS||p.y<-CS*2)this.killPlayer();
    this._ct();this._ufb(dt);
    const c0=Math.floor(p.x/CS),c1=Math.floor((p.x+PLAYER_W-1)/CS),r0=Math.floor(p.y/CS),r1=Math.floor((p.y+PLAYER_H-1)/CS);
    outer:for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){if(this.tileAt(c,r)===8){this.handleExit(c,r);break outer;}}
    window._save.playTime+=dt;
  }

  render(){
    const lvl=this.state.lvl;
    if(!lvl){
      this.ctx.fillStyle='#04060f';this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      this.ctx.fillStyle='#335';this.ctx.font='14px monospace';this.ctx.textAlign='center';
      this.ctx.fillText('LOADING...',this.canvas.width/2,this.canvas.height/2);
      return;
    }
    this._drawBG();this._drawGrav();
    for(let r=0;r<lvl.ph;r++)for(let c=0;c<lvl.pw;c++){const t=this.tileAt(c,r);if(t!==0)this._drawT(c,r,t);}
    this._drawFB();
    for(const e of this.state.entities)e.draw(this.ctx,this);
    this._drawP();this._drawDA();this._drawF();
  }
  _drawBG(){
    const ctx=this.ctx;ctx.fillStyle=PAL.bg;ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    ctx.strokeStyle='rgba(20,40,60,.4)';ctx.lineWidth=0.5;
    for(let x=0;x<this.canvas.width;x+=CS){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.canvas.height);ctx.stroke();}
    for(let y=0;y<this.canvas.height;y+=CS){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.canvas.width,y);ctx.stroke();}
  }
  _drawGrav(){if(!this.state.gravFlip)return;this.ctx.fillStyle=`rgba(255,0,170,${0.04+Math.sin(Date.now()*0.01)*0.02})`;this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);}
  _drawF(){if(this.state.flashTimer>0){this.ctx.fillStyle=`rgba(255,50,64,${(this.state.flashTimer/FLASH_DUR)*0.45})`;this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);}}
  _drawT(col,row,t){
    const ctx=this.ctx,x=col*CS,y=row*CS,s=CS;
    if(t===1){
      const g=ctx.createLinearGradient(x,y,x,y+s);g.addColorStop(0,PAL.floor);g.addColorStop(1,PAL.steel);
      ctx.fillStyle=g;ctx.fillRect(x+1,y+1,s-2,s-2);
      ctx.strokeStyle=PAL.floorG;ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,s-2,s-2);
    }else if(t===3||t===4){
      ctx.fillStyle=PAL.spike;const mid=x+s/2,tip=y+2,base=y+s-2,hw=s*0.4;
      ctx.beginPath();ctx.moveTo(mid,tip);ctx.lineTo(mid+hw,base);ctx.lineTo(mid-hw,base);ctx.closePath();ctx.fill();
      ctx.strokeStyle=PAL.spikeG;ctx.lineWidth=1.5;ctx.stroke();
    }else if(t===5){ctx.fillStyle=PAL.fake;ctx.fillRect(x+2,y+2,s-4,s-4);ctx.strokeStyle='rgba(160,120,255,.6)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.strokeRect(x+2,y+2,s-4,s-4);ctx.setLineDash([]);
    }else if(t===6){ctx.fillStyle=PAL.ghost;ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle='rgba(40,255,150,.5)';ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.strokeRect(x+1,y+1,s-2,s-2);ctx.setLineDash([]);
    }else if(t===7){ctx.fillStyle='#100820';ctx.fillRect(x+1,y+1,s-2,s-2);ctx.fillStyle='rgba(255,0,170,.25)';ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle=PAL.grav;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+s/2,y+4);ctx.lineTo(x+s/2-4,y+9);ctx.lineTo(x+s/2+4,y+9);ctx.closePath();ctx.fill();ctx.moveTo(x+s/2,y+s-4);ctx.lineTo(x+s/2-4,y+s-9);ctx.lineTo(x+s/2+4,y+s-9);ctx.closePath();ctx.fill();
    }else if(t===8){const p=Math.sin(Date.now()*0.005)*0.4+0.6;ctx.fillStyle=`rgba(0,255,200,${p*0.18})`;ctx.fillRect(x,y,s,s);ctx.strokeStyle=`rgba(0,255,200,${p})`;ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,s-4,s-4);ctx.fillStyle=`rgba(0,255,200,${p})`;ctx.font=`bold ${s*0.5}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('E',x+s/2,y+s/2);}
  }
  _drawFB(){const ctx=this.ctx;for(const fb of this.state.fallingBlocks){const x=fb.c*CS,y=fb.fy,s=CS;const g=ctx.createLinearGradient(x,y,x,y+s);g.addColorStop(0,'#e04020');g.addColorStop(1,'#802010');ctx.fillStyle=g;ctx.fillRect(x+1,y+1,s-2,s-2);ctx.strokeStyle='#ff8060';ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,s-2,s-2);}}
  _drawP(){
    if(this.state.dying)return;
    const p=this.state.player,ctx=this.ctx;
    const skin=SKIN_DB[window._save.equippedSkin]||SKIN_DB.default;
    const inv=this.state.invinTimer>0&&Math.floor(this.state.invinTimer/(4/60))%2===0;
    const px=Math.round(p.x),py=Math.round(p.y),w=PLAYER_W,h=PLAYER_H;
    for(let i=0;i<p.trailPts.length;i++){const tp=p.trailPts[i];ctx.fillStyle=`rgba(0,255,200,${(i/p.trailPts.length)*0.25})`;ctx.fillRect(tp.x+3,tp.y+3,w-6,h-6);}
    ctx.save();ctx.translate(px+w/2,py+h/2);if(p.lean)ctx.rotate((p.lean/MOVE_SPD)*0.08);ctx.scale(1/p.stretch,p.stretch);const hw=w/2,hh=h/2;
    ctx.fillStyle=inv?'rgba(200,240,255,.6)':skin.color;
    ctx.fillRect(-hw,-hh,w,h);
    ctx.strokeStyle=this.state.gravFlip?PAL.grav:skin.eye;ctx.lineWidth=1.5;ctx.strokeRect(-hw,-hh,w,h);
    const ex=Math.cos(p.eyeAng)*3,ey=Math.sin(p.eyeAng)*2,eR=w*0.28;
    if(p.hasShield){ctx.strokeStyle='rgba(68,170,255,0.5)';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.strokeRect(-hw-3,-hh-3,w+6,h+6);ctx.setLineDash([]);}
    ctx.fillStyle=skin.eye;ctx.beginPath();ctx.arc(ex,ey,eR,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=PAL.pupil;ctx.beginPath();ctx.arc(ex+Math.cos(p.eyeAng)*eR*0.4,ey+Math.sin(p.eyeAng)*eR*0.4,eR*0.45,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(ex-eR*0.3,ey-eR*0.3,eR*0.22,0,Math.PI*2);ctx.fill();
    if(p.blinking>0){ctx.fillStyle=PAL.player;ctx.fillRect(-hw,-hh,w,h/2);}
    ctx.restore();
    if(this.state.gravFlip){ctx.strokeStyle='rgba(255,0,170,.5)';ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.strokeRect(px-2,py-2,w+4,h+4);ctx.setLineDash([]);}
  }
  _drawDA(){
    if(!this.state.dying)return;
    const ctx=this.ctx,p=this.state.player,t=1-(this.state.deathTimer/DEATH_DUR);
    for(let i=0;i<8;i++){const ang=(i/8)*Math.PI*2+t*4,dist=t*CS*1.8,cx=p.x+PLAYER_W/2+Math.cos(ang)*dist,cy=p.y+PLAYER_H/2+Math.sin(ang)*dist,sz=(1-t)*8;ctx.fillStyle=`rgba(255,50,64,${1-t})`;ctx.fillRect(cx-sz/2,cy-sz/2,sz,sz);}
    ctx.save();ctx.globalAlpha=1-t;ctx.fillStyle=PAL.eye;ctx.beginPath();ctx.arc(p.x+PLAYER_W/2,p.y+PLAYER_H/2-t*30,6*(1-t*0.8),0,Math.PI*2);ctx.fill();ctx.restore();
  }
  _showMsg(txt){const el=document.getElementById('h-msg');if(!el)return;el.textContent=txt;el.classList.add('show');clearTimeout(this._msgTimer);this._msgTimer=setTimeout(()=>el.classList.remove('show'),MSG_DUR*1000);}
  _showOverlay(pre,title,sub,btnTxt,btnCb){
    const p=document.getElementById('ov-pre'),t=document.getElementById('ov-title'),s=document.getElementById('ov-sub'),ti=document.getElementById('ov-tip'),b=document.getElementById('ov-start'),o=document.getElementById('overlay');
    if(p)p.textContent=pre;if(t)t.textContent=title;if(s)s.textContent=sub;if(ti)ti.style.display='none';if(b){b.textContent=btnTxt;b.onclick=btnCb;}if(o)o.classList.remove('off');
  }
  _hideOverlay(){const o=document.getElementById('overlay');if(o)o.classList.add('off');}
  _togglePause(){if(!this.state.running||!this.state.started)return;this.state.paused=!this.state.paused;if(this.state.paused)this._showOverlay('PAUSED','','','RESUME',()=>{this.state.paused=false;this._lastTS=performance.now();this._hideOverlay();});}

  _bindAll(){
    document.addEventListener('keydown',e=>{
      if(e.key==='p'||e.key==='P'||e.key==='Escape'){this._togglePause();return;}
      if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')this.keys.left=true;
      if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')this.keys.right=true;
      if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W')this.keys.jump=true;
      e.preventDefault();
    },{passive:false});
    document.addEventListener('keyup',e=>{
      if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')this.keys.left=false;
      if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')this.keys.right=false;
      if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W')this.keys.jump=false;
    });
    // Buttons
    for(const[id,k]of[['btn-l','left'],['btn-r','right'],['btn-jump','jump']])this._btn(id,k);
    document.getElementById('btn-pause')?.addEventListener('click',()=>this._togglePause());
    document.getElementById('ov-start')?.addEventListener('click',()=>{initAudio();this.start();});
    window.addEventListener('resize',()=>{if(this.state.running)this.resizeCanvas();});
    // Menu
    for(const id of['profile','shop','challenges','leaderboard','stats','achievements']){
      document.getElementById('btn-menu-'+id)?.addEventListener('click',()=>showPanel(id));
    }
    document.querySelectorAll('.panel-close').forEach(e=>e.addEventListener('click',hidePanel));
    // Capacitor back button
    try{if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
      window.Capacitor.Plugins.App.addListener('backButton',()=>{
        if(activePanel){hidePanel();}
        else if(this.state.running&&!this.state.paused){this._togglePause();}
        else if(this.state.paused){this._togglePause();}
      });
    }}catch(e){}
  }
  _btn(id,kn){
    const el=document.getElementById(id);if(!el)return;
    el.oncontextmenu=e=>e.preventDefault();
    el.ontouchcancel=e=>{this.keys[kn]=false;el.classList.remove('pressed');};
    const dn=e=>{e.preventDefault();e.stopPropagation();this.keys[kn]=true;el.classList.add('pressed');};
    const up=e=>{e.preventDefault();e.stopPropagation();this.keys[kn]=false;el.classList.remove('pressed');};
    el.addEventListener('touchstart',dn,{passive:false});el.addEventListener('touchend',up,{passive:false});
    el.addEventListener('touchcancel',up,{passive:false});
    if(!('ontouchstart' in window)){
      el.addEventListener('mousedown',dn);el.addEventListener('mouseup',up);
      el.addEventListener('mouseleave',up);
    }
  }
}

/* ========== GLOBAL START ========== */
function startGameClick(){
  dbg('startGameClick');
  if(window._game){
    initAudio();
    window._game.start();
  } else {
    dbg('game not ready, retry');
    setTimeout(startGameClick, 50);
  }
}

/* ========== INIT ========== */
function bootGame(){
  try{
    dbg('boot');
    window._save = loadSave();
    window._game = new Game();
    window.game = window._game;
    window._game.init();
    dbg('running');
  }catch(e){
    dbg('ERR:'+e.message);
    console.error(e);
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){setTimeout(bootGame,50);});
}else{
  setTimeout(bootGame,50);
}
