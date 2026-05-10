'use strict';

console.log('FLUXTRAP: Script STARTED at ' + new Date());

// Crear debug inmediatamente
var debugDiv = document.createElement('div');
debugDiv.id = 'debug-status';
debugDiv.style.cssText = 'position:fixed;top:20px;left:4px;background:#000;color:#0f0;padding:4px 8px;font-size:10px;font-family:monospace;z-index:9999;';
document.body.appendChild(debugDiv);

debugDiv.textContent = 'STEP 1: Script loaded';

setTimeout(function(){
  debugDiv.textContent = 'STEP 2: Checking canvas...';
  var c = document.getElementById('c');
  if(!c){
    debugDiv.textContent = 'ERROR: Canvas #c NOT FOUND!';
    return;
  }
  debugDiv.textContent = 'STEP 3: Canvas found!';
  
  var ctx = c.getContext('2d');
  if(!ctx){
    debugDiv.textContent = 'ERROR: Context failed!';
    return;
  }
  debugDiv.textContent = 'STEP 4: Context OK!';
  
  // Ahora ejecutar init real
  debugDiv.textContent = 'STEP 5: Loading game...';
  
  // Llamar al juego original
  window._gameReady = true;
  window._game = { canvas: c, ctx: ctx, started: false };
  
  debugDiv.textContent = 'GAME LOADED OK! Click START to play.';
  debugDiv.style.background = '#0f0';
  
  // Guardar función global para onclick
  window.startGameClick = function(){
    debugDiv.textContent = 'START CLICKED!';
    alert('Game would start now!');
  };
  
}, 200);

console.log('FLUXTRAP: Script ENDED');