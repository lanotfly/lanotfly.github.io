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
  var button=document.getElementById('niv-bible-toggle'),panel=document.getElementById('niv-bible-panel');
  var testament=document.getElementById('niv-testament-select'),bookSelect=document.getElementById('niv-book-select');
  var chapterList=document.getElementById('niv-chapter-list'),count=document.getElementById('niv-chapter-count');
  var status=document.getElementById('niv-bible-status'),audio=document.getElementById('niv-bible-audio');
  var lastKey='library_kjv_last_chapter',current={book:'GEN',chapter:1,index:0};
  if(!button||!panel||!testament||!bookSelect||!chapterList||!audio)return;
  function savedChapter(){try{return JSON.parse(localStorage.getItem(lastKey)||'null');}catch(_){return null;}}
  function remember(book,chapter){try{localStorage.setItem(lastKey,JSON.stringify({book:book,chapter:chapter}));}catch(_){}}
  function visibleBooks(){return books.filter(function(book,index){return testament.value==='old'?index<39:index>=39;});}
  function getBook(code){return books.find(function(book){return book[1]===code;});}
  function chapterUrl(book,chapter){return 'https://biblestudytogether.com/audio-bible/mp3/chapter/kjv/'+book+'+'+chapter+'.mp3';}
  function setStatus(message){if(status)status.textContent=message;}
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
  function paintCurrent(){
    chapterList.querySelectorAll('.niv-chapter-button').forEach(function(node){
      var active=node.dataset.book===current.book&&Number(node.dataset.chapter)===current.chapter;
      node.classList.toggle('is-current',active);
      node.setAttribute('aria-current',active?'true':'false');
      node.textContent=String(node.dataset.chapter)+(active?(audio.paused?'  ▶':'  ▮▮'):'');
    });
    if(button){button.classList.toggle('is-playing',!audio.paused);button.setAttribute('aria-pressed',String(!audio.paused));}
  }
  function populateBooks(preferredCode){
    var list=visibleBooks();bookSelect.textContent='';
    list.forEach(function(book){var option=document.createElement('option');option.value=book[1];option.textContent=book[0];bookSelect.appendChild(option);});
    var wanted=list.find(function(book){return book[1]===preferredCode;});
    if(wanted)bookSelect.value=wanted[1];
    renderChapters();
  }
  function renderChapters(){
    var book=getBook(bookSelect.value);chapterList.textContent='';
    if(!book)return;
    var saved=savedChapter();
    for(var chapter=1;chapter<=book[2];chapter++){
      var link=document.createElement('button');
      link.type='button';link.className='niv-chapter-button';link.dataset.book=book[1];link.dataset.chapter=String(chapter);
      link.textContent=String(chapter);link.setAttribute('aria-label','Play KJV '+book[0]+' chapter '+chapter);
      if(saved&&saved.book===book[1]&&saved.chapter===chapter)link.classList.add('is-last-listened');
      link.addEventListener('click',function(selectedBook,selectedChapter){return function(){playChapter(selectedBook,selectedChapter,true);};}(book[1],chapter));
      chapterList.appendChild(link);
    }
    if(count)count.textContent=book[0]+' · '+book[2]+' chapters';
    paintCurrent();
    setStatus('Choose a chapter to play KJV audio here. Playback automatically continues to the next chapter.');
  }
  function playChapter(bookCode,chapter,fromTap){
    var book=getBook(bookCode);if(!book)return;
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    current={book:bookCode,chapter:chapter,index:books.findIndex(function(item){return item[1]===bookCode;})};
    remember(bookCode,chapter);paintCurrent();
    audio.dataset.chapterTitle=book[0]+' '+chapter;
    audio.src=chapterUrl(bookCode,chapter);
    audio.load();
    setMetadata(book[0],chapter);
    setStatus('Loading KJV audio: '+book[0]+' '+chapter+'…');
    if(fromTap){
      audio.play().then(function(){setStatus('Playing KJV · '+book[0]+' '+chapter);}).catch(function(){
        setStatus('Tap Play in the audio controls to start '+book[0]+' '+chapter+'. If it fails, the audio host may be unavailable.');
      });
    }
  }
  function nextChapter(){
    var book=getBook(current.book);
    if(!book)return;
    if(current.chapter<book[2])playChapter(current.book,current.chapter+1,true);
    else if(current.index+1<books.length)playChapter(books[current.index+1][1],1,true);
    else setStatus('KJV Audio Bible finished.');
  }
  function previousChapter(){
    if(current.chapter>1)playChapter(current.book,current.chapter-1,true);
    else if(current.index>0){var previous=books[current.index-1];playChapter(previous[1],previous[2],true);}
    else playChapter('GEN',1,true);
  }
  testament.addEventListener('change',function(){populateBooks(null);});
  bookSelect.addEventListener('change',renderChapters);
  button.addEventListener('click',function(){
    var willOpen=panel.hidden;
    panel.hidden=!willOpen;button.setAttribute('aria-expanded',String(willOpen));
    if(willOpen){var saved=savedChapter();if(saved){testament.value=books.findIndex(function(book){return book[1]===saved.book;})<39?'old':'new';populateBooks(saved.book);}else populateBooks(bookSelect.value||'GEN');}
    else if(!audio.paused)audio.pause();
  });
  audio.addEventListener('play',function(){paintCurrent();setMetadata(getBook(current.book).name||getBook(current.book)[0],current.chapter);setStatus('Playing KJV · '+getBook(current.book)[0]+' '+current.chapter);});
  audio.addEventListener('pause',function(){paintCurrent();if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused';}catch(_){}}});
  audio.addEventListener('ended',nextChapter);
  audio.addEventListener('error',function(){paintCurrent();setStatus('Could not load this chapter’s audio. Please try again shortly.');});
  var saved=savedChapter();
  testament.value=saved&&books.findIndex(function(book){return book[1]===saved.book;})>=39?'new':'old';
  populateBooks(saved?saved.book:'GEN');
})(window,document);
