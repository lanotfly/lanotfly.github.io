(function(window,document){
  'use strict';
  if(window.LibraryAudioCoordinator)return;
  var audioIds={radio4:'radio4-audio',nhk:'nhk-radio-audio',podcast:'podcast-audio',bible:'niv-bible-audio',newsBbc:'news-bbc-audio',newsChronicle:'news-chronicle-audio',newsEnglish:'news-english-audio',newsJapanese:'news-japanese-audio'};
  function getAudio(name){return document.getElementById(audioIds[name]);}
  var buttonsBySource={radio4:['radio4-toggle'],nhk:['nhk-radio-toggle'],podcast:[],bible:['niv-bible-toggle']};
  var activeTarget=null;
  var radioToggle=document.getElementById('library-radio-toggle');
  var radioPanel=document.getElementById('library-radio-panel');
  var bookToggle=document.getElementById('library-book-toggle');
  var bookPanel=document.getElementById('library-book-panel');
  var lastRadio='radio4';
  try{lastRadio=localStorage.getItem('library_last_radio_station')==='nhk'?'nhk':'radio4';}catch(_){}
  function clearButtonState(button){
    if(!button)return;
    button.setAttribute('aria-pressed','false');
    button.classList.remove('is-playing','is-selected');
    if(button.id==='radio4-toggle') ['background-color','color','border-color','border-style','box-shadow'].forEach(function(p){button.style.removeProperty(p);});
  }
  function rememberRadio(target){
    if(target!=='radio4'&&target!=='nhk')return;
    lastRadio=target;
    try{localStorage.setItem('library_last_radio_station',target);}catch(_){}
  }
  function closeRadioPanel(){
    if(!radioToggle||!radioPanel)return;
    radioToggle.setAttribute('aria-expanded','false');radioToggle.classList.remove('is-open','is-active');radioPanel.hidden=true;
  }
  function closeBookPanel(){
    if(!bookToggle||!bookPanel)return;
    bookToggle.setAttribute('aria-expanded','false');bookToggle.classList.remove('is-open','is-active');bookPanel.hidden=true;
  }
  function setBookPanelOpen(open){
    if(!bookToggle||!bookPanel)return;
    bookToggle.setAttribute('aria-expanded',String(!!open));bookToggle.classList.toggle('is-open',!!open);bookToggle.classList.toggle('is-active',!!open);bookPanel.hidden=!open;
    if(open){
      closeRadioPanel();
      var news=document.getElementById('library-news-toggle');
      if(news&&news.getAttribute('aria-expanded')==='true')news.click();
      /* Closing Podcast dispatches a click too; restore Book as the open menu. */
      bookToggle.setAttribute('aria-expanded','true');bookToggle.classList.add('is-open','is-active');bookPanel.hidden=false;
    }
  }
  function switchTo(target){
    activeTarget=target;
    if(target==='radio4'||target==='nhk')rememberRadio(target);
    Object.keys(buttonsBySource).forEach(function(source){if(source!==target)buttonsBySource[source].forEach(function(id){clearButtonState(document.getElementById(id));});});
    Object.keys(audioIds).forEach(function(name){
      if(name===target)return;
      if(target==='news'&&name.indexOf('news')===0)return;
      var audio=getAudio(name);if(audio&&!audio.paused){try{audio.pause();}catch(_){}}
    });
    if(target!=='podcast'){var pp=document.getElementById('podcast-episode-panel');if(pp)pp.hidden=true;}
    if(target!=='bible'){var bp=document.getElementById('niv-bible-panel'),bb=document.getElementById('niv-bible-toggle');if(bp)bp.hidden=true;if(bb)bb.setAttribute('aria-expanded','false');}
    if(target==='podcast'){var p=document.getElementById('podcast-episode-panel');if(p)p.hidden=false;}
    if(target==='bible'){var b=document.getElementById('niv-bible-panel'),bt=document.getElementById('niv-bible-toggle');if(b)b.hidden=false;if(bt)bt.setAttribute('aria-expanded','true');}
    return true;
  }
  function setRadioPanelOpen(open){
    if(!radioToggle||!radioPanel)return;
    if(!open){closeRadioPanel();return;}
    var news=document.getElementById('library-news-toggle');if(news&&news.getAttribute('aria-expanded')==='true')news.click();
    var biblePanel=document.getElementById('niv-bible-panel'),bibleButton=document.getElementById('niv-bible-toggle');
    if(biblePanel)biblePanel.hidden=true;if(bibleButton)bibleButton.setAttribute('aria-expanded','false');
    radioToggle.setAttribute('aria-expanded','true');radioToggle.classList.add('is-open','is-active');radioPanel.hidden=false;
    var station=getAudio(lastRadio)||getAudio('radio4');
    if(station&&station.paused){
      switchTo(lastRadio);
      var result=station.play();
      if(result&&result.catch)result.catch(function(){/* If autoplay is blocked, the station button remains available for a direct tap. */});
    }
  }
  if(radioToggle&&radioPanel)radioToggle.addEventListener('click',function(){
    /* Keep Radio's station row visible; repeated taps pause/resume the selected station. */
    if(radioToggle.getAttribute('aria-expanded')==='true'){
      var station=getAudio(lastRadio)||getAudio('radio4');
      if(station&&!station.paused){station.pause();return;}
    }
    setRadioPanelOpen(true);
  });
  if(bookToggle&&bookPanel)bookToggle.addEventListener('click',function(){
    /* Book is a level switch, never a close button. navigation.js chooses level 2 or 3. */
    setBookPanelOpen(true);
  });
  document.addEventListener('click',function(event){
    var target=event.target&&event.target.closest&&event.target.closest('#library-news-toggle,#niv-bible-toggle,.site-tab--home,.book-secondary-link');
    if(target){closeRadioPanel();if(target.matches('.site-tab--home'))closeBookPanel();}
  },true);
  window.LibraryAudioCoordinator={switchTo:switchTo,getAudio:getAudio,getActiveTarget:function(){return activeTarget;},setRadioPanelOpen:setRadioPanelOpen,setBookPanelOpen:setBookPanelOpen,getLastRadio:function(){return lastRadio;}};
  window.__prepareRadioPlayback=function(target){switchTo(target||lastRadio||'radio4');};
})(window,document);