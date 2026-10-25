/* Pull-to-refresh for the installed iOS Home Screen web app and Safari. */
(function(){
  if(window.__libraryPullToRefreshInstalled)return;
  window.__libraryPullToRefreshInstalled=true;
  var startX=0,startY=0,tracking=false,indicator=null;
  function atTop(){return (window.scrollY||document.documentElement.scrollTop||0)<=2;}
  function getIndicator(){
    if(indicator)return indicator;
    indicator=document.createElement('div');
    indicator.className='library-pull-refresh';
    indicator.setAttribute('aria-live','polite');
    indicator.textContent='↓ Pull to refresh';
    document.body.appendChild(indicator);
    return indicator;
  }
  function reset(){
    tracking=false;
    document.body.classList.remove('library-pull-refresh-zone-active');
    if(indicator){indicator.classList.remove('is-pulling','is-ready');indicator.textContent='↓ Pull to refresh';}
  }
  document.addEventListener('touchstart',function(event){
    if(!event.touches||event.touches.length!==1||!atTop())return;
    var target=event.target;
    if(target&&target.closest&&target.closest('#podcast-episode-list, input, select, textarea, button, a, audio'))return;
    startX=event.touches[0].clientX;startY=event.touches[0].clientY;tracking=true;
    document.body.classList.add('library-pull-refresh-zone-active');
  },{passive:true});
  document.addEventListener('touchmove',function(event){
    if(!tracking||!event.touches||!event.touches.length)return;
    var dx=event.touches[0].clientX-startX,dy=event.touches[0].clientY-startY;
    if(Math.abs(dx)>Math.max(25,dy*0.7)){reset();return;}
    if(dy>12&&atTop()){
      var el=getIndicator();
      el.classList.add('is-pulling');
      el.classList.toggle('is-ready',dy>=90);
      el.textContent=dy>=90?'↻ Release to refresh':'↓ Pull to refresh';
      el.style.setProperty('--pull-distance',Math.min(58,Math.max(0,dy*.45))+'px');
      if(event.cancelable)event.preventDefault();
    }
  },{passive:false});
  document.addEventListener('touchend',function(event){
    if(!tracking||!event.changedTouches||!event.changedTouches.length)return;
    var dx=event.changedTouches[0].clientX-startX,dy=event.changedTouches[0].clientY-startY;
    tracking=false;
    if(dy>=90&&dy>Math.abs(dx)*1.4&&atTop()){
      var el=getIndicator();
      el.classList.add('is-pulling','is-ready');
      el.textContent='↻ Refreshing…';
      window.location.reload();
      return;
    }
    reset();
  },{passive:true});
  document.addEventListener('touchcancel',reset,{passive:true});
})();
