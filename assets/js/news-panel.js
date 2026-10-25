/* Independent RSS news panel for English and Japanese headlines. */
(function(){
  'use strict';
  if(window.__libraryNewsPanelInstalled)return;
  window.__libraryNewsPanelInstalled=true;

  var feeds=[
    {id:'english',title:'English News',source:'BBC News',url:'https://feeds.bbci.co.uk/news/rss.xml',lang:'en'},
    {id:'japanese',title:'Japanese News',source:'Yahoo!ニュース',url:'https://news.yahoo.co.jp/rss/topics/domestic.xml',lang:'ja'}
  ];
  var cache={};
  var proxy='https://api.allorigins.win/raw?url=';
  var root=document.getElementById('library-news-panel');
  if(!root)return;

  function safeText(value){
    var box=document.createElement('div');
    box.innerHTML=String(value||'');
    box.querySelectorAll('script,style,iframe,object,embed').forEach(function(node){node.remove();});
    return (box.textContent||box.innerText||'').replace(/\s+/g,' ').trim();
  }
  function parseXml(xml,feed){
    var doc=new DOMParser().parseFromString(xml,'text/xml');
    if(doc.querySelector('parsererror'))throw new Error('Invalid RSS');
    var nodes=Array.prototype.slice.call(doc.querySelectorAll('item')).slice(0,5);
    if(!nodes.length)nodes=Array.prototype.slice.call(doc.querySelectorAll('entry')).slice(0,5);
    return nodes.map(function(node){
      var linkNode=node.querySelector('link');
      var link=linkNode?(linkNode.textContent||linkNode.getAttribute('href')||'').trim():'';
      if(!link&&node.querySelector('link[href]'))link=node.querySelector('link[href]').getAttribute('href');
      var description=node.querySelector('description, summary, content\\:encoded, content');
      var date=node.querySelector('pubDate, published, updated');
      var title=safeText((node.querySelector('title')||{}).textContent);
      var summary=safeText(description&&description.textContent);
      if(summary===title)summary='';
      return {title:title,summary:summary,link:link,date:date?safeText(date.textContent):'',source:feed.source};
    }).filter(function(item){return item.title&&/^https?:\\/\\//i.test(item.link);});
  }
  function fetchFeed(feed){
    if(cache[feed.id])return Promise.resolve(cache[feed.id]);
    var url=proxy+encodeURIComponent(feed.url);
    return fetch(url,{cache:'no-store'}).then(function(response){
      if(!response.ok)throw new Error('RSS proxy returned '+response.status);
      return response.text();
    }).then(function(xml){
      var items=parseXml(xml,feed);
      if(!items.length)throw new Error('No headlines returned');
      cache[feed.id]=items;
      return items;
    });
  }
  function makeItem(item,index,lang){
    var li=document.createElement('li');li.className='library-news-item';
    var button=document.createElement('button');button.type='button';button.className='library-news-headline';
    button.setAttribute('aria-expanded','false');
    var title=document.createElement('span');title.className='library-news-headline__title';title.textContent=item.title;
    var chevron=document.createElement('span');chevron.className='library-news-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='+';
    button.appendChild(title);button.appendChild(chevron);
    var detail=document.createElement('div');detail.className='library-news-detail';detail.hidden=true;
    if(item.date){var date=document.createElement('p');date.className='library-news-date';date.textContent=item.date;detail.appendChild(date);}
    var summary=document.createElement('p');summary.className='library-news-summary';
    summary.textContent=item.summary|| (lang==='ja'?'RSSでは概要が提供されていません。記事本文は配信元でお読みください。':'The RSS feed does not include a summary. Open the original article to read more.');
    detail.appendChild(summary);
    var link=document.createElement('a');link.className='library-news-original';link.href=item.link;link.target='_blank';link.rel='noopener noreferrer';link.textContent=lang==='ja'?'記事全文を読む ↗':'Read full article ↗';detail.appendChild(link);
    button.addEventListener('click',function(){
      var open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(open));detail.hidden=!open;chevron.textContent=open?'−':'+';
      li.classList.toggle('is-open',open);
    });
    li.appendChild(button);li.appendChild(detail);return li;
  }
  function renderFeed(feed){
    var list=root.querySelector('[data-news-list="'+feed.id+'"]');
    var status=root.querySelector('[data-news-status="'+feed.id+'"]');
    if(!list||!status)return;
    status.textContent=feed.lang==='ja'?'ニュースを読み込み中…':'Loading headlines…';
    fetchFeed(feed).then(function(items){
      list.textContent='';
      items.slice(0,5).forEach(function(item,index){list.appendChild(makeItem(item,index,feed.lang));});
      status.textContent=feed.lang==='ja'?'最新5件 · '+feed.source:'Top 5 · '+feed.source;
    }).catch(function(){
      status.textContent=feed.lang==='ja'?'ニュースを読み込めません。時間をおいて再試行してください。':'Could not load news. Please try again later.';
      var retry=document.createElement('button');retry.type='button';retry.className='library-news-retry';retry.textContent=feed.lang==='ja'?'再読み込み':'Retry';
      retry.addEventListener('click',function(){delete cache[feed.id];renderFeed(feed);});
      status.appendChild(document.createTextNode(' '));status.appendChild(retry);
    });
  }
  feeds.forEach(function(feed){
    var toggle=root.querySelector('[data-news-toggle="'+feed.id+'"]');
    var body=root.querySelector('[data-news-body="'+feed.id+'"]');
    if(toggle&&body)toggle.addEventListener('click',function(){
      var open=toggle.getAttribute('aria-expanded')!=='true';
      toggle.setAttribute('aria-expanded',String(open));body.hidden=!open;
      var mark=toggle.querySelector('.library-news-column__mark');if(mark)mark.textContent=open?'−':'+';
    });
    renderFeed(feed);
  });
})();