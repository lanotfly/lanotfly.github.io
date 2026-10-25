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
  var lastKey='library_kjv_last_chapter';
  var queueList=null;
  var queueFrame=null;
  var current={book:'GEN',chapter:1,index:0};
  if(!button||!panel||!bookSelect||!audio)return;
  function renderQueue(){
    if(!queueList)return;
    queueList.textContent='';
    var currentBook=getBook(current.book)||books[0];
    for(var chapter=1;chapter<=currentBook[2];chapter++){
      var item={book:currentBook[1],chapter:chapter,index:current.index,title:currentBook[0]+' '+chapter};
      var row=document.createElement('li');
      var choice=document.createElement('button');
      choice.type='button';
      choice.className='niv-bible-queue-item'+(chapter===current.chapter?' is-current':'');
      choice.setAttribute('aria-current',chapter===current.chapter?'true':'false');
      var position=document.createElement('span');
      position.className='queue-position';
      position.textContent=chapter===current.chapter?'▶':String(chapter);
      var label=document.createElement('span');
      label.className='queue-title';
      label.textContent=item.title+(chapter===current.chapter?' · Current':'');
      choice.appendChild(position);choice.appendChild(label);
      choice.addEventListener('click',(function(target){return function(){playChapter(target.book,target.chapter,true);};})(item));
      row.appendChild(choice);queueList.appendChild(row);
    }
    var currentRow=queueList.querySelector('.niv-bible-queue-item.is-current');
    if(currentRow){var rowTop=currentRow.offsetTop;var rowBottom=rowTop+currentRow.offsetHeight;var viewTop=queueList.scrollTop;var viewBottom=viewTop+queueList.clientHeight;if(rowTop<viewTop||rowBottom>viewBottom)queueList.scrollTop=Math.max(0,rowTop-queueList.clientHeight/2+currentRow.offsetHeight/2);}
  }
  function installQueue(){
    var filters=document.querySelector('.niv-bible-panel__filters');
    if(!filters||queueList)return;
    queueFrame=document.createElement('div');
    queueFrame.className='niv-bible-queue-frame';
    queueFrame.setAttribute('aria-label','KJV chapters, current chapter first then earlier chapters');
    queueList=document.createElement('ol');
    queueList.id='niv-bible-queue';queueList.className='niv-bible-queue';
    queueList.setAttribute('aria-label','Chapters in reverse order');
    queueFrame.appendChild(queueList);
    ['left','right'].forEach(function(side){
      var edge=document.createElement('div');
      edge.className='niv-bible-queue-scroll-edge niv-bible-queue-scroll-edge--'+side;
      edge.setAttribute('aria-hidden','true');queueFrame.appendChild(edge);
    });
    filters.parentNode.insertBefore(queueFrame,filters.nextSibling);
    renderQueue();
  }
  function savedChapter(){try{return JSON.parse(localStorage.getItem(lastKey)||'null');}catch(_){return null;}}
  function remember(book,chapter,time){try{localStorage.setItem(lastKey,JSON.stringify({book:book,chapter:chapter,time:Math.max(0,Number(time)||0)}));}catch(_){}}
  function getBook(code){return books.find(function(book){return book[1]===code;});}
  function setStatus(message){if(status)status.textContent=message;}
  function chapterUrl(book,chapter){return 'https://biblestudytogether.com/audio-bible/mp3/chapter/kjv/'+book+'+'+chapter+'.mp3';}
  function setMetadata(book,chapter){
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:book+' '+chapter,artist:'King James Version (KJV) Audio Bible',album:'King James Version',artwork:[]});
      navigator.mediaSession.setActionHandler('play',function(){audio.play().catch(function(){});});
      navigator.mediaSession.setActionHandler('pause',function(){audio.pause();});
      navigator.mediaSession.setActionHandler('previoustrack',previousChapter);
      navigator.mediaSession.setActionHandler('nexttrack',nextChapter);
      navigator.mediaSession.playbackState=audio.paused?'paused':'playing';
    }catch(_){}
  }
  function paint(){
    var playing=!audio.paused;
    button.classList.toggle('is-playing',playing);
    button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-expanded',String(!panel.hidden));
    button.setAttribute('aria-label',(playing?'Pause':'Play')+' KJV Audio Bible'+(current.book?' · '+(getBook(current.book)||books[0])[0]+' '+current.chapter:''));
    button.title=(playing?'Pause':'Play')+' KJV Audio Bible';
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
    setStatus('Loading KJV · '+book[0]+' '+chapter+'…');
    paint();
    if(shouldPlay){
      audio.play().then(function(){
        setStatus('Playing KJV · '+book[0]+' '+chapter);
        if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='playing';}catch(_){}}
        paint();
      }).catch(function(){
        setStatus('Ready: tap Play in the audio controls if playback did not start.');
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
    button.setAttribute('aria-expanded','true');
    var selectedBook=current.book||'GEN';
    var selectedChapter=current.chapter||1;
    var selectedTitle=(getBook(selectedBook)||books[0])[0]+' '+selectedChapter;
    var sameSelection=audio.dataset.chapterTitle===selectedTitle;
    if(!audio.paused&&sameSelection){
      audio.pause();setStatus('Paused · '+selectedTitle);paint();return;
    }
    if(sameSelection&&audio.src){
      if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
      audio.play().then(function(){setStatus('Playing KJV · '+selectedTitle);paint();}).catch(function(){setStatus('Tap Play in the audio controls to start playback.');});
    }else playChapter(selectedBook,selectedChapter,true);
  }
  button.addEventListener('click',togglePlayback);
  bookSelect.addEventListener('change',function(){playChapter(bookSelect.value,1,false);});
  audio.addEventListener('play',function(){setStatus('Playing KJV · '+(getBook(current.book)||books[0])[0]+' '+current.chapter);setMetadata((getBook(current.book)||books[0])[0],current.chapter);paint();});
  audio.addEventListener('pause',function(){if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused';}catch(_){}}paint();});
  audio.addEventListener('timeupdate',function(){
    if(audio.currentTime>0&&isFinite(audio.currentTime))remember(current.book,current.chapter,audio.currentTime);
  });
  audio.addEventListener('ended',nextChapter);
  audio.addEventListener('error',function(){setStatus('Could not load this chapter audio. Try again in a moment.');paint();});
  paint();
})(window,document);
