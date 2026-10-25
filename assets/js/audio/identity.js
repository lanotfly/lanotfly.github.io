/* Shared identity and iOS Now Playing manager for every audio source. */
(function(window,document){
  'use strict';
  if(window.LibraryAudioIdentity)return;
  var root='/assets/images/';
  var fallback=root+'your-library-icon.svg';
  var sources={
    radio4:{title:'BBC Radio',artist:'BBC Radio',album:'BBC Radio — Live',artwork:root+'bbc-radio-4-now-playing.png?v=20261025-1'},
    nhk:{title:'NHK Radio 1',artist:'NHK らじる★らじる',album:'NHK Radio 1 — Live',artwork:root+'nhk-radio-square.png?v=20261025-1'},
    newsBbc:{title:'Global News Podcast',artist:'BBC News',album:'BBC Global News Podcast',artwork:''},
    newsChronicle:{title:'News Connect',artist:'Chronicle',album:'Chronicle News Connect',artwork:''},
    kjv:{title:'King James Version',artist:'King James Version (KJV) Audio Bible',album:'King James Version',artwork:root+'your-library-icon.svg'},
    podcast:{title:'Podcast',artist:'Personal Library',album:'Personal Library Podcast',artwork:''}
  };
  var activeId=null;
  function absolute(url){try{return new URL(url,window.location.href).href;}catch(_){return fallback;}}
  function validArtwork(url){return typeof url==='string'&&url.trim()&&/^https?:\/\//i.test(absolute(url));}
  function artworkList(url){
    var selected=validArtwork(url)?absolute(url):absolute(fallback);
    return [{src:selected,sizes:'512x512',type:/\\.svg(?:[?#]|$)/i.test(selected)?'image/svg+xml':'image/png'}];
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
      if(audio){
        navigator.mediaSession.setActionHandler('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo(id==='kjv'?'bible':id==='radio4'?'radio4':id==='nhk'?'nhk':id.indexOf('news')===0?'news':'podcast');audio.play().catch(function(){});});
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
    var icons=[
      ['radio4-toggle',sources.radio4.artwork],
      ['nhk-radio-toggle',sources.nhk.artwork],
      ['niv-bible-toggle',sources.kjv.artwork],
      ['bite-size-toggle','https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/11682128/11682128-1664416592998-35f37c3752d35.jpg'],
      ['lukes-english-toggle','https://i.podnews.network/r/t/150/584554-ad074a45.jpeg'],
      ['library-news-toggle',fallback]
    ];
    icons.forEach(function(item){ensureButtonIcon(document.getElementById(item[0]),item[1]);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installIcons,{once:true});else installIcons();
  window.LibraryAudioIdentity={setNowPlaying:setNowPlaying,clearIfActive:clearIfActive,ensureButtonIcon:ensureButtonIcon,getActiveId:function(){return activeId;},getArtwork:function(id){var s=sources[id]||sources.podcast;return s.artwork||absolute(fallback);}};
})(window,document);
