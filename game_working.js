'use strict';

// Debug simple - ejecutar inmediatamente antes que nada
var _dbg = document.createElement('div');
_dbg.style.cssText = 'position:fixed;top:20px;left:4px;background:#000;color:#0f0;padding:4px 8px;font-size:10px;font-family:monospace;z-index:9999;white-space:pre-wrap;max-width:180px;';
_dbg.textContent = 'JS: Loading...';
document.body.appendChild(_dbg);

function dbg(msg){
  _dbg.textContent = msg;
  console.log('DBG:', msg);
}

dbg('STEP 1: Script loaded');

setTimeout(function(){
  dbg('STEP 2: Checking canvas...');
  var c = document.getElementById('c');
  if(!c){
    dbg('ERROR: Canvas NOT FOUND');
    return;
  }
  
  dbg('STEP 3: Getting context...');
  var ctx = c.getContext('2d');
  if(!ctx){
    dbg('ERROR: Context failed');
    return;
  }
  
  dbg('STEP 4: Creating game...');
  
  // Create simple game object
  var Game = function(){
    this.canvas = c;
    this.ctx = ctx;
    this.running = false;
    this.keys = {left:false, right:false, jump:false};
    dbg('Game created');
  };
  
  Game.prototype.start = function(){
    dbg('START: Loading levels...');
    this.running = true;
    
    // Hide overlay
    var overlay = document.getElementById('overlay');
    if(overlay) overlay.classList.add('off');
    
    dbg('START: Game running!');
    this.drawTest();
  };
  
  Game.prototype.drawTest = function(){
    // Draw something simple
    this.ctx.fillStyle = '#04060f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#00ffcc';
    this.ctx.font = '20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME RUNNING!', this.canvas.width/2, this.canvas.height/2);
  };
  
  Game.prototype._togglePause = function(){
    dbg('Pause toggled');
  };
  
  window._game = new Game();
  window.game = window._game;
  
  dbg('STEP 5: Game ready!');
  _dbg.style.background = '#0f0';
  
  // Bind start button
  var startBtn = document.getElementById('ov-start');
  if(startBtn){
    startBtn.onclick = function(){
      dbg('BTN: Clicked start');
      window._game.start();
    };
    dbg('STEP 6: Button bound');
  }else{
    dbg('ERROR: Start button not found');
  }
  
}, 100);

dbg('STEP 0: Script ended');