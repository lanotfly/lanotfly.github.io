(function(window,document){
  'use strict';
  if(window.LibraryStorageCheck)return;
  var MiB=1024*1024, LOCAL_STORAGE_LIMIT=5*MiB;
  function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<MiB)return (bytes/1024).toFixed(1)+' KiB';return (bytes/MiB).toFixed(2)+' MiB';}
  function escapeText(value){return String(value).replace(/[&<>"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char];});}
  function inspectLocal(){
    var storage;
    try{storage=window.localStorage;storage.getItem('__library_storage_check_read_test__');}
    catch(error){return {error:'localStorage is unavailable in this browsing context. The browser may be blocking access.'};}
    var usage=0,keys=[],historyRecords=[],historyBytes=0,statusKeys=[],modernStatusKeys=[],progressKeys=[],showIds={};
    try{
      for(var i=0;i<storage.length;i++){
        var key=storage.key(i),value=storage.getItem(key)||'';
        if(key===null)continue;
        usage+=(key.length+value.length)*2;keys.push({key:key,value:value});
        if(key.indexOf('personal-library-episode-history:')===0){
          var showId=key.slice('personal-library-episode-history:'.length);if(showId)showIds[showId]=true;
          try{var records=JSON.parse(value||'[]');if(Array.isArray(records))records.forEach(function(record){
            if(record&&typeof record.title==='string'&&(record.url||record.pageUrl)){historyRecords.push(record);historyBytes+=(JSON.stringify(record).length*2)+2;}
          });}catch(_){}
        }else if(key.indexOf('personal-library-played:')===0){
          statusKeys.push(key);var id=key.slice('personal-library-played:'.length).split(':')[0];if(id)showIds[id]=true;
          if(key.indexOf(':title:')>=0)modernStatusKeys.push(key);
        }else if(key.indexOf('personal-library-progress:')===0){
          progressKeys.push(key);var progressId=key.slice('personal-library-progress:'.length).split(':')[0];if(progressId)showIds[progressId]=true;
        }
      }
    }catch(error){return {error:'Could not read all localStorage entries: '+(error&&error.message?error.message:'unknown error')};}
    var statusCount=Math.max(modernStatusKeys.length,statusKeys.length-modernStatusKeys.length);
    var avgHistoryBytes=historyRecords.length?historyBytes/historyRecords.length:320,statusByteTotal=0;
    statusKeys.forEach(function(key){var value='';try{value=storage.getItem(key)||'';}catch(_){}statusByteTotal+=(key.length+value.length)*2;});
    var avgStatusBytes=statusKeys.length?statusByteTotal/statusKeys.length:110;
    var bytesPerEpisode=Math.max(1,avgHistoryBytes+(avgStatusBytes*2)),remaining=Math.max(0,LOCAL_STORAGE_LIMIT-usage);
    var customPodcastSources=document.querySelectorAll('.site-tab--podcast').length,newsPodcastSources=document.querySelectorAll('[data-news-feed-panel]').length,durationCacheCount=0;
    var cache=keys.find(function(item){return item.key==='personal-library-podcast-duration-cache-v1';});
    if(cache){try{durationCacheCount=Object.keys(JSON.parse(cache.value||'{}')||{}).length;}catch(_){}}
    return {usage:usage,limit:LOCAL_STORAGE_LIMIT,remaining:remaining,percent:Math.min(100,usage/LOCAL_STORAGE_LIMIT*100),
      historyCount:historyRecords.length,statusKeys:statusKeys.length,statusCount:statusCount,progressCount:progressKeys.length,
      showCount:Object.keys(showIds).length,sourceCount:customPodcastSources+newsPodcastSources,customPodcastSources:customPodcastSources,
      newsPodcastSources:newsPodcastSources,averageEpisodeBytes:bytesPerEpisode,
      estimatedMore:Math.floor(Math.max(0,remaining-LOCAL_STORAGE_LIMIT*0.1)/bytesPerEpisode),durationCacheCount:durationCacheCount,
      standalone:!!(window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches))};
  }
  function inspectAdvanced(){
    var nav=window.navigator,storage=nav.storage||null;
    var estimatePromise=storage&&typeof storage.estimate==='function'?storage.estimate().catch(function(){return null;}):Promise.resolve(null);
    var persistedPromise=storage&&typeof storage.persisted==='function'?storage.persisted().catch(function(){return null;}):Promise.resolve(null);
    var databasesPromise=window.indexedDB&&typeof window.indexedDB.databases==='function'?
      window.indexedDB.databases().catch(function(){return null;}):Promise.resolve(null);
    return Promise.all([estimatePromise,persistedPromise,databasesPromise]).then(function(values){
      var estimate=values[0],persisted=values[1],databases=values[2];
      return {estimate:estimate&&Number.isFinite(estimate.usage)&&Number.isFinite(estimate.quota)?{
        usage:estimate.usage,quota:estimate.quota,remaining:Math.max(0,estimate.quota-estimate.usage),
        percent:estimate.quota>0?estimate.usage/estimate.quota*100:0}:null,
        persisted:persisted,databases:databases};
    });
  }
  function render(panel){
    var result=inspectLocal();
    if(result.error){panel.innerHTML='<p class="storage-check__error">'+escapeText(result.error)+'</p>';return;}
    panel.innerHTML='<p class="storage-check__note">Checking browser storage…</p>';
    inspectAdvanced().then(function(advanced){
      var percent=result.percent.toFixed(1),contextLabel=result.standalone?'Home Screen Web App':'Safari browser tab or other browser context';
      var warning=result.percent>=80?'localStorage is getting high; new status writes may fail.':result.percent>=60?'Keep headroom: localStorage writes can fail before this estimate reaches the limit.':'Current localStorage usage looks comfortable.';
      var quota=advanced.estimate;
      var databaseText=advanced.databases===null?'Database names are not exposed by this browser':(advanced.databases.length?advanced.databases.map(function(db){return db.name||'(unnamed database)';}).join(', '):'No IndexedDB databases found');
      var persistenceText=advanced.persisted===true?'Persistent storage granted':advanced.persisted===false?'Best-effort storage (browser may clear it)':'Persistence status unavailable';
      var overallHtml=quota?
        '<div class="storage-check__summary"><strong>'+formatBytes(quota.usage)+' estimated origin storage used</strong><span>of '+formatBytes(quota.quota)+' reported quota ('+quota.percent.toFixed(2)+'%)</span></div>'+
        '<div class="storage-check__meter" role="progressbar" aria-label="Estimated origin storage usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+quota.percent.toFixed(2)+'"><span style="width:'+Math.min(100,quota.percent)+'%"></span></div>'+
        '<p><strong>Estimated origin storage remaining:</strong> '+formatBytes(quota.remaining)+'</p>':
        '<p class="storage-check__note">This browser does not expose a usable StorageManager estimate here.</p>';
      panel.innerHTML=
        '<h3>Browser storage</h3>'+overallHtml+
        '<ul class="storage-check__details"><li><strong>Storage persistence:</strong> '+persistenceText+'</li><li><strong>IndexedDB API:</strong> '+(window.indexedDB?'available':'unavailable')+'</li><li><strong>IndexedDB databases:</strong> '+escapeText(databaseText)+'</li></ul>'+
        '<h3>localStorage (small key/value data)</h3>'+
        '<div class="storage-check__summary"><strong>'+formatBytes(result.usage)+' used</strong><span>of '+formatBytes(result.limit)+' common localStorage limit ('+percent+'%)</span></div>'+
        '<div class="storage-check__meter" role="progressbar" aria-label="Estimated localStorage usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+
        '<p><strong>Remaining by localStorage estimate:</strong> '+formatBytes(result.remaining)+'</p>'+
        '<ul class="storage-check__details"><li><strong>Context:</strong> '+contextLabel+'</li>'+
        '<li><strong>Podcast sources on this page:</strong> '+result.sourceCount+' ('+result.customPodcastSources+' custom feeds + '+result.newsPodcastSources+' news feeds)</li>'+
        '<li><strong>Podcast sources represented in saved storage:</strong> '+result.showCount+'</li>'+
        '<li><strong>Saved episode-history records:</strong> '+result.historyCount+'</li>'+
        '<li><strong>Played episodes estimated from status keys:</strong> '+result.statusCount+' ('+result.statusKeys+' raw status keys)</li>'+
        '<li><strong>Playback-progress records:</strong> '+result.progressCount+'</li><li><strong>Cached episode durations:</strong> '+result.durationCacheCount+'</li>'+
        '<li><strong>Estimated storage per additional episode:</strong> '+formatBytes(result.averageEpisodeBytes)+'</li>'+
        '<li><strong>Estimated additional episodes before localStorage limit:</strong> about '+result.estimatedMore+' with a 10% reserve</li></ul>'+
        '<p class="storage-check__note">'+escapeText(warning)+'</p>'+
        '<p class="storage-check__note">Important: podcast played status, episode history, and playback progress now use IndexedDB when available. Existing matching localStorage records are migrated automatically and removed from localStorage after the IndexedDB transaction succeeds. The localStorage counts above show only records still left there (including unrelated site data and the duration cache). The browser quota covers origin storage overall, not IndexedDB alone; the 5 MiB localStorage value is a common limit, not a live Safari quota. All figures are estimates.</p>';
    }).catch(function(){panel.innerHTML+='<p class="storage-check__note">Could not read advanced storage estimates in this browser.</p>';});
  }
  function init(){
    var button=document.getElementById('library-storage-check-toggle'),panel=document.getElementById('library-storage-check-panel');
    if(!button||!panel)return;
    button.addEventListener('click',function(){var opening=panel.hidden;panel.hidden=!opening;button.setAttribute('aria-expanded',String(opening));if(opening)render(panel);});
    window.LibraryStorageCheck={refresh:function(){render(panel);},inspect:inspectLocal,inspectAdvanced:inspectAdvanced};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
