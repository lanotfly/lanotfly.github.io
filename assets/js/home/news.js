/* Home RSS reader: shared Market/News tabs and two long-form-oriented sources. */
(function(window,document){
  'use strict';
  if(window.__homeNewsInstalled)return;
  window.__homeNewsInstalled=true;
  var topTabs=Array.prototype.slice.call(document.querySelectorAll('[data-home-panel-tab]'));
  var views=Array.prototype.slice.call(document.querySelectorAll('[data-home-panel-view]'));
  var sourceTabs=Array.prototype.slice.call(document.querySelectorAll('[data-news-source-tab]'));
  var sourcePanels=Array.prototype.slice.call(document.querySelectorAll('[data-news-source-panel]'));
  if(!topTabs.length||!views.length)return;
  var feeds={
    japanese:{url:'https://toyokeizai.net/list/feed/rss',proxy:'https://proxy.cors.dev/',label:'東洋経済オンライン'},
    english:{url:'https://www.theguardian.com/international/rss',proxy:'https://proxy.cors.dev/',label:'The Guardian'}
  };
  var loaded={japanese:false,english:false};
  var busy={japanese:false,english:false};
  function activateTop(id){
    topTabs.forEach(function(tab){var on=tab.getAttribute('data-home-panel-tab')===id;tab.classList.toggle('is-active',on);tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});
    views.forEach(function(view){view.hidden=view.getAttribute('data-home-panel-view')!==id;});
    if(id==='news')loadFeed(activeSource(),false);
  }
  var activeNewsSource='japanese';
  function activeSource(){return activeNewsSource;}
  function activateSource(id){
    activeNewsSource=id;
    sourceTabs.forEach(function(tab){var on=tab.getAttribute('data-news-source-tab')===id;tab.classList.toggle('is-active',on);tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});
    sourcePanels.forEach(function(panel){panel.hidden=panel.getAttribute('data-news-source-panel')!==id;});
    if(document.querySelector('[data-home-panel-view="news"]:not([hidden])'))loadFeed(id,false);
  }
  function node(tag,cls,text){var el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;}
  function getText(parent,names){for(var i=0;i<names.length;i++){var found=parent.getElementsByTagNameNS('*',names[i])[0]||parent.getElementsByTagName(names[i])[0];if(found)return found.textContent||'';}return '';}
  function plainText(html){
    var doc=new DOMParser().parseFromString(String(html||''),'text/html');
    doc.querySelectorAll('script,style,iframe,object,svg').forEach(function(el){el.remove();});
    return (doc.body.textContent||'').replace(/\\s+/g,' ').trim();
  }
  function dateLabel(raw){if(!raw)return '';var d=new Date(raw);if(Number.isNaN(d.getTime()))return raw;return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(d);}
  function makeItem(item,lang){
    var title=getText(item,['title']).trim()||'Untitled article';
    var link=getText(item,['link']).trim();
    var date=getText(item,['pubDate','published','updated','date']);
    var body=getText(item,['encoded','content','description','summary']);
    if(!body)body=getText(item,['description']);
    var summary=plainText(body);
    var card=node('details','home-news-item');
    var summaryRow=node('summary','home-news-item__title-row');
    var titleNode=node('span','home-news-item__title',title);
    var arrow=node('span','home-news-item__chevron','＋');
    arrow.setAttribute('aria-hidden','true');
    summaryRow.appendChild(titleNode);summaryRow.appendChild(arrow);card.appendChild(summaryRow);
    var detail=node('div','home-news-item__detail');
    var meta=node('p','home-news-item__meta');
    if(date)meta.appendChild(node('span','',dateLabel(date)));
    meta.appendChild(node('span','',feeds[lang].label));
    detail.appendChild(meta);
    detail.appendChild(node('h3','home-news-item__full-title',title));
    if(summary){
      detail.appendChild(node('p','home-news-item__summary',summary));
    }else{
      detail.appendChild(node('p','home-news-item__summary',lang==='english'?'The RSS feed did not include an article summary for this story.':'このニュースにはRSSの概要文が含まれていません。'));
    }
    var note=node('p','home-news-item__note',lang==='english'?'This is the full text supplied in the RSS feed, where available. Some feeds provide only an excerpt, so this is not necessarily the complete publisher article.':'RSSに含まれる記事概要を表示しています。配信元が概要のみを提供している場合、記事全文ではありません。');
    detail.appendChild(note);
    card.appendChild(detail);
    card.addEventListener('toggle',function(){if(card.open){arrow.textContent='－';}else{arrow.textContent='＋';}});
    return card;
  }
  function parseFeed(xml,lang){
    var doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('RSS feed could not be parsed.');
    var items=Array.prototype.slice.call(doc.getElementsByTagName('item'));
    if(!items.length)items=Array.prototype.slice.call(doc.getElementsByTagName('entry'));
    return items.slice(0,5).map(function(item){return makeItem(item,lang);}).filter(Boolean);
  }
  function loadFeed(lang,force){
    var list=document.querySelector('[data-news-list="'+lang+'"]');
    var status=document.querySelector('[data-news-status="'+lang+'"]');
    if(!list||busy[lang]||(!force&&loaded[lang]))return;
    busy[lang]=true;status.textContent='Loading articles…';
    var url=feeds[lang].proxy+feeds[lang].url;
    fetch(url,{cache:force?'no-store':'default'}).then(function(response){if(!response.ok)throw new Error('HTTP '+response.status);return response.text();}).then(function(xml){
      var cards=parseFeed(xml,lang);
      if(!cards.length)throw new Error('No articles were returned by this feed.');
      list.replaceChildren();cards.forEach(function(card){list.appendChild(card);});
      status.textContent='Latest '+cards.length+' articles · Tap a headline to expand its available details.'
      loaded[lang]=true;
    }).catch(function(error){
      status.textContent='Could not load this feed right now. Open the source website instead.';
      if(!list.children.length){var fallback=node('p','home-news-item__summary','Feed loading failed: '+(error&&error.message?error.message:'network error')+' ');var link=node('a','','Visit '+feeds[lang].label);link.href=lang==='english'?'https://www.theguardian.com/international':'https://toyokeizai.net/';link.target='_blank';link.rel='noopener noreferrer';fallback.appendChild(link);list.replaceChildren(fallback);}
    }).finally(function(){busy[lang]=false;});
  }
  topTabs.forEach(function(tab){tab.addEventListener('click',function(){activateTop(tab.getAttribute('data-home-panel-tab'));});});
  sourceTabs.forEach(function(tab){tab.addEventListener('click',function(){activateSource(tab.getAttribute('data-news-source-tab'));});});
  document.querySelectorAll('[data-news-refresh]').forEach(function(button){button.addEventListener('click',function(){var id=button.getAttribute('data-news-refresh');loaded[id]=false;var list=document.querySelector('[data-news-list="'+id+'"]');if(list)list.replaceChildren();loadFeed(id,true);});});
  activateTop('market');
  activateSource('japanese');
})(window,document);
