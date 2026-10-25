(function(window,document){
  'use strict';
  if(window.LibraryPodcastList)return;
  function create(config){
    var episodeList=document.getElementById('podcast-episode-list');
    if(episodeList&&episodeList.parentNode&&!episodeList.parentNode.classList.contains('podcast-episode-scroll-frame')){
      var scrollFrame=document.createElement('div');scrollFrame.className='podcast-episode-scroll-frame';
      episodeList.parentNode.insertBefore(scrollFrame,episodeList);scrollFrame.appendChild(episodeList);
      ['left','right'].forEach(function(side){var edge=document.createElement('div');edge.className='podcast-episode-scroll-edge podcast-episode-scroll-edge--'+side;edge.setAttribute('aria-hidden','true');scrollFrame.appendChild(edge);});
    }
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
      /* Keep the true total, render every matching episode, and let the fixed-height viewport show about five rows at a time. */
      var totalMatchingEpisodes=visibleEpisodes.length;
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
        var duration=document.createElement('span');duration.className='podcast-episode-duration';
        var rawDuration=episode.duration;
        if(rawDuration!==undefined&&rawDuration!==null&&rawDuration!==''){
          var durationText=String(rawDuration).trim();
          var durationSeconds=0;
          if(/^\d+(?:\.\d+)?$/.test(durationText))durationSeconds=Number(durationText);
          else if(/^\d+(?::\d{1,2}){1,2}$/.test(durationText)){var durationParts=durationText.split(':').map(Number);durationSeconds=durationParts.length===3?durationParts[0]*3600+durationParts[1]*60+durationParts[2]:durationParts[0]*60+durationParts[1];}
          else {
            var iso=durationText.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
            if(iso)durationSeconds=Number(iso[1]||0)*3600+Number(iso[2]||0)*60+Number(iso[3]||0);
          }
          if(durationSeconds>0){var durationHours=Math.floor(durationSeconds/3600),durationMinutes=Math.floor((durationSeconds%3600)/60),durationRemainder=Math.floor(durationSeconds%60);duration.textContent=durationHours?durationHours+':'+String(durationMinutes).padStart(2,'0')+':'+String(durationRemainder).padStart(2,'0'):durationMinutes+':'+String(durationRemainder).padStart(2,'0');}
        }
        var meta=document.createElement('span');meta.className='podcast-episode-meta';
        var state=document.createElement('span');state.className='podcast-episode-state';state.textContent=played?'✓ Played':'○ Unplayed';
        meta.appendChild(state);
        if(duration.textContent)meta.appendChild(duration);
        choose.appendChild(number);choose.appendChild(title);choose.appendChild(meta);
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
      /* The filter is self-explanatory; remove the redundant standalone label "List" if present. */
      if(listModeSelect){
        var filterLabel=document.querySelector('label[for="podcast-list-mode"]');
        if(filterLabel){
          var cleanedLabel=filterLabel.textContent.replace(/\\bList\\b/i,'').replace(/[:：]\\s*$/,'').trim();
          if(cleanedLabel!==filterLabel.textContent.trim())filterLabel.textContent=cleanedLabel;
        }
      }
      if(episodeCount){
        episodeCount.textContent=totalMatchingEpisodes+' '+(totalMatchingEpisodes===1?'episode':'episodes');
        if(!queue.length)episodeCount.textContent='No episodes';
        else if(!totalMatchingEpisodes)episodeCount.textContent=mode==='played'?'0 played episodes':(mode==='unplayed'?'0 unplayed episodes':'0 episodes');
      }
      if(panelStatus){
        if(!queue.length)panelStatus.textContent='No episodes found.';
        else if(!totalMatchingEpisodes)panelStatus.textContent=mode==='played'?'No played episodes yet.':(mode==='unplayed'?'All episodes have been played.':'No episodes available.');
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
