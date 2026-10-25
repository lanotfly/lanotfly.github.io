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
  var lastKey='library_niv_last_chapter';
  if(!button||!panel||!testament||!bookSelect||!chapterList)return;

  function visibleBooks(){return books.filter(function(book,index){return testament.value==='old'?index<39:index>=39;});}
  function populateBooks(preferredCode){
    var list=visibleBooks();
    bookSelect.textContent='';
    list.forEach(function(book){
      var option=document.createElement('option');option.value=book[1];option.textContent=book[0];bookSelect.appendChild(option);
    });
    var wanted=list.find(function(book){return book[1]===preferredCode;});
    if(wanted)bookSelect.value=wanted[1];
    renderChapters();
  }
  function renderChapters(){
    var book=books.find(function(item){return item[1]===bookSelect.value;});
    chapterList.textContent='';
    if(!book)return;
    var saved=null;
    try{saved=JSON.parse(localStorage.getItem(lastKey)||'null');}catch(_){}
    for(var chapter=1;chapter<=book[2];chapter++){
      var link=document.createElement('a');
      link.className='niv-chapter-button';
      link.href='https://www.bible.com/audio-bible/111/'+book[1]+'.'+chapter+'.NIV';
      link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=String(chapter);
      link.setAttribute('aria-label','Listen to NIV '+book[0]+' chapter '+chapter+' on Bible.com');
      if(saved&&saved.book===book[1]&&saved.chapter===chapter)link.classList.add('is-last-listened');
      link.addEventListener('click',function(selectedBook,selectedChapter){
        return function(){
          if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
          try{localStorage.setItem(lastKey,JSON.stringify({book:selectedBook[1],chapter:selectedChapter}));}catch(_){}
          if(status)status.textContent='Opened '+selectedBook[0]+' '+selectedChapter+' in the official NIV audio reader.';
        };
      }(book,chapter));
      chapterList.appendChild(link);
    }
    if(count)count.textContent=book[0]+' · '+book[2]+' chapters';
    if(status)status.textContent='Choose a chapter to open the official NIV audio player.';
  }
  testament.addEventListener('change',function(){populateBooks(null);});
  bookSelect.addEventListener('change',renderChapters);
  button.addEventListener('click',function(){
    var willOpen=panel.hidden;
    if(willOpen&&window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('bible');
    panel.hidden=!willOpen;
    button.setAttribute('aria-expanded',String(willOpen));
    if(willOpen){
      try{
        var saved=JSON.parse(localStorage.getItem(lastKey)||'null');
        if(saved){
          testament.value=books.findIndex(function(book){return book[1]===saved.book;})<39?'old':'new';
          populateBooks(saved.book);
          return;
        }
      }catch(_){}
      populateBooks(bookSelect.value||'GEN');
    }
  });
  var saved=null;
  try{saved=JSON.parse(localStorage.getItem(lastKey)||'null');}catch(_){}
  testament.value=saved&&books.findIndex(function(book){return book[1]===saved.book;})>=39?'new':'old';
  populateBooks(saved?saved.book:'GEN');
})(window,document);
