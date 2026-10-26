/* Shared identity and iOS Now Playing manager for every audio source. */
(function(window,document){
  'use strict';
  if(window.LibraryAudioIdentity)return;
  var root='/assets/images/';
  var fallback=root+'your-library-icon.svg';
  var sources={
    radio4:{title:'BBC Radio',artist:'BBC Radio',album:'BBC Radio — Live',artwork:root+'bbc-radio-4-now-playing.png?v=20261025-1'},
    nhk:{title:'NHK Radio 1',artist:'NHK らじる★らじる',album:'NHK Radio 1 — Live',artwork:root+'nhk-radio-square.png?v=20261025-1'},
    podcastBbc:{title:'Global News Podcast',artist:'BBC News',album:'BBC Global News Podcast',artwork:''},
    podcastChronicle:{title:'News Connect',artist:'Chronicle',album:'Chronicle News Connect',artwork:''},
    kjv:{title:'King James Version',artist:'King James Version (KJV) Audio Bible',album:'King James Version',artwork:'data:image/png;base64,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'},
    podcast:{title:'Podcast',artist:'Personal Library',album:'Personal Library Podcast',artwork:''}
  };
  var activeId=null;
  function absolute(url){try{return new URL(url,window.location.href).href;}catch(_){return fallback;}}
  function validArtwork(url){return typeof url==='string'&&url.trim()&&(/^https?:\/\//i.test(absolute(url))||/^data:image\/png;base64,/i.test(url));}
  function artworkList(url){
    var selected=validArtwork(url)?absolute(url):absolute(fallback);
    return [{src:selected,sizes:'512x512',type:/\.svg(?:[?#]|$)/i.test(selected)?'image/svg+xml':/\.jpe?g(?:[?#]|$)/i.test(selected)?'image/jpeg':'image/png'}];
  }
  function setNowPlaying(id,audio,details){
    details=details||{};
    var base=sources[id]||sources.podcast;
    var meta={
      title:details.title||base.title,
      artist:details.artist||base.artist,
      album:details.album||base.album,
      artwork:artworkList(details.artwork||base.artwork)
    };
    activeId=id;
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata(meta);
      /* Clear transport actions from the previous source before installing this source's controls. */
      try{navigator.mediaSession.setActionHandler('previoustrack',null);navigator.mediaSession.setActionHandler('nexttrack',null);}catch(_){}
      if(audio){
        navigator.mediaSession.setActionHandler('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo(id==='kjv'?'bible':id==='radio4'?'radio4':id==='nhk'?'nhk':id.indexOf('podcast')===0?'podcast':'podcast');audio.play().catch(function(){});});
        navigator.mediaSession.setActionHandler('pause',function(){audio.pause();});
      }
      navigator.mediaSession.playbackState=audio&&!audio.paused?'playing':'paused';
    }catch(_){}
  }
  function clearIfActive(id,audio){
    if(activeId!==id||!audio||!audio.paused)return;
    try{if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';}catch(_){}
  }
  function ensureButtonIcon(button,src,alt){
    if(!button)return;
    var img=button.querySelector('[data-audio-identity-icon]');
    if(!img){img=document.createElement('img');img.dataset.audioIdentityIcon='true';img.alt='';img.width=20;img.height=20;img.decoding='async';img.style.cssText='width:1.25em;height:1.25em;object-fit:contain;vertical-align:middle;flex:none';button.insertBefore(img,button.firstChild);}
    img.src=validArtwork(src)?absolute(src):absolute(fallback);
    if(alt)button.setAttribute('aria-label',alt);
  }
  function installIcons(){
    var icons=[['niv-bible-toggle',sources.kjv.artwork]];
    icons.forEach(function(item){ensureButtonIcon(document.getElementById(item[0]),item[1]);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installIcons,{once:true});else installIcons();
  window.LibraryAudioIdentity={setNowPlaying:setNowPlaying,clearIfActive:clearIfActive,ensureButtonIcon:ensureButtonIcon,getActiveId:function(){return activeId;},getArtwork:function(id){var s=sources[id]||sources.podcast;return s.artwork||absolute(fallback);}};
})(window,document);
