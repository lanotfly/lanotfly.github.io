(function(window){
  'use strict';
  if(window.LibraryPodcastStorage)return;

  var DB_NAME='personal-library-podcast-storage';
  var DB_VERSION=1;
  var STORE_NAME='records';
  var cache=Object.create(null);
  var db=null;
  var ready=false;
  var readyCallbacks=[];
  var readyPromise=new Promise(function(resolve){readyCallbacks.push(resolve);});

  function normalizeTitle(episode){
    return String(episode&&(episode.title||episode.pageUrl)||'unknown').trim().toLowerCase().replace(/\s+/g,' ');
  }
  function episodeKey(showId,episode){
    return 'personal-library-played:'+showId+':title:'+encodeURIComponent(normalizeTitle(episode));
  }
  function legacyEpisodeKey(showId,episode){
    return 'personal-library-played:'+showId+':'+(episode&&(episode.url||episode.pageUrl||episode.title)||'unknown');
  }
  function historyKey(showId){return 'personal-library-episode-history:'+showId;}
  function historyIdentity(episode){
    if(episode&&episode.pageUrl)return 'page:'+String(episode.pageUrl).trim().replace(/[?#].*$/,'').toLowerCase();
    return 'title:'+normalizeTitle(episode);
  }
  function safeLocalGet(key){try{return localStorage.getItem(key);}catch(_){return null;}}
  function safeLocalRemove(key){try{localStorage.removeItem(key);}catch(_){}}
  function put(key,value){
    cache[key]=value;
    if(db){
      try{
        var tx=db.transaction(STORE_NAME,'readwrite');
        tx.objectStore(STORE_NAME).put({key:key,value:value});
        tx.onerror=function(){fallbackWrite(key,value);};
      }catch(_){fallbackWrite(key,value);}
    }else fallbackWrite(key,value);
  }
  function fallbackWrite(key,value){
    try{
      if(value===undefined||value===null)localStorage.removeItem(key);
      else localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
    }catch(_){}
  }
  function remove(key){
    delete cache[key];
    if(db){
      try{
        var tx=db.transaction(STORE_NAME,'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.onerror=function(){safeLocalRemove(key);};
      }catch(_){safeLocalRemove(key);}
    }else safeLocalRemove(key);
  }
  function isPlayed(showId,episode){
    var key=episodeKey(showId,episode),legacy=legacyEpisodeKey(showId,episode);
    if(cache[key]==='1'||cache[legacy]==='1')return true;
    if(safeLocalGet(key)==='1'||safeLocalGet(legacy)==='1')return true;
    return false;
  }
  function setPlayed(showId,episode,played){
    var key=episodeKey(showId,episode),legacy=legacyEpisodeKey(showId,episode);
    if(played){put(key,'1');put(legacy,'1');}
    else{remove(key);remove(legacy);}
  }
  function getEpisodeHistory(showId){
    var raw=cache[historyKey(showId)];
    if(raw===undefined||raw===null)raw=safeLocalGet(historyKey(showId));
    var parsed=Array.isArray(raw)?raw:(function(){try{return raw?JSON.parse(raw):[];}catch(_){return [];}})();
    return Array.isArray(parsed)?parsed.filter(function(item){return item&&typeof item.title==='string'&&(item.url||item.pageUrl);}):[];
  }
  function mergeEpisodeHistory(showId,newEpisodes){
    var merged=[],seen=Object.create(null);
    function add(episode){
      if(!episode||!episode.title||(!episode.url&&!episode.pageUrl))return;
      var key=historyIdentity(episode);
      if(seen[key]){
        var duplicate=merged.find(function(item){return historyIdentity(item)===key;});
        if(duplicate&&(duplicate.duration===undefined||duplicate.duration===null||duplicate.duration==='')&&episode.duration!==undefined&&episode.duration!==null&&episode.duration!=='')duplicate.duration=episode.duration;
        if(duplicate&&!duplicate.published&&(episode.published||episode.pubDate||episode.date||episode.isoDate))duplicate.published=episode.published||episode.pubDate||episode.date||episode.isoDate;
        return;
      }
      seen[key]=true;
      merged.push({title:String(episode.title),url:episode.url||null,pageUrl:episode.pageUrl||null,duration:episode.duration===undefined||episode.duration===null?'':episode.duration,published:episode.published||episode.pubDate||episode.date||episode.isoDate||''});
    }
    (Array.isArray(newEpisodes)?newEpisodes:[]).forEach(add);
    getEpisodeHistory(showId).forEach(add);
    put(historyKey(showId),merged);
    return merged;
  }
  function progressKey(showId,episode,audio){
    var identity=episode&&(episode.pageUrl||episode.url||episode.title)||(audio&&audio.dataset.episodeTitle)||'unknown';
    return 'personal-library-progress:'+showId+':'+identity;
  }
  function saveProgress(audio){
    if(!audio)return;
    var key=audio.dataset.progressKey;
    if(!key||!Number.isFinite(audio.currentTime)||audio.currentTime<0)return;
    if(Number.isFinite(audio.duration)&&audio.duration>0&&audio.currentTime>=audio.duration-2){remove(key);return;}
    if(audio.currentTime>0)put(key,String(audio.currentTime));
  }
  function applySavedProgress(audio,key){
    if(!audio||!key||audio.dataset.progressKey!==key||!Number.isFinite(audio.duration)||audio.duration<=0)return;
    var saved=Number(cache[key]===undefined?safeLocalGet(key):cache[key]);
    if(Number.isFinite(saved)&&saved>0&&saved<audio.duration-2)audio.currentTime=saved;
  }
  function restoreProgress(audio){
    if(!audio)return;
    var key=audio.dataset.progressKey;
    if(!key||audio.dataset.restoredProgressKey===key||!Number.isFinite(audio.duration)||audio.duration<=0)return;
    audio.dataset.restoredProgressKey=key;
    if(ready)applySavedProgress(audio,key);
    else readyPromise.then(function(){applySavedProgress(audio,key);});
  }

  function parseHistoryValue(value){
    if(Array.isArray(value))return value;
    if(typeof value==='string'){try{var parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[];}catch(_){}}
    return [];
  }
  function mergeHistoryValues(){
    var merged=[],seen=Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function(value){
      parseHistoryValue(value).forEach(function(item){
        if(!item||typeof item.title!=='string'||(!item.url&&!item.pageUrl))return;
        var key=historyIdentity(item);
        if(seen[key]){
          var existing=merged[seen[key]-1];
          if(existing&&(existing.duration===undefined||existing.duration===null||existing.duration==='')&&item.duration!==undefined&&item.duration!==null&&item.duration!=='')existing.duration=item.duration;
          if(existing&&!existing.published&&(item.published||item.pubDate||item.date||item.isoDate))existing.published=item.published||item.pubDate||item.date||item.isoDate;
          if(existing&&!existing.url&&item.url)existing.url=item.url;
          if(existing&&!existing.pageUrl&&item.pageUrl)existing.pageUrl=item.pageUrl;
          return;
        }
        seen[key]=merged.length+1;
        merged.push({title:item.title,url:item.url||null,pageUrl:item.pageUrl||null,duration:item.duration===undefined||item.duration===null?'':item.duration,published:item.published||item.pubDate||item.date||item.isoDate||''});
      });
    });
    return merged;
  }

  function openDatabase(){
    if(!('indexedDB' in window)){finishReady();return;}
    var request;
    try{request=indexedDB.open(DB_NAME,DB_VERSION);}catch(_){finishReady();return;}
    request.onupgradeneeded=function(){
      var database=request.result;
      if(!database.objectStoreNames.contains(STORE_NAME))database.createObjectStore(STORE_NAME,{keyPath:'key'});
    };
    request.onerror=function(){finishReady();};
    request.onblocked=function(){finishReady();};
    request.onsuccess=function(){
      db=request.result;
      db.onversionchange=function(){db.close();db=null;};
      loadAndMigrate();
    };
  }
  function loadAndMigrate(){
    var request;
    try{request=db.transaction(STORE_NAME,'readonly').objectStore(STORE_NAME).getAll();}
    catch(_){finishReady();return;}
    request.onerror=function(){finishReady();};
    request.onsuccess=function(){
      var storedKeys=Object.create(null),storedValues=Object.create(null);
      (request.result||[]).forEach(function(item){
        if(!item||typeof item.key!=='string')return;
        storedKeys[item.key]=true;
        storedValues[item.key]=item.value;
        /* Do not overwrite changes made while IndexedDB was opening. */
        if(cache[item.key]===undefined)cache[item.key]=item.value;
        else if(item.key.indexOf('personal-library-episode-history:')===0){
          cache[item.key]=mergeHistoryValues(cache[item.key],item.value);
        }
      });
      var migrations=[],legacyKeys=[];
      try{
        for(var i=0;i<localStorage.length;i++){
          var key=localStorage.key(i);
          if(!key||!(/^(personal-library-played:|personal-library-episode-history:|personal-library-progress:)/).test(key))continue;
          legacyKeys.push(key);
          var raw=localStorage.getItem(key),value=raw;
          if(key.indexOf('personal-library-episode-history:')===0){
            value=mergeHistoryValues(cache[key],storedValues[key],raw);
            cache[key]=value;
            if(!storedKeys[key]||JSON.stringify(value)!==JSON.stringify(storedValues[key])){
              migrations.push({key:key,value:value});
            }
          }else if(!storedKeys[key]){
            if(cache[key]===undefined)cache[key]=value;
            migrations.push({key:key,value:cache[key]});
          }
        }
      }catch(_){
        /* Keep every legacy key if migration cannot be inspected safely. */
        finishReady();return;
      }
      if(!migrations.length){
        /* Only remove legacy copies after confirming that matching IndexedDB records exist. */
        legacyKeys.forEach(function(key){if(storedKeys[key])safeLocalRemove(key);});
        finishReady();return;
      }
      try{
        var tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);
        migrations.forEach(function(item){store.put(item);});
        tx.oncomplete=function(){
          legacyKeys.forEach(safeLocalRemove);
          finishReady();
        };
        tx.onerror=function(){finishReady();};
        tx.onabort=function(){finishReady();};
      }catch(_){finishReady();}
    };
  }
  function finishReady(){
    if(ready)return;
    ready=true;
    readyCallbacks.splice(0).forEach(function(resolve){resolve();});
    if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('library-podcast-storage-ready'));
  }
  openDatabase();

  window.LibraryPodcastStorage={
    episodeKey:episodeKey,legacyEpisodeKey:legacyEpisodeKey,isPlayed:isPlayed,setPlayed:setPlayed,
    getEpisodeHistory:getEpisodeHistory,mergeEpisodeHistory:mergeEpisodeHistory,
    progressKey:progressKey,saveProgress:saveProgress,restoreProgress:restoreProgress,
    ready:readyPromise, getBackend:function(){return db?'IndexedDB':(('indexedDB' in window)?'IndexedDB (opening)':'localStorage fallback');}
  };
})(window);
