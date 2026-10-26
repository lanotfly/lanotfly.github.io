/* Keep audio and iOS Now Playing in sync when switching between stations. */
(function(){
  if(window.__radioMutualExclusionInstalled)return;
  var bbc=document.getElementById('radio4-audio');
  var nhk=document.getElementById('nhk-radio-audio');
  if(!bbc||!nhk||window.__radioMutualExclusionInstalled)return;
  window.__radioMutualExclusionInstalled=true;

  function syncNowPlaying(){
    if(!('mediaSession' in navigator))return;
    /* Delegate station identity, cover art and lock-screen actions to the common manager. */
    var bibleAudio=document.getElementById('niv-bible-audio');
    var newsBbc=document.getElementById('news-bbc-audio');
    var newsChronicle=document.getElementById('news-chronicle-audio');
    var newsEnglish=document.getElementById('news-english-audio');
    var newsJapanese=document.getElementById('news-japanese-audio');
    if((bibleAudio&&!bibleAudio.paused)||
       (newsBbc&&!newsBbc.paused)||(newsChronicle&&!newsChronicle.paused)||
       (newsEnglish&&!newsEnglish.paused)||(newsJapanese&&!newsJapanese.paused))return;
    if(!nhk.paused && window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('nhk',nhk,{title:'NHK Radio 1',artist:'NHK らじる★らじる',album:'NHK Radio 1 — Live',artwork:window.LibraryAudioIdentity.getArtwork('nhk')});
    }else if(!bbc.paused && window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('radio4',bbc,{title:'BBC Radio',artist:'BBC Radio',album:'BBC Radio — Live',artwork:window.LibraryAudioIdentity.getArtwork('radio4')});
    }else{
      try{navigator.mediaSession.playbackState='paused';}catch(_){}
    }
  }
  function syncAfterEvents(){
    /* Let the outgoing station's pause event finish before choosing the active session. */
    setTimeout(syncNowPlaying,0);
  }
  bbc.addEventListener('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('radio4');syncAfterEvents();});
  nhk.addEventListener('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('nhk');syncAfterEvents();});
  bbc.addEventListener('pause',syncAfterEvents);
  nhk.addEventListener('pause',syncAfterEvents);
})();
