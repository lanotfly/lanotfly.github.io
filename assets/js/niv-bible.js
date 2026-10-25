(function(window,document){
  'use strict';
  if(window.__libraryNivBibleInstalled)return;
  window.__libraryNivBibleInstalled=true;

  var books=[
    ['Genesis','GEN',50],['Exodus','EXO',40],['Leviticus','LEV',27],['Numbers','NUM',36],['Deuteronomy','DEU',34],
    ['Joshua','JOS',24],['Judges','JDG',21],['Ruth','RUT',4],['1 Samuel','1SA',31],['2 Samuel','2SA',24],
    ['1 Kings','1KI',22],['2 Kings','2KI',25],['1 Chronicles','1CH',29],['2 Chronicles','2CH',36],['Ezra','EZR',10],
    ['Nehemiah','NEH',13],['Esther','EST',10],['Job','JOB',42],['Psalms','PSA',150],['Proverbs','PRO',31],
    ['Ecclesiastes','ECC',12],['Song of Songs','SNG',8],['Isaiah','ISA',66],['Jeremiah','JER',52],['Lamentations','LAM',5],
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
  var testament=document.getElementById('niv-testament-select');
  var bookSelect=document.getElementById('niv-book-select');
  var chapterList=document.getElementById('niv-chapter-list');
  var count=document.getElementById('niv-chapter-count');
  var status=document.getElementById('niv-bible-status');
  var audio=document.getElementById('niv-bible-audio');
  var lastKey='library_niv_last_chapter';
  var current={book:null,chapter:0,index:0};
  var busy=false;
  if(!button||!panel||!testament||!bookSelect||!chapterList||!audio)return;

  function savedChapter(){try{return JSON.parse(localStorage.getItem(lastKey)||'null');}catch(_){return null;}}
  function remember(book,chapter){try{localStorage.setItem(lastKey,JSON.stringify({book:book,chapter:chapter}));}catch(_){}}
  function visibleBooks(){return books.filter(function(book,index){return testament.value==='old'?index<39:index>=39;});}
  function getBook(code){return books.find(function(book){return book[1]===code;});}
  function chapterUrl(book,chapter){return 'https://www.bible.com/audio-bible/111/'+book+'.'+chapter+'.NIV';}
  function setStatus(message){if(status)status.textContent=message;}
  function paintCurrent(){
    chapterList.querySelectorAll('.niv-chapter-button').forEach(function(node){
      var active=node.dataset.book===current.book&&Number(node.dataset.chapter)===current.chapter;
      node.classList.toggle('is-current',active);
      node.setAttribute('aria-current',active?'true':'false');
      node.textContent=String(node.dataset.chapter)+(active?(audio.paused?'  ▶':'  ▮▮'):'');
    });
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
      link.textContent=String(chapter);link.setAttribute('aria-label','Play NIV '+book[0]+' chapter '+chapter);
      if(saved&&saved.book===book[1]&&saved.chapter===chapter)link.classList.add('is-last-listened');
      link.addEventListener('click',function(selectedBook,selectedChapter){
        return function(){playChapter(selectedBook,selectedChapter);};
      }(book[1],chapter));
      chapterList.appendChild(link);
    }
    if(count)count.textContent=book[0]+' · '+book[2]+' chapters';
    paintCurrent();
    setStatus('Tap a chapter to play NIV audio here. Playback continues to the next chapter when available.');
  }
  function findAudioUrl(data){
    if(!data||typeof data!=='object')return '';
    var preferred=['format_mp3_64k','format_mp3_32k','format_mp3_128k','mp3','url','audio_url'];
    function normalize(value){
      if(typeof value!=='string')return '';
      if(value.indexOf('//')===0)value='https:'+value;
      return /^https?:\/\//i.test(value)&&/\.(mp3|m4a|aac|mp4)(\?|#|$)/i.test(value)?value:'';
    }
    function scan(value,depth){
      if(!value||depth>8)return '';
      var direct=normalize(value);
      if(direct)return direct;
      if(Array.isArray(value)){
        for(var i=0;i<value.length;i++){var found=scan(value[i],depth+1);if(found)return found;}
        return '';
      }
      if(typeof value==='object'){
        for(var p=0;p<preferred.length;p++){var candidate=normalize(value[preferred[p]]);if(candidate)return candidate;}
        var keys=Object.keys(value);
        for(var j=0;j<keys.length;j++){var result=scan(value[keys[j]],depth+1);if(result)return result;}
      }
      return '';
    }
    return scan(data,0);
  }
  function playChapter(bookCode,chapter){
    var book=getBook(bookCode);if(!book)return;
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    current={book:bookCode,chapter:chapter,index:books.findIndex(function(item){return item[1]===bookCode;})};
    remember(bookCode,chapter);paintCurrent();
    var url=chapterUrl(bookCode,chapter);
    setStatus('Opening official NIV audio: '+book[0]+' '+chapter+'…');
    /* Open synchronously from the tap so iOS Safari does not block the new tab
       after an asynchronous audio API request. Bible.com owns the licensed player. */
    var opened=window.open(url,'_blank','noopener,noreferrer');
    if(!opened){
      setStatus('Your browser blocked the new tab. Tap the link below to play this chapter on Bible.com.');
      var fallback=document.createElement('a');
      fallback.href=url;fallback.target='_blank';fallback.rel='noopener noreferrer';
      fallback.className='niv-bible-fallback';fallback.textContent='Play '+book[0]+' '+chapter+' on Bible.com';
      if(status){status.textContent='';status.appendChild(fallback);}
      return;
    }
    setStatus('Opened '+book[0]+' '+chapter+' in Bible.com. Use its audio player to listen.');
  }
  testament.addEventListener('change',function(){populateBooks(null);});
  bookSelect.addEventListener('change',renderChapters);
  button.addEventListener('click',function(){
    var willOpen=panel.hidden;
    if(willOpen&&window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    panel.hidden=!willOpen;button.setAttribute('aria-expanded',String(willOpen));
    if(willOpen){var saved=savedChapter();if(saved){testament.value=books.findIndex(function(book){return book[1]===saved.book;})<39?'old':'new';populateBooks(saved.book);}else populateBooks(bookSelect.value||'GEN');}
  });
  audio.addEventListener('play',function(){busy=false;paintCurrent();});
  audio.addEventListener('pause',function(){paintCurrent();});
  audio.addEventListener('error',function(){busy=false;paintCurrent();});
  audio.addEventListener('ended',function(){
    var book=getBook(current.book);
    if(!book)return;
    if(current.chapter<book[2])playChapter(current.book,current.chapter+1);
    else if(current.index+1<books.length)playChapter(books[current.index+1][1],1);
    else setStatus('NIV Audio Bible finished.');
  });
  var saved=savedChapter();
  testament.value=saved&&books.findIndex(function(book){return book[1]===saved.book;})>=39?'new':'old';
  populateBooks(saved?saved.book:'GEN');
})(window,document);
