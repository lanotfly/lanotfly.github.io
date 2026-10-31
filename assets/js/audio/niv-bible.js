(function(window,document){
  'use strict';
  if(window.__libraryKjvBibleInstalled)return;
  window.__libraryKjvBibleInstalled=true;
  var MINI_PLAY_SVG='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.8 6.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.6.1-1.6.9z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  var MINI_PAUSE_SVG='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 6h3v12h-3zM13.5 6h3v12h-3z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.7"/></svg>';
  var books=[
    ['Genesis','GEN',50],['Exodus','EXO',40],['Leviticus','LEV',27],['Numbers','NUM',36],['Deuteronomy','DEU',34],
    ['Joshua','JOS',24],['Judges','JDG',21],['Ruth','RUT',4],['1 Samuel','1SA',31],['2 Samuel','2SA',24],
    ['1 Kings','1KI',22],['2 Kings','2KI',25],['1 Chronicles','1CH',29],['2 Chronicles','2CH',36],['Ezra','EZR',10],
    ['Nehemiah','NEH',13],['Esther','EST',10],['Job','JOB',42],['Psalms','PSA',150],['Proverbs','PRO',31],
    ['Ecclesiastes','ECC',12],['Song of Solomon','SNG',8],['Isaiah','ISA',66],['Jeremiah','JER',52],['Lamentations','LAM',5],
    ['Ezekiel','EZK',48],['Daniel','DAN',12],['Hosea','HOS',14],['Joel','JOL',3],['Amos','AMO',9],
    ['Obadiah','OBA',1],['Jonah','JON',4],['Micah','MIC',7],['Nahum','NAM',3],['Habakkuk','HAB',3],
    ['Zephaniah','ZEP',3],['Haggai','HAG',2],['Zechariah','ZEC',14],['Malachi','MAL',4],
    ['Matthew','MAT',28],['Mark','MRK',16],['Luke','LUK',24],['John','JHN',21],['Acts','ACT',28],
    ['Romans','ROM',16],['1 Corinthians','1CO',16],['2 Corinthians','2CO',13],['Galatians','GAL',6],['Ephesians','EPH',6],
    ['Philippians','PHP',4],['Colossians','COL',4],['1 Thessalonians','1TH',5],['2 Thessalonians','2TH',3],
    ['1 Timothy','1TI',6],['2 Timothy','2TI',4],['Titus','TIT',3],['Philemon','PHM',1],['Hebrews','HEB',13],
    ['James','JAS',5],['1 Peter','1PE',5],['2 Peter','2PE',3],['1 John','1JN',5],['2 John','2JN',1],
    ['3 John','3JN',1],['Jude','JUD',1],['Revelation','REV',22]
  ];
  var button=document.getElementById('niv-bible-toggle');
  var panel=document.getElementById('niv-bible-panel');
  var bookSelect=document.getElementById('niv-book-select');
  var status=document.getElementById('niv-bible-status');
  var title=document.getElementById('niv-bible-now-playing');
  var audio=document.getElementById('niv-bible-audio');
  var progress=document.getElementById('niv-bible-progress');
  var lastKey='library_kjv_last_chapter';
  var queueList=null;
  var queueFrame=null;
  var queueModule=null;
  var current={book:'GEN',chapter:1,index:0};
  if(!button||!panel||!bookSelect||!audio)return;
  function renderQueue(){if(queueModule)queueModule.render();if(window.LibrarySyncCustomSelects)window.LibrarySyncCustomSelects();}
  function installQueue(){
    var anchor=document.querySelector('.niv-bible-progress-wrap');
    if(!anchor||queueList)return;
    var tools=document.createElement('div');
    tools.className='podcast-episode-panel__tools niv-bible-queue-tools';
    var count=document.createElement('div');
    count.className='podcast-episode-count';
    count.id='niv-bible-episode-count';
    count.setAttribute('aria-live','polite');
    var filterLabel=document.createElement('label');
    filterLabel.className='podcast-panel-filter-label';
    var filter=document.createElement('select');
    filter.className='podcast-panel-filter';
    filter.id='niv-bible-list-mode';
    filter.setAttribute('aria-label','Chapter filter');
    [['unplayed','Unplayed'],['played','Played'],['all','All chapters']].forEach(function(data){
      var option=document.createElement('option');option.value=data[0];option.textContent=data[1];if(data[0]==='unplayed')option.selected=true;filter.appendChild(option);
    });
    filterLabel.appendChild(filter);tools.appendChild(count);tools.appendChild(filterLabel);tools.insertBefore(bookSelect,filterLabel);
    queueFrame=document.createElement('div');
    queueFrame.className='podcast-episode-scroll-frame niv-bible-queue-frame';
    queueFrame.setAttribute('aria-label','KJV chapter playlist');
    queueList=document.createElement('div');
    queueList.id='niv-bible-queue';
    queueList.className='podcast-episode-list niv-bible-queue';
    queueList.setAttribute('role','list');
    queueFrame.appendChild(queueList);
    var heading=panel.querySelector('.niv-bible-panel__heading');
    var miniToggle=document.getElementById('niv-bible-mini-toggle');
    if(!miniToggle&&heading){
      miniToggle=document.createElement('button');
      miniToggle.id='niv-bible-mini-toggle';
      miniToggle.className='niv-bible-mini-toggle';
      miniToggle.type='button';
      miniToggle.innerHTML=MINI_PLAY_SVG;
      miniToggle.setAttribute('aria-label','Play or pause KJV audio');
      (panel.querySelector('.podcast-panel-actions')||heading).appendChild(miniToggle);
      miniToggle.addEventListener('click',function(){var t=document.getElementById('niv-bible-toggle');if(t)t.click();});
    }
    /* The feeds' bulk menu, same host, same look, same behaviour:
       Mark all to played / unplayed for the current book. */
    if(!document.getElementById('niv-bible-bulk-menu')){
      var bulkMenu=document.createElement('div');
      bulkMenu.className='podcast-bulk-menu';
      bulkMenu.id='niv-bible-bulk-menu';
      bulkMenu.innerHTML='<button class="podcast-bulk-menu__toggle" type="button" aria-expanded="false" aria-haspopup="true" aria-label="KJV Audio Bible chapter status actions" title="Chapter status actions"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg></button><div class="podcast-bulk-menu__options" role="menu" aria-label="KJV Audio Bible chapter status actions" hidden><button type="button" role="menuitem" data-kjv-bulk-played="true">Mark all to played</button><button type="button" role="menuitem" data-kjv-bulk-played="false">Mark all to unplayed</button></div>';
      var actionsHost3=panel.querySelector('.podcast-panel-actions');
      if(actionsHost3)actionsHost3.insertBefore(bulkMenu,document.getElementById('niv-bible-mini-toggle'));
      var bulkToggle=bulkMenu.querySelector('.podcast-bulk-menu__toggle');
      var bulkOptions=bulkMenu.querySelector('.podcast-bulk-menu__options');
      function setKjvBulkOpen(open){bulkOptions.hidden=!open;bulkToggle.setAttribute('aria-expanded',String(!!open));}
      bulkToggle.addEventListener('click',function(event){event.stopPropagation();setKjvBulkOpen(bulkOptions.hidden);});
      bulkMenu.addEventListener('click',function(event){event.stopPropagation();});
      bulkOptions.querySelectorAll('[data-kjv-bulk-played]').forEach(function(action){
        action.addEventListener('click',function(){
          var played=action.getAttribute('data-kjv-bulk-played')==='true';
          setKjvBulkOpen(false);
          var book=getBook(current.book)||books[0];
          for(var chapter=1;chapter<=book[2];chapter++){
            try{var key='library_kjv_played:'+book[1]+':'+chapter;if(played)localStorage.setItem(key,'1');else localStorage.removeItem(key);}catch(_){}
          }
          renderQueue();
          setStatus(played?'Marked all '+book[2]+' chapters as played.':'Marked all '+book[2]+' chapters as unplayed.');
        });
      });
      document.addEventListener('click',function(){setKjvBulkOpen(false);});
      document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!bulkOptions.hidden){setKjvBulkOpen(false);bulkToggle.focus();}});
    }
    /* No fold button any more: the heading strip is the toggle, exactly
       like the podcast feeds, and the fold is global across the deck. */
    var kjvFoldExpanded=true;
    function applyKjvFold(expanded){
      kjvFoldExpanded=expanded;
      if(queueFrame)queueFrame.hidden=!expanded;
      if(tools)tools.hidden=!expanded;
    }
    window.LibraryKjvApplyFold=applyKjvFold;
    if(heading)heading.addEventListener('click',function(event){
      if(event.target.closest('button, select, a, input, textarea, label'))return;
      var next=!kjvFoldExpanded;
      if(window.LibraryAudioSetFold)window.LibraryAudioSetFold(next);
      else{applyKjvFold(next);if(window.LibraryPodcastApplyFold)window.LibraryPodcastApplyFold(next);}
    });
    ['left','right'].forEach(function(side){var edge=document.createElement('div');edge.className='podcast-episode-scroll-edge podcast-episode-scroll-edge--'+side;edge.setAttribute('aria-hidden','true');queueFrame.appendChild(edge);});
    anchor.parentNode.insertBefore(tools,anchor.nextSibling);
    anchor.parentNode.insertBefore(queueFrame,tools.nextSibling);
    queueModule=window.LibraryPodcastList.create({
      listElement:queueList,
      countElement:count,
      filterElement:filter,
      statusElement:status,
      getQueue:function(){
        var book=getBook(current.book)||books[0],queue=[];
        for(var chapter=1;chapter<=book[2];chapter++)queue.push({title:book[0]+' '+chapter,url:chapterUrl(book[1],chapter),duration:'',book:book[1],chapter:chapter});
        return queue;
      },
      getIndex:function(){return Number(current.chapter)-1;},
      getListMode:function(){return filter.value||'unplayed';},
      setListMode:function(mode){filter.value=mode;},
      getPanelMode:function(){return 'full';},
      getActiveId:function(){return 'kjv-'+current.book;},
      getLiveFraction:function(){
        if(!isFinite(audio.duration)||audio.duration<=0)return null;
        return (audio.currentTime||0)/audio.duration;
      },
      getProgressSeconds:function(item){var r=readChapterProgress(item.book,item.chapter);return r?Number(r.t)||0:0;},
      getProgressDuration:function(item){var r=readChapterProgress(item.book,item.chapter);return r?Number(r.d)||0:0;},
      isPlayed:function(item){try{return localStorage.getItem('library_kjv_played:'+item.book+':'+item.chapter)==='1';}catch(_){return false;}},
      setPlayed:function(item,played){try{var key='library_kjv_played:'+item.book+':'+item.chapter;if(played)localStorage.setItem(key,'1');else localStorage.removeItem(key);}catch(_){}},
      isPlaying:function(){return !audio.paused&&!audio.ended;},
      toggleCurrentEpisode:function(){toggleChapter(current.book,current.chapter);},
      playEpisodeAt:function(index){playChapter(current.book,index+1,true);},
      onChange:function(){if(queueModule)queueModule.render();}
    });
    renderQueue();
  }
  function savedChapter(){try{return JSON.parse(localStorage.getItem(lastKey)||'null');}catch(_){return null;}}
  function remember(book,chapter,time){try{localStorage.setItem(lastKey,JSON.stringify({book:book,chapter:chapter,time:Math.max(0,Number(time)||0)}));}catch(_){}}
  function getBook(code){return books.find(function(book){return book[1]===code;});}
  function setStatus(message){if(status)status.textContent=message;}
  function updateProgress(){if(!progress)return;var duration=audio.duration;if(isFinite(duration)&&duration>0){progress.value=String(Math.round((audio.currentTime/duration)*1000));progress.disabled=false;}else{progress.value='0';progress.disabled=true;}}
  function chapterProgressKey(book,chapter){return 'library_kjv_progress:'+book+':'+chapter;}
  function readChapterProgress(book,chapter){try{var r=JSON.parse(localStorage.getItem(chapterProgressKey(book,chapter))||'null');return r&&Number(r.t)>0?r:null;}catch(_){return null;}}
  var lastProgressSave=0;
  function saveChapterProgress(force){
    if(!isFinite(audio.duration)||audio.duration<=0)return;
    var t=audio.currentTime||0;
    if(!force&&Math.abs(t-lastProgressSave)<10)return;
    lastProgressSave=t;
    try{
      if(t>2&&t<audio.duration-2)localStorage.setItem(chapterProgressKey(current.book,current.chapter),JSON.stringify({t:Math.floor(t),d:Math.floor(audio.duration)}));
      else if(t>=audio.duration-2)localStorage.removeItem(chapterProgressKey(current.book,current.chapter));
    }catch(_){}
  }
  function chapterUrl(book,chapter){return 'https://biblestudytogether.com/audio-bible/mp3/chapter/kjv/'+book+'+'+chapter+'.mp3';}
  function setMetadata(book,chapter){
    var chapterTitle=book+' '+chapter;
    if(window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('kjv',audio,{
        title:chapterTitle,
        artist:'King James Version (KJV) Audio Bible',
        album:'King James Version',
        artwork:window.LibraryAudioIdentity.getArtwork('kjv')
      });
      if('mediaSession' in navigator){
        try{
          navigator.mediaSession.setActionHandler('previoustrack',previousChapter);
          navigator.mediaSession.setActionHandler('nexttrack',nextChapter);
        }catch(_){}
      }
      return;
    }
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:chapterTitle,artist:'King James Version (KJV) Audio Bible',album:'King James Version',artwork:[{src:'/assets/images/kjv-audio-lockscreen.svg?v=20261025-1',sizes:'512x512',type:'image/svg+xml'}]});
      navigator.mediaSession.setActionHandler('play',function(){audio.play().catch(function(){});});
      navigator.mediaSession.setActionHandler('pause',function(){audio.pause();});
      navigator.mediaSession.setActionHandler('previoustrack',previousChapter);
      navigator.mediaSession.setActionHandler('nexttrack',nextChapter);
      navigator.mediaSession.playbackState=audio.paused?'paused':'playing';
    }catch(_){}
  }
  function updateQueuePlaybackState(){if(queueModule)queueModule.render();}
  function toggleChapter(bookCode,chapter){
    var book=getBook(bookCode);if(!book)return;
    chapter=Math.min(Math.max(Number(chapter)||1,1),book[2]);
    var selectedTitle=book[0]+' '+chapter;
    var sameSelection=current.book===bookCode&&Number(current.chapter)===chapter&&audio.dataset.chapterTitle===selectedTitle&&!!audio.src;
    if(!sameSelection){playChapter(bookCode,chapter,true);return;}
    button.setAttribute('aria-expanded','true');
    if(!audio.paused){audio.pause();setStatus('');paint();return;}
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    audio.play().then(function(){setStatus('');paint();}).catch(function(){setStatus('');paint();});
  }
  function paint(){
    var playing=!audio.paused;
    button.classList.toggle('is-playing',playing);
    button.setAttribute('aria-pressed',String(playing));
    var miniToggleEl=document.getElementById('niv-bible-mini-toggle');
    if(miniToggleEl){miniToggleEl.innerHTML=playing?MINI_PAUSE_SVG:MINI_PLAY_SVG;miniToggleEl.setAttribute('aria-pressed',String(playing));}
    if(bookSelect.value!==current.book)bookSelect.value=current.book;
    button.setAttribute('aria-expanded',String(!panel.hidden));
    button.setAttribute('aria-label',(playing?'Pause':'Play')+' KJV Audio Bible'+(current.book?' · '+(getBook(current.book)||books[0])[0]+' '+current.chapter:''));
    button.title=(playing?'Pause':'Play')+' KJV Audio Bible';
    updateQueuePlaybackState();
  }
  function playChapter(bookCode,chapter,shouldPlay){
    var book=getBook(bookCode);if(!book)return;
    chapter=Math.min(Math.max(Number(chapter)||1,1),book[2]);
    var previousSaved=savedChapter();
    var resumeTime=previousSaved&&previousSaved.book===bookCode&&Number(previousSaved.chapter)===chapter?Number(previousSaved.time)||0:0;
    if(!(resumeTime>0)){var chapterRec=readChapterProgress(bookCode,chapter);if(chapterRec)resumeTime=Number(chapterRec.t)||0;}
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    current={book:bookCode,chapter:chapter,index:books.findIndex(function(item){return item[1]===bookCode;})};
    remember(bookCode,chapter,0);
    bookSelect.value=bookCode;
    if(title)title.innerHTML='<span class="niv-bible-title-book">'+book[0]+' · </span>Chapter '+chapter;
    renderQueue();
    audio.dataset.chapterTitle=book[0]+' '+chapter;
    button.setAttribute('aria-expanded','true');
    if(audio.src!==chapterUrl(bookCode,chapter)){
      audio.src=chapterUrl(bookCode,chapter);
      audio.load();
      if(resumeTime>0){
        var restoreProgress=function(){
          audio.removeEventListener('loadedmetadata',restoreProgress);
          try{audio.currentTime=Math.min(resumeTime,Math.max(0,(audio.duration||resumeTime)-1));}catch(_){}
        };
        audio.addEventListener('loadedmetadata',restoreProgress);
      }
    }
    setMetadata(book[0],chapter);
    setStatus('');
    updateProgress();
    paint();
    if(shouldPlay){
      audio.play().then(function(){
        setStatus('');
        if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='playing';}catch(_){}}
        paint();
      }).catch(function(){
        setStatus('');
        paint();
      });
    }
  }
  function nextChapter(){
    var book=getBook(current.book);if(!book)return;
    if(current.chapter<book[2])playChapter(current.book,current.chapter+1,true);
    else if(current.index+1<books.length)playChapter(books[current.index+1][1],1,true);
    else {setStatus('KJV Audio Bible finished.');audio.pause();paint();}
  }
  function previousChapter(){
    if(current.chapter>1)playChapter(current.book,current.chapter-1,true);
    else if(current.index>0){var previous=books[current.index-1];playChapter(previous[1],previous[2],true);}
    else playChapter('GEN',1,true);
  }
  books.forEach(function(book){
    var option=document.createElement('option');
    option.value=book[1];option.textContent=book[0];
    bookSelect.appendChild(option);
  });
  var saved=savedChapter();
  var initialBook=saved&&getBook(saved.book)?saved.book:'GEN';
  var initialChapter=saved&&getBook(saved.book)?saved.chapter:1;
  bookSelect.value=initialBook;
  current={book:initialBook,chapter:initialChapter,index:books.findIndex(function(book){return book[1]===initialBook;})};
  if(title)title.innerHTML='<span class="niv-bible-title-book">'+(getBook(initialBook)||books[0])[0]+' · </span>Chapter '+initialChapter;
  installQueue();
  if(window.LibraryEnhanceSelect){window.LibraryEnhanceSelect(bookSelect,{variant:'book',buttonClass:'niv-bible-book-select'});window.LibraryEnhanceSelect(document.getElementById('niv-bible-list-mode'),{variant:'filter',buttonClass:'podcast-panel-filter'});}
  function togglePlayback(){
    try{
      if(sessionStorage.getItem('library-fold-audio')==='1'){
        sessionStorage.removeItem('library-fold-audio');
        if(window.LibraryKjvApplyFold)window.LibraryKjvApplyFold(false);
      }
    }catch(_){}
    button.setAttribute('aria-expanded','true');
    var selectedBook=current.book||'GEN';
    var selectedChapter=current.chapter||1;
    var selectedTitle=(getBook(selectedBook)||books[0])[0]+' '+selectedChapter;
    var sameSelection=audio.dataset.chapterTitle===selectedTitle;
    if(!audio.paused&&sameSelection){
      audio.pause();setStatus('');paint();return;
    }
    if(sameSelection&&audio.src){
      if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
      audio.play().then(function(){setStatus('');paint();}).catch(function(){setStatus('');});
    }else playChapter(selectedBook,selectedChapter,true);
  }
  button.addEventListener('click',togglePlayback);
  bookSelect.addEventListener('change',function(){playChapter(bookSelect.value,1,false);});
  audio.addEventListener('play',function(){setStatus('Playing KJV · '+(getBook(current.book)||books[0])[0]+' '+current.chapter);setMetadata((getBook(current.book)||books[0])[0],current.chapter);paint();});
  audio.addEventListener('pause',function(){saveChapterProgress(true);if(queueModule)queueModule.render();if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused';}catch(_){}}paint();});
  audio.addEventListener('timeupdate',function(){
    if(audio.currentTime>0&&isFinite(audio.currentTime))remember(current.book,current.chapter,audio.currentTime);
    saveChapterProgress(false);
    updateProgress();
    if(queueModule&&queueModule.updateLiveProgress)queueModule.updateLiveProgress();
  });
  audio.addEventListener('loadedmetadata',updateProgress);
  audio.addEventListener('durationchange',updateProgress);
  if(progress){progress.addEventListener('input',function(){if(isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(progress.value)/1000)*audio.duration;});}
  audio.addEventListener('ended',function(){try{localStorage.setItem('library_kjv_played:'+current.book+':'+current.chapter,'1');localStorage.removeItem(chapterProgressKey(current.book,current.chapter));}catch(_){}if(queueModule)queueModule.render();nextChapter();});
  audio.addEventListener('error',function(){setStatus('');paint();});
  /* Cross-tab progress: the last chapter/position lives in localStorage,
     which Safari shares across tabs of this site. Save when the tab is
     hidden, and adopt a newer saved position (written by another tab) when
     this tab becomes visible again or hears the storage event — no server
     involved. iOS keeps a home-screen web app's storage in a separate
     container from Safari's; that boundary is the platform's. */
  function adoptSavedChapter(){
    if(!audio.paused)return;
    var saved=savedChapter();
    if(!saved||saved.book!==current.book||Number(saved.chapter)!==Number(current.chapter))return;
    var time=Number(saved.time)||0;
    if(time>0&&isFinite(audio.duration)&&audio.duration>0&&Math.abs(time-audio.currentTime)>3&&time<audio.duration-5){
      try{audio.currentTime=time;}catch(_){}
    }
  }
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){remember(current.book,current.chapter,audio.currentTime);return;}
    adoptSavedChapter();
  });
  window.addEventListener('storage',function(event){if(event.key===lastKey)adoptSavedChapter();});
  paint();
})(window,document);
