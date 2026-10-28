/* Pull down to reveal a small overlay menu; the page and navigation stay in place. */
(function(){
  if(window.__libraryPullToRefreshInstalled)return;
  window.__libraryPullToRefreshInstalled=true;
  var startX=0,startY=0,tracking=false,toolbar=null;
  var revealThreshold=55;
  function atTop(){return (window.scrollY||document.documentElement.scrollTop||0)<=2;}
  function getToolbar(){
    if(toolbar)return toolbar;
    toolbar=document.createElement('div');
    toolbar.className='library-pull-actions';
    toolbar.setAttribute('role','group');
    toolbar.setAttribute('aria-label','Page actions');
    toolbar.innerHTML='<button type="button" class="library-pull-action library-pull-action--refresh" aria-label="Refresh page" title="Refresh page"><span aria-hidden="true">↻</span><span class="library-pull-action__label">Refresh</span></button><button type="button" class="library-pull-action library-pull-action--theme" aria-label="Switch light/dark mode" title="Switch light/dark mode"><span aria-hidden="true">☯</span><span class="library-pull-action__label">Theme</span></button>';
    toolbar.querySelector('.library-pull-action--refresh').addEventListener('click',function(){window.location.reload();});
    toolbar.querySelector('.library-pull-action--theme').addEventListener('click',function(){
      var themeButton=document.getElementById('site-theme-toggle');
      if(themeButton)themeButton.click();
    });
    document.body.appendChild(toolbar);
    return toolbar;
  }
  function reveal(){
    getToolbar().classList.add('is-visible');
    document.body.classList.remove('library-pull-refresh-zone-active');
  }
  function hide(){
    if(toolbar){toolbar.classList.remove('is-visible','is-pulling');toolbar.style.removeProperty('--pull-progress');}
  }
  function reset(){
    tracking=false;
    document.body.classList.remove('library-pull-refresh-zone-active');
  }
  document.addEventListener('touchstart',function(event){
    if(!event.touches||event.touches.length!==1||!atTop())return;
    var target=event.target;
    if(target&&target.closest&&target.closest('#podcast-episode-list, input, select, textarea, button, a, audio, .library-pull-actions'))return;
    startX=event.touches[0].clientX;
    startY=event.touches[0].clientY;
    tracking=true;
    document.body.classList.add('library-pull-refresh-zone-active');
  },{passive:true});
  document.addEventListener('touchmove',function(event){
    if(!tracking||!event.touches||!event.touches.length)return;
    var dx=event.touches[0].clientX-startX,dy=event.touches[0].clientY-startY;
    if(Math.abs(dx)>Math.max(25,dy*.7)){reset();moveNav(0);if(toolbar)toolbar.classList.remove('is-pulling');return;}
    if(dy>12&&atTop()){
            if(dy>=revealThreshold){
        var el=getToolbar();
        el.style.setProperty('--pull-progress',Math.min(1,dy/80));
        el.classList.add('is-pulling');
      } else if(toolbar) toolbar.classList.remove('is-pulling');
      if(event.cancelable)event.preventDefault();
    }
  },{passive:false});
  document.addEventListener('touchend',function(event){
    if(!tracking||!event.changedTouches||!event.changedTouches.length)return;
    var dx=event.changedTouches[0].clientX-startX,dy=event.changedTouches[0].clientY-startY;
    tracking=false;
    if(dy>=revealThreshold&&dy>Math.abs(dx)*1.2&&atTop()){
      reveal();
      if(toolbar)toolbar.classList.remove('is-pulling');
      return;
    }
    if(toolbar)toolbar.classList.remove('is-pulling');
    moveNav(0);
    reset();
  },{passive:true});
  document.addEventListener('touchcancel',function(){if(toolbar)toolbar.classList.remove('is-pulling');moveNav(0);reset();},{passive:true});
  document.addEventListener('click',function(event){
    if(toolbar&&toolbar.classList.contains('is-visible')&&!event.target.closest('.library-pull-actions'))hide();
  });
  window.addEventListener('scroll',function(){if(!atTop())hide();},{passive:true});
})();
