(function(window,document){
  'use strict';
  if(window.__libraryKjvBibleInstalled)return;
  window.__libraryKjvBibleInstalled=true;
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
  function renderQueue(){if(queueModule)queueModule.render();}
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
    filterLabel.appendChild(filter);tools.appendChild(count);tools.appendChild(filterLabel);
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
      miniToggle.textContent='▶';
      miniToggle.setAttribute('aria-label','Play or pause KJV audio');
      heading.insertBefore(miniToggle,heading.firstChild);
      miniToggle.addEventListener('click',function(){var t=document.getElementById('niv-bible-toggle');if(t)t.click();});
    }
    var collapseButton=document.getElementById('niv-bible-queue-toggle');
    if(!collapseButton&&heading){
      collapseButton=document.createElement('button');
      collapseButton.id='niv-bible-queue-toggle';
      collapseButton.className='niv-bible-queue-toggle';
      collapseButton.type='button';
      collapseButton.setAttribute('aria-controls','niv-bible-queue');
      collapseButton.setAttribute('aria-expanded','true');
      collapseButton.setAttribute('aria-label','Collapse chapter list');
      collapseButton.title='Collapse chapter list';
      collapseButton.innerHTML='<svg class="podcast-list-toggle-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path class="podcast-list-toggle-line podcast-list-toggle-line--top" d="M4 6H20"/><path class="podcast-list-toggle-line podcast-list-toggle-line--middle" d="M4 12H20"/><path class="podcast-list-toggle-line podcast-list-toggle-line--bottom" d="M4 18H20"/></svg>';
      bookSelect.insertAdjacentElement('afterend',collapseButton);
      collapseButton.addEventListener('click',function(){
        var collapsed=collapseButton.getAttribute('aria-expanded')==='true';
        collapseButton.setAttribute('aria-expanded',String(!collapsed));
        collapseButton.setAttribute('aria-label',collapsed?'Expand chapter list':'Collapse chapter list');
        collapseButton.title=collapsed?'Expand chapter list':'Collapse chapter list';
        collapseButton.classList.toggle('is-collapsed',collapsed);
        if(queueFrame)queueFrame.hidden=collapsed;
        if(tools)tools.hidden=collapsed;
      });
    }
    var miniSkip=document.getElementById('niv-bible-mini-skip');
    if(!miniSkip&&heading){
      miniSkip=document.createElement('button');
      miniSkip.id='niv-bible-mini-skip';
      miniSkip.className='niv-bible-mini-skip';
      miniSkip.type='button';
      miniSkip.setAttribute('aria-label','Skip forward 30 seconds');
      miniSkip.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19.9 12a7.9 7.9 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17.6 2.8v3.6h-3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="15.6" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">30</text></svg>';
      var mtEl=document.getElementById('niv-bible-mini-toggle');
      if(mtEl&&mtEl.parentNode===heading)mtEl.insertAdjacentElement('afterend',miniSkip);
      else heading.appendChild(miniSkip);
      miniSkip.addEventListener('click',function(){
        if(!audio.src)return;
        var d=Number.isFinite(audio.duration)?audio.duration:audio.currentTime+30;
        audio.currentTime=Math.min(d,audio.currentTime+30);
      });
    }
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
    panel.hidden=false;
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
    if(miniToggleEl){miniToggleEl.textContent=playing?'❚❚':'▶';miniToggleEl.setAttribute('aria-pressed',String(playing));}
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
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    current={book:bookCode,chapter:chapter,index:books.findIndex(function(item){return item[1]===bookCode;})};
    remember(bookCode,chapter,0);
    bookSelect.value=bookCode;
    if(title)title.textContent=book[0]+' · Chapter '+chapter;
    renderQueue();
    audio.dataset.chapterTitle=book[0]+' '+chapter;
    panel.hidden=false;
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
  if(title)title.textContent=(getBook(initialBook)||books[0])[0]+' · Chapter '+initialChapter;
  installQueue();
  function togglePlayback(){
    panel.hidden=false;
    try{
      if(sessionStorage.getItem('library-fold-audio')==='1'){
        sessionStorage.removeItem('library-fold-audio');
        var qt=document.getElementById('niv-bible-queue-toggle');
        if(qt&&qt.getAttribute('aria-expanded')==='true')qt.click();
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
  audio.addEventListener('pause',function(){if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused';}catch(_){}}paint();});
  audio.addEventListener('timeupdate',function(){
    if(audio.currentTime>0&&isFinite(audio.currentTime))remember(current.book,current.chapter,audio.currentTime);
    updateProgress();
  });
  audio.addEventListener('loadedmetadata',updateProgress);
  audio.addEventListener('durationchange',updateProgress);
  if(progress){progress.addEventListener('input',function(){if(isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(progress.value)/1000)*audio.duration;});}
  audio.addEventListener('ended',function(){try{localStorage.setItem('library_kjv_played:'+current.book+':'+current.chapter,'1');}catch(_){}if(queueModule)queueModule.render();nextChapter();});
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
