(function(window){
  'use strict';
  if(window.LibraryPodcastStorage)return;
  function normalizeTitle(episode){
    return String(episode&&(episode.title||episode.pageUrl)||'unknown').trim().toLowerCase().replace(/\\s+/g,' ');
  }
  function episodeKey(showId,episode){
    return 'personal-library-played:'+showId+':title:'+encodeURIComponent(normalizeTitle(episode));
  }
  function legacyEpisodeKey(showId,episode){
    return 'personal-library-played:'+showId+':'+(episode&&(episode.url||episode.pageUrl||episode.title)||'unknown');
  }
  function isPlayed(showId,episode){
    try{
      var key=episodeKey(showId,episode);
      if(localStorage.getItem(key)==='1')return true;
      if(localStorage.getItem(legacyEpisodeKey(showId,episode))==='1'){
        localStorage.setItem(key,'1');
        return true;
      }
    }catch(_){}
    return false;
  }
  function setPlayed(showId,episode,played){
    try{
      var key=episodeKey(showId,episode),legacy=legacyEpisodeKey(showId,episode);
      if(played){localStorage.setItem(key,'1');localStorage.setItem(legacy,'1');}
      else{localStorage.removeItem(key);localStorage.removeItem(legacy);}
    }catch(_){}
  }
  function progressKey(showId,episode,audio){
    var identity=episode&&(episode.pageUrl||episode.url||episode.title)||(audio&&audio.dataset.episodeTitle)||'unknown';
    return 'personal-library-progress:'+showId+':'+identity;
  }
  function saveProgress(audio){
    if(!audio)return;
    var key=audio.dataset.progressKey;
    if(!key||!Number.isFinite(audio.currentTime)||audio.currentTime<0)return;
    try{
      if(Number.isFinite(audio.duration)&&audio.duration>0&&audio.currentTime>=audio.duration-2){localStorage.removeItem(key);return;}
      if(audio.currentTime>0)localStorage.setItem(key,String(audio.currentTime));
    }catch(_){}
  }
  function restoreProgress(audio){
    if(!audio)return;
    var key=audio.dataset.progressKey;
    if(!key||audio.dataset.restoredProgressKey===key||!Number.isFinite(audio.duration)||audio.duration<=0)return;
    audio.dataset.restoredProgressKey=key;
    try{
      var saved=Number(localStorage.getItem(key));
      if(Number.isFinite(saved)&&saved>0&&saved<audio.duration-2)audio.currentTime=saved;
    }catch(_){}
  }
  window.LibraryPodcastStorage={episodeKey:episodeKey,legacyEpisodeKey:legacyEpisodeKey,isPlayed:isPlayed,setPlayed:setPlayed,progressKey:progressKey,saveProgress:saveProgress,restoreProgress:restoreProgress};
})(window);
