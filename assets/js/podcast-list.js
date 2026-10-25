(function(window,document){
  'use strict';
  if(window.LibraryPodcastList)return;
  function create(config){
    var episodeList=document.getElementById('podcast-episode-list');
    var episodeCount=document.getElementById('podcast-episode-count');
    var panelStatus=document.getElementById('podcast-panel-status');
    var listModeSelect=document.getElementById('podcast-list-mode');
    function render(){
      if(!episodeList)return;
      episodeList.textContent='';
      var queue=config.getQueue(),currentIndex=config.getIndex();
      var mode=config.getListMode(),panelMode=config.getPanelMode();
      var visibleEpisodes=queue.map(function(episode,index){
        return {episode:episode,index:index,played:config.isPlayed(episode)};
      }).filter(function(item){
        /* An episode is Played only after it has actually finished or the user marks it manually. */
        if(mode==='played')return item.played;
        if(mode==='all')return true;
        return !item.played;
      });
      /* Keep the panel short and page scrolling natural: show only five rows, never an inner scroller.
         All = first five feed items; Played = first five played items in feed order;
         Unplayed = first five unplayed items, beginning with the oldest unplayed episode. */
      visibleEpisodes=visibleEpisodes.slice(0,5);
      visibleEpisodes.forEach(function(item){
        var episode=item.episode,index=item.index,played=item.played;
        var isCurrent=index===currentIndex;
        var isPlaying=isCurrent&&config.isPlaying();
        var row=document.createElement('div');row.className='podcast-episode-row';row.setAttribute('role','listitem');row.dataset.episodeIndex=String(index);
        var choose=document.createElement('button');choose.type='button';choose.className='podcast-episode-choice';
        if(isCurrent)choose.classList.add('is-current');
        if(isPlaying)choose.classList.add('is-playing');
        choose.setAttribute('aria-current',isCurrent?'true':'false');
        choose.setAttribute('aria-pressed',String(isPlaying));
        choose.setAttribute('aria-label',(isCurrent?(isPlaying?'Pause episode: ':'Play episode: '):'Play episode: ')+(episode.title||('Episode '+(index+1))));
        var number=document.createElement('span');number.className='podcast-episode-number';number.textContent=isCurrent?(isPlaying?'Ⅱ':'▶'):String(index+1);
        var title=document.createElement('span');title.className='podcast-episode-name';title.textContent=episode.title||('Episode '+(index+1));
        var state=document.createElement('span');state.className='podcast-episode-state';state.textContent=played?'✓ Played':'○ Unplayed';
        choose.appendChild(number);choose.appendChild(title);choose.appendChild(state);
        var touchStartX=null,touchStartY=null,swipeHandled=false;
        choose.addEventListener('click',function(event){
          if(swipeHandled){event.preventDefault();event.stopImmediatePropagation();swipeHandled=false;return;}
          if(!config.getActiveId())return;
          if(index===config.getIndex())config.toggleCurrentEpisode();
          else config.playEpisodeAt(index);
        });
        row.addEventListener('touchstart',function(event){
          if(!event.changedTouches||!event.changedTouches.length)return;
          touchStartX=event.changedTouches[0].clientX;touchStartY=event.changedTouches[0].clientY;swipeHandled=false;
          row.classList.remove('is-swiping-left','is-swiping-right','is-swiping');choose.style.transform='';
        },{passive:true});
        row.addEventListener('touchmove',function(event){
          if(touchStartX===null||!event.touches||!event.touches.length)return;
          var dx=event.touches[0].clientX-touchStartX,dy=event.touches[0].clientY-touchStartY;
          if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.25){
            row.dataset.swipeLabel=config.isPlayed(episode)?'↶ Unplayed':'✓ Played';
            row.classList.toggle('is-swiping-left',dx<0);row.classList.toggle('is-swiping-right',dx>0);
            choose.style.transform='translateX('+dx+'px)';
            if(event.cancelable)event.preventDefault();
          }
        },{passive:false});
        row.addEventListener('touchend',function(event){
          if(touchStartX===null||!event.changedTouches||!event.changedTouches.length)return;
          var dx=event.changedTouches[0].clientX-touchStartX,dy=event.changedTouches[0].clientY-touchStartY;
          touchStartX=null;touchStartY=null;
          if(Math.abs(dx)>=58&&Math.abs(dx)>Math.abs(dy)*1.25){
            swipeHandled=true;row.classList.add('is-swiping');row.classList.remove('is-swiping-left','is-swiping-right');
            row.classList.add(dx<0?'is-swiping-left':'is-swiping-right');choose.style.transform='translateX('+(dx<0?'-110%':'110%')+')';
            window.setTimeout(function(){
              var markPlayed=!config.isPlayed(episode);
              config.setPlayed(episode,markPlayed);render();
              if(panelStatus)panelStatus.textContent=(markPlayed?'Marked as played: ':'Marked as unplayed: ')+(episode.title||'Episode');
            },170);
          }else{row.classList.remove('is-swiping-left','is-swiping-right');choose.style.transform='';choose.style.removeProperty('--podcast-swipe-distance');}
        },{passive:true});
        row.addEventListener('touchcancel',function(){
          touchStartX=null;touchStartY=null;row.classList.remove('is-swiping-left','is-swiping-right');choose.style.transform='';
        },{passive:true});
        row.appendChild(choose);episodeList.appendChild(row);
      });
      if(listModeSelect&&listModeSelect.value!==mode)listModeSelect.value=mode;
      if(episodeCount){
        var count=visibleEpisodes.length;
        episodeCount.textContent=count+' '+(count===1?'episode':'episodes');
        if(!queue.length)episodeCount.textContent='No episodes';
        else if(!count)episodeCount.textContent=mode==='played'?'0 played episodes':'0 unplayed episodes';
      }
      if(panelStatus){
        if(!queue.length)panelStatus.textContent='No episodes found.';
        else if(!visibleEpisodes.length)panelStatus.textContent=mode==='played'?'No played episodes yet.':'All episodes have been played.';
        else panelStatus.textContent='';
      }
    }
    if(listModeSelect)listModeSelect.addEventListener('change',function(){
      var mode=listModeSelect.value;
      config.setListMode(['unplayed','played','all'].indexOf(mode)>=0?mode:'unplayed');
      render();
    });
    function setCurrent(index,isPlaying){
      if(!episodeList)return;
      episodeList.querySelectorAll('.podcast-episode-row').forEach(function(row){
        var current=Number(row.dataset.episodeIndex)===index;
        var button=row.querySelector('.podcast-episode-choice');
        if(!button)return;
        button.classList.toggle('is-current',current);
        button.classList.toggle('is-playing',current&&isPlaying);
        button.setAttribute('aria-current',current?'true':'false');
        button.setAttribute('aria-pressed',String(current&&isPlaying));
        var number=button.querySelector('.podcast-episode-number');
        var title=button.querySelector('.podcast-episode-name');
        button.setAttribute('aria-label',(current?(isPlaying?'Pause episode: ':'Play episode: '):'Play episode: ')+(title?title.textContent:'Episode'));
        if(number)number.textContent=current?(isPlaying?'Ⅱ':'▶'):String(Number(row.dataset.episodeIndex)+1);
      });
    }
    return {render:render,setCurrent:setCurrent};
  }
  window.LibraryPodcastList={create:create};
})(window,document);
