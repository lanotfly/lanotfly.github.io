/* Podcast engine: feed loading, playback and progress events. List and storage are separate modules. */
(function(){
  if(window.__libraryPodcastPlayerInstalled)return;
  window.__libraryPodcastPlayerInstalled=true;
  var audio=document.getElementById('podcast-audio');
  if(!audio)return;
  var shows={
    'bite-size-toggle':{
      title:'The Bite Size Japanese Podcast',
      artist:'Layla from Bite Size Japanese',
      feed:'https://anchor.fm/s/463a19c0/podcast/rss',
      proxyFeed:true,
      apple:'https://podcasts.apple.com/jp/podcast/the-bite-size-japanese-podcast/id1588405417?l=en-US',
      artwork:'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/11682128/11682128-1664416592998-35f37c3752d35.jpg',
      artworkSize:'600x600'
    },
    'lukes-english-toggle':{
      title:'Easy Natural English with Liam',
      artist:'Liam',
      feed:'https://anchor.fm/s/1258881c/podcast/rss',
      proxyFeed:true,
      apple:'https://podcasts.apple.com/jp/podcast/easy-natural-english-with-liam/id1495535233?l=en-US',
      artwork:'https://i.podnews.network/r/t/150/584554-ad074a45.jpeg',
      artworkSize:'150x150'
    }
  };
  var activeId=null;
  /* Initialize queue state before the first render below. */
  var episodeQueue=[];
  var episodeIndex=-1;
  var panel=document.getElementById('podcast-episode-panel');
  var panelTitle=document.getElementById('podcast-panel-title');
  var panelArtwork=document.getElementById('podcast-panel-artwork');
  var episodeCount=document.getElementById('podcast-episode-count');
  var panelStatus=document.getElementById('podcast-panel-status');
  var episodeList=document.getElementById('podcast-episode-list');
  var closePanel=document.getElementById('podcast-panel-close');
  var progressWrap=document.getElementById('podcast-progress-wrap');
  var progressSlider=document.getElementById('podcast-progress');
  var currentTimeLabel=document.getElementById('podcast-current-time');
  var durationLabel=document.getElementById('podcast-duration');
  function formatTime(seconds,roundToMinute){
    if(!Number.isFinite(seconds)||seconds<0)return '';
    var minutes=Math.max(0,roundToMinute?Math.round(seconds/60):Math.floor(seconds/60));
    var hours=Math.floor(minutes/60),remainder=minutes%60;
    if(hours)return hours+'h'+(remainder?' '+remainder+'m':'');
    return minutes+'m';
  }
  function updateProgress(){
    var duration=audio.duration,current=audio.currentTime||0;
    var hasDuration=Number.isFinite(duration)&&duration>0;
    if(progressWrap)progressWrap.hidden=!audio.src;
    if(progressSlider){
      if(hasDuration){
        if(!progressSlider.matches(':active'))progressSlider.value=String(Math.round(current/duration*1000));
        progressSlider.disabled=false;
      }else{
        progressSlider.value='0';
        progressSlider.disabled=true;
      }
    }
    /* The episode row already shows duration; keep the progress control clean. */
    if(currentTimeLabel)currentTimeLabel.textContent='';
    if(durationLabel)durationLabel.textContent='';
  }
  if(progressSlider)progressSlider.addEventListener('input',function(){
    if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(progressSlider.value)/1000)*audio.duration;
  });
  function progressStorageKey(episode){return window.LibraryPodcastStorage.progressKey(activeId,episode,audio);}
  function savePlaybackProgress(){window.LibraryPodcastStorage.saveProgress(audio);}
  function restorePlaybackProgress(){window.LibraryPodcastStorage.restoreProgress(audio);}
  ['loadedmetadata','durationchange','timeupdate','seeking','seeked'].forEach(function(eventName){audio.addEventListener(eventName,function(){
    if(eventName==='loadedmetadata'||eventName==='durationchange')restorePlaybackProgress();
    if(eventName==='timeupdate')savePlaybackProgress();
    updateProgress();
  });});
  ['play','pause','ended'].forEach(function(eventName){
    audio.addEventListener(eventName,function(){
      if(episodeListModule&&episodeListModule.setCurrent&&episodeIndex>=0){
        episodeListModule.setCurrent(episodeIndex,eventName==='play'&&!audio.paused&&!audio.ended);
      }
    });
  });
  window.addEventListener('pagehide',savePlaybackProgress);
  var panelContent=document.getElementById('podcast-episode-panel-content');
  function showPanel(show,episodeTitle){if(panel)panel.hidden=false;if(panelTitle)panelTitle.textContent=episodeTitle||audio.dataset.episodeTitle||'';if(panelArtwork){panelArtwork.src=show.artwork||'';panelArtwork.alt=show.title?show.title+' artwork':'';panelArtwork.hidden=!show.artwork;}}
  /* Two panel states: collapsed header or expanded five-episode queue. */
  var episodePanelMode='collapsed';
  function setEpisodePanelMode(mode){
    episodePanelMode=mode;
    var collapsed=mode==='collapsed';
    if(panelContent)panelContent.hidden=collapsed;
    if(closePanel){
      var nextMode=mode==='collapsed'?'full':'collapsed';
      var nextLabel=nextMode==='full'?'Collapse podcast list':'Expand podcast list';
      closePanel.setAttribute('aria-expanded',String(!collapsed));
      closePanel.setAttribute('aria-label',nextLabel);
      closePanel.title=nextLabel;
      closePanel.classList.toggle('is-collapsed',collapsed);
      closePanel.classList.toggle('is-compact',mode==='compact');
    }
    if(panel){
      panel.classList.toggle('is-collapsed',collapsed);
      panel.classList.toggle('is-compact',mode==='compact');
    }
    renderEpisodeList();
  }
  if(closePanel)closePanel.addEventListener('click',function(){
    setEpisodePanelMode(episodePanelMode==='collapsed'?'full':'collapsed');
  });
  var episodeListMode='unplayed';
  var listModeSelect=document.getElementById('podcast-list-mode');
  function isEpisodePlayed(episode){return window.LibraryPodcastStorage.isPlayed(activeId,episode);}
  function setEpisodePlayed(episode,played){window.LibraryPodcastStorage.setPlayed(activeId,episode,played);}
  var episodeListModule=window.LibraryPodcastList.create({
    getQueue:function(){return episodeQueue;},
    getIndex:function(){return episodeIndex;},
    getListMode:function(){return episodeListMode;},
    setListMode:function(mode){episodeListMode=mode;},
    getPanelMode:function(){return episodePanelMode;},
    getActiveId:function(){return activeId;},
    isPlayed:isEpisodePlayed,
    setPlayed:setEpisodePlayed,
    isPlaying:function(){return !audio.paused&&!audio.ended;},
    toggleCurrentEpisode:function(){
      if(!activeId||episodeIndex<0||episodeIndex>=episodeQueue.length)return;
      var show=shows[activeId];
      if(!audio.paused&&!audio.ended){
        audio.pause();
        return;
      }
      stopOtherAudio();
      setMetadata(show,audio.dataset.episodeTitle||episodeQueue[episodeIndex].title||show.title);
      if(audio.src){
        audio.play().catch(function(){
          if(panelStatus)panelStatus.textContent='Playback was blocked by the browser. Tap the episode again or open the podcast in Apple Podcasts.';
        });
      }else{
        playEpisodeAt(episodeIndex);
      }
    },
    playEpisodeAt:function(index){playEpisodeAt(index);}
  });
  function renderEpisodeList(){episodeListModule.render();}
  setEpisodePanelMode('collapsed');
  /* Re-render with the IndexedDB-backed played-state cache once migration finishes. */
  if(window.LibraryPodcastStorage&&window.LibraryPodcastStorage.ready){
    window.LibraryPodcastStorage.ready.then(function(){renderEpisodeList();});
  }
  function paint(id,playing){
    var button=document.getElementById(id);
    if(!button)return;
    var coordinator=window.LibraryAudioCoordinator;
    var activeTarget=coordinator&&coordinator.getActiveTarget?coordinator.getActiveTarget():null;
    var bbcAudio=document.getElementById('radio4-audio');
    var nhkAudio=document.getElementById('nhk-radio-audio');
    var bibleAudio=document.getElementById('niv-bible-audio');
    var otherAudioIsPlaying=(bbcAudio&&!bbcAudio.paused)||(nhkAudio&&!nhkAudio.paused)||(bibleAudio&&!bibleAudio.paused);
    var selected=id===activeId&&!otherAudioIsPlaying&&(!activeTarget||activeTarget==='podcast');
    button.setAttribute('aria-pressed',String(selected));
    button.classList.toggle('is-playing',playing);
    button.classList.toggle('is-selected',selected);
    var show=shows[id];
    button.setAttribute('aria-label',(playing?'Pause ':'Play latest episode: ')+show.title);
    button.title=(playing?'Pause ':'Play latest episode: ')+show.title;
  }
  function refreshPodcastSelection(playingId){
    Object.keys(shows).forEach(function(id){paint(id,id===playingId);});
  }
  function setMetadata(show,episode){
    var details={title:episode||show.title,artist:show.artist,album:show.title,artwork:show.artwork};
    if(window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('podcast',audio,details);
      return;
    }
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:details.title,artist:details.artist,album:details.album,artwork:[{src:details.artwork,sizes:show.artworkSize||'600x600',type:'image/jpeg'}]});
      navigator.mediaSession.setActionHandler('play',function(){audio.play().catch(function(){});});
      navigator.mediaSession.setActionHandler('pause',function(){audio.pause();});
      navigator.mediaSession.playbackState=audio.paused?'paused':'playing';
    }catch(_){}
  }
  function stopOtherAudio(){
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('podcast');
    Object.keys(shows).forEach(function(id){if(id!==activeId)paint(id,false);});
  }
  function parseRss(xmlText){
    var xml=new DOMParser().parseFromString(xmlText,'text/xml');
    if(xml.querySelector('parsererror'))throw new Error('Invalid RSS feed');
    var items=Array.from(xml.querySelectorAll('item'));
    var episodes=items.map(function(item){
      var enclosure=item.querySelector('enclosure[url]');
      var episodeTitle=item.querySelector('title');
      var children=Array.from(item.getElementsByTagName('*'));
      var durationNode=children.find(function(node){return node.localName.toLowerCase()==='duration';});
      var publishedNode=children.find(function(node){return ['pubdate','published','date','updated'].indexOf(node.localName.toLowerCase())>=0;});
      if(!enclosure)return null;
      return {
        url:enclosure.getAttribute('url'),
        title:episodeTitle?episodeTitle.textContent.trim():'',
        duration:durationNode?durationNode.textContent.trim():'',
        published:publishedNode?publishedNode.textContent.trim():''
      };
    }).filter(function(episode){return !!episode;});
    if(!episodes.length)throw new Error('No playable episodes found');
    return episodes;
  }
  function parseProxyEpisodes(data,show){
    if(!data||data.status!=='ok'||!Array.isArray(data.items)||!data.items.length)throw new Error('No episodes in RSS proxy response');
    var episodes=data.items.map(function(item){
      var enclosure=item.enclosure;
      var mediaUrl=typeof enclosure==='string'?enclosure:
        (enclosure&&(enclosure.link||enclosure.url||enclosure.href||enclosure.src))||
        item.enclosure_url||item.enclosureUrl||item.audio_url||item.audioUrl||item.audio;
      /* RSS hosts often use signed URLs without a visible .mp3/.m4a suffix.
         An RSS enclosure is the media declaration, so don't reject it by URL shape. */
      if(typeof mediaUrl==='string')mediaUrl=mediaUrl.trim();
      if(!/^https?:\/\//i.test(mediaUrl||''))mediaUrl=null;
      var title=String(item.title||item.name||show.title).trim();
      var duration=item.duration||item.itunes_duration||item.itunesDuration||'';
      var published=item.pubDate||item.pubdate||item.published||item.isoDate||item.date||item.updated||'';
      return mediaUrl?{url:mediaUrl,title:title,duration:duration,published:published}:null;
    }).filter(function(episode){return !!episode;});
    if(!episodes.length)throw new Error('No playable episodes in RSS proxy response');
    return episodes;
  }
  function fetchViaAllOrigins(url){
    /* Do not leave the UI stuck on “Loading audio…” if a public CORS proxy hangs. */
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer;
    var options={cache:'no-store'};
    if(controller)options.signal=controller.signal;
    var timeout=new Promise(function(_,reject){
      timer=setTimeout(function(){if(controller)controller.abort();reject(new Error('Proxy request timed out'));},10000);
    });
    return Promise.race([
      fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url),options)
        .then(function(response){if(!response.ok)throw new Error('Proxy request failed');return response.text();}),
      timeout
    ]).finally(function(){clearTimeout(timer);});
  }
  function fetchOfficialArchive(show){
    if(!show.archive)throw new Error('No official archive configured');
    return fetchViaAllOrigins(show.archive).then(function(html){
      var doc=new DOMParser().parseFromString(html,'text/html');
      var seen={};
      var episodes=Array.from(doc.querySelectorAll('a[href]')).map(function(link){
        var url=link.href;
        var title=(link.textContent||'').replace(/\s+/g,' ').trim();
        if(!/^https?:\/\/(www\.)?teacherluke\.co\.uk\/\d{4}\/\d{2}\/\d{2}\//i.test(url))return null;
        if(!title||title.length<8||/download audio|get the pdf|read more|comments/i.test(title))return null;
        if(seen[url])return null;
        seen[url]=true;
        return {url:null,pageUrl:url,title:title};
      }).filter(function(item){return !!item;});
      if(!episodes.length)throw new Error('No episodes found in official archive');
      return episodes;
    });
  }
  function fetchEpisodes(show){
    /* Try the feed directly, then independent public proxies. A failed proxy must not
       prevent the next source from being tried, otherwise the episode list stays empty. */
    function readText(url){
      return fetch(url,{cache:'no-store'}).then(function(response){
        if(!response.ok)throw new Error('RSS source unavailable');
        return response.text();
      }).then(parseRss);
    }
    function readJsonProxy(){
      var proxyUrl='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(show.feed);
      return fetch(proxyUrl,{cache:'no-store'}).then(function(response){
        if(!response.ok)throw new Error('RSS JSON proxy unavailable');
        return response.json();
      }).then(function(data){return parseProxyEpisodes(data,show);});
    }
    return readText(show.feed).catch(function(){
      return readJsonProxy().catch(function(){
        return fetchViaAllOrigins(show.feed).then(parseRss).catch(function(){
          var corsUrl='https://corsproxy.io/?url='+encodeURIComponent(show.feed);
          return readText(corsUrl).catch(function(){
            if(show.archive)return fetchOfficialArchive(show);
            throw new Error('All podcast RSS sources failed');
          });
        });
      });
    });
  }
  function resolveEpisodeAudio(episode){
    if(episode.url)return Promise.resolve(episode.url);
    if(!episode.pageUrl)return Promise.reject(new Error('No episode URL'));
    return fetchViaAllOrigins(episode.pageUrl).then(function(html){
      var doc=new DOMParser().parseFromString(html,'text/html');
      var candidates=[];
      doc.querySelectorAll('audio[src],audio source[src],a[href],meta[property="og:audio"],meta[property="og:audio:secure_url"]').forEach(function(node){
        var url=node.getAttribute('src')||node.getAttribute('href')||node.getAttribute('content')||'';
        if(!/^https?:\/\//i.test(url))return;
        if(/\.(mp3|m4a|aac|mp4|ogg|opus)(\?|#|$)/i.test(url)||/acast\.com\/.*(audio|episode|media)/i.test(url))candidates.push(url);
      });
      var unique=candidates.filter(function(url,index){return candidates.indexOf(url)===index;});
      if(!unique.length)throw new Error('No direct audio link on episode page');
      return unique[0];
    });
  }
  function playEpisodeAt(index){
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('podcast');
    /* Save the outgoing episode before changing episodeIndex or replacing the audio source. */
    savePlaybackProgress();
    if(index<0||index>=episodeQueue.length){
      if(activeId)paint(activeId,false);
      return;
    }
    episodeIndex=index;
    /* Keep the existing progress UI mounted while the next episode loads to avoid list/player flicker. */
    var show=shows[activeId],episode=episodeQueue[episodeIndex];
    if(episodeListModule&&episodeListModule.setCurrent)episodeListModule.setCurrent(episodeIndex,false);
    /* Keep the progress control visible during source changes; update it in place
       when metadata/timeupdate events arrive instead of hiding and recreating it. */
    if(progressWrap)progressWrap.hidden=false;
    if(panelStatus)panelStatus.textContent='Loading audio…';
    resolveEpisodeAudio(episode).then(function(audioUrl){
      episode.url=audioUrl;
      audio.dataset.episodeTitle=episode.title;
      audio.dataset.progressKey=progressStorageKey(episode);
      audio.dataset.restoredProgressKey='';
      audio.src=audioUrl;
      audio.load();
      setMetadata(show,episode.title||show.title);
      return audio.play();
    }).then(function(){
      paint(activeId,true);
      setMetadata(show,episode.title||show.title);
      if(panelStatus)panelStatus.textContent='';
    }).catch(function(){
      paint(activeId,false);
      if(panelStatus){
        panelStatus.textContent='This episode could not be played directly. Open the official episode page instead.';
        var link=document.createElement('a');
        link.href=episode.pageUrl||show.apple;
        link.target='_blank';
        link.rel='noopener noreferrer';
        link.textContent='Open episode';
        link.className='podcast-episode-choice';
        panelStatus.appendChild(document.createTextNode(' '));
        panelStatus.appendChild(link);
      }
    });
  }
  Object.keys(shows).forEach(function(id){
    var button=document.getElementById(id),show=shows[id];
    if(!button)return;
    button.addEventListener('click',function(){
      if(activeId===id&&!audio.paused){showPanel(show);audio.pause();return;}
      if(activeId===id&&audio.paused&&audio.src){showPanel(show);renderEpisodeList();stopOtherAudio();setMetadata(show,audio.dataset.episodeTitle||show.title);audio.play().catch(function(){if(panelStatus)panelStatus.textContent='Playback was blocked by the browser. Tap the episode again or open the podcast in Apple Podcasts.';});return;}
      stopOtherAudio();activeId=id;Object.keys(shows).forEach(function(otherId){paint(otherId,false);});paint(id,false);episodeQueue=[];episodeIndex=-1;episodeListMode='unplayed';if(listModeSelect)listModeSelect.value='unplayed';showPanel(show);setEpisodePanelMode('full');
      if(episodeList)episodeList.textContent='';
      if(panelStatus)panelStatus.textContent='Loading episodes…';
      button.classList.add('is-loading');
      fetchEpisodes(show).then(function(episodes){
        /* Keep episodes previously seen on this device even if the publisher trims its RSS feed. */
        episodeQueue=window.LibraryPodcastStorage.mergeEpisodeHistory(id,episodes);
        /* Start with the first Unplayed episode in the feed's original All episodes order.
           Skip episodes already marked Played instead of always replaying feed item zero. */
        episodeIndex=-1;
        for(var i=0;i<episodeQueue.length;i++){
          if(!isEpisodePlayed(episodeQueue[i])){episodeIndex=i;break;}
        }
        renderEpisodeList();
        if(episodeIndex>=0){
          playEpisodeAt(episodeIndex);
        }else if(panelStatus){
          panelStatus.textContent='No unplayed episodes remain. Choose “All episodes” to replay one.';
        }
      }).catch(function(){
        /* If RSS is temporarily unavailable, still show the locally saved episode archive. */
        var saved=window.LibraryPodcastStorage.getEpisodeHistory(id);
        if(saved.length){
          episodeQueue=saved;
          episodeIndex=-1;
          for(var i=0;i<saved.length;i++){if(!isEpisodePlayed(saved[i])){episodeIndex=i;break;}}
          renderEpisodeList();
          if(panelStatus)panelStatus.textContent='Showing saved episode history; could not refresh the latest RSS feed.';
        }else if(panelStatus){
          panelStatus.textContent='Could not load episodes in this browser. Try again later, or open the podcast in Apple Podcasts.';
        }
      }).finally(function(){button.classList.remove('is-loading');});
    });
  });
  audio.addEventListener('play',function(){
    /* Enforce audio exclusivity even when playback starts from iOS controls. */
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('podcast');
    if(activeId){
      var show=shows[activeId];
      showPanel(show,audio.dataset.episodeTitle||'');
      paint(activeId,true);
      setMetadata(show,audio.dataset.episodeTitle||show.title);
      if(episodeListModule&&episodeListModule.setCurrent&&episodeIndex>=0){
        episodeListModule.setCurrent(episodeIndex,true);
      }
    }
  });
  audio.addEventListener('pause',function(){
    Object.keys(shows).forEach(function(id){paint(id,false);});
    if(episodeListModule&&episodeListModule.setCurrent&&episodeIndex>=0){
      episodeListModule.setCurrent(episodeIndex,false);
    }
    if('mediaSession' in navigator){
      var bbc=document.getElementById('radio4-audio'),nhk=document.getElementById('nhk-radio-audio');
      if((!bbc||bbc.paused)&&(!nhk||nhk.paused)){try{navigator.mediaSession.playbackState='paused';}catch(_){}}
    }
  });
  audio.addEventListener('ended',function(){
    /* A completed episode should restart from the beginning if the user replays it. */
    var completedProgressKey=audio.dataset.progressKey;
    if(completedProgressKey){try{localStorage.removeItem(completedProgressKey);}catch(_){}}
    /* Mark an episode as finished only after it reaches the end, then skip older finished episodes. */
    if(!activeId||episodeIndex<0||episodeIndex>=episodeQueue.length)return;
    setEpisodePlayed(episodeQueue[episodeIndex],true);
    renderEpisodeList();
    var nextIndex=-1;
    for(var i=episodeIndex+1;i<episodeQueue.length;i++){
      if(!isEpisodePlayed(episodeQueue[i])){nextIndex=i;break;}
    }
    if(nextIndex>=0)playEpisodeAt(nextIndex);
    else{paint(activeId,false);if(panelStatus)panelStatus.textContent='No unplayed older episodes remain. Choose “All episodes” in the list filter to replay one.';}
  });
  audio.addEventListener('error',function(){if(activeId)paint(activeId,false);});
})();
