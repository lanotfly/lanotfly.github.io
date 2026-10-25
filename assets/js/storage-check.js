(function(window,document){
  'use strict';
  if(window.LibraryStorageCheck)return;
  var MiB=1024*1024, LOCAL_STORAGE_LIMIT=5*MiB;
  function inspect(){
    var storage;
    try{storage=window.localStorage;storage.getItem('__library_storage_check_read_test__');}
    catch(error){return {error:'localStorage is unavailable in this browsing context. The browser may be blocking access.'};}
    var usage=0,keys=[],historyRecords=[],historyBytes=0,statusKeys=[],modernStatusKeys=[],progressKeys=[],showIds={};
    try{
      for(var i=0;i<storage.length;i++){
        var key=storage.key(i),value=storage.getItem(key)||'';
        if(key===null)continue;
        usage+=(key.length+value.length)*2;
        keys.push({key:key,value:value});
        if(key.indexOf('personal-library-episode-history:')===0){
          var showId=key.slice('personal-library-episode-history:'.length);
          if(showId)showIds[showId]=true;
          try{
            var records=JSON.parse(value||'[]');
            if(Array.isArray(records))records.forEach(function(record){
              if(record&&typeof record.title==='string'&&(record.url||record.pageUrl)){
                historyRecords.push(record);historyBytes+=(JSON.stringify(record).length*2)+2;
              }
            });
          }catch(_){}
        }else if(key.indexOf('personal-library-played:')===0){
          statusKeys.push(key);
          var id=key.slice('personal-library-played:'.length).split(':')[0];
          if(id)showIds[id]=true;
          if(key.indexOf(':title:')>=0)modernStatusKeys.push(key);
        }else if(key.indexOf('personal-library-progress:')===0){
          progressKeys.push(key);
          var progressId=key.slice('personal-library-progress:'.length).split(':')[0];
          if(progressId)showIds[progressId]=true;
        }
      }
    }catch(error){return {error:'Safari could not read all localStorage entries: '+(error&&error.message?error.message:'unknown error')};}
    var statusCount=Math.max(modernStatusKeys.length,statusKeys.length-modernStatusKeys.length);
    var avgHistoryBytes=historyRecords.length?historyBytes/historyRecords.length:320;
    var statusByteTotal=0;
    statusKeys.forEach(function(key){var value='';try{value=storage.getItem(key)||'';}catch(_){}statusByteTotal+=(key.length+value.length)*2;});
    var avgStatusBytes=statusKeys.length?statusByteTotal/statusKeys.length:110;
    var bytesPerEpisode=Math.max(1,avgHistoryBytes+(avgStatusBytes*2));
    var remaining=Math.max(0,LOCAL_STORAGE_LIMIT-usage);
    var safeRemaining=Math.max(0,remaining-(LOCAL_STORAGE_LIMIT*0.1));
    var customPodcastSources=document.querySelectorAll('.site-tab--podcast').length;
    var newsPodcastSources=document.querySelectorAll('[data-news-feed-panel]').length;
    var durationCacheCount=0;
    var cache=keys.find(function(item){return item.key==='personal-library-podcast-duration-cache-v1';});
    if(cache){try{durationCacheCount=Object.keys(JSON.parse(cache.value||'{}')||{}).length;}catch(_){}}
    return {
      usage:usage,limit:LOCAL_STORAGE_LIMIT,remaining:remaining,percent:Math.min(100,usage/LOCAL_STORAGE_LIMIT*100),
      historyCount:historyRecords.length,statusKeys:statusKeys.length,statusCount:statusCount,
      progressCount:progressKeys.length,showCount:Object.keys(showIds).length,
      sourceCount:customPodcastSources+newsPodcastSources,customPodcastSources:customPodcastSources,newsPodcastSources:newsPodcastSources,
      averageEpisodeBytes:bytesPerEpisode,estimatedMore:Math.floor(safeRemaining/bytesPerEpisode),durationCacheCount:durationCacheCount,
      standalone:!!(window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches))
    };
  }
  function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<MiB)return (bytes/1024).toFixed(1)+' KiB';return (bytes/MiB).toFixed(2)+' MiB';}
  function escapeText(value){return String(value).replace(/[&<>"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char];});}
  function render(panel){
    var result=inspect();
    if(result.error){panel.innerHTML='<p class="storage-check__error">'+escapeText(result.error)+'</p>';return;}
    var percent=result.percent.toFixed(1);
    var contextLabel=result.standalone?'Home Screen Web App':'Safari browser tab or other browser context';
    var warning=result.percent>=80?'Storage is getting high. Consider moving episode history to IndexedDB.':result.percent>=60?'Keep some headroom; Safari may reject writes before this estimate reaches the limit.':'Current localStorage usage looks comfortable.';
    panel.innerHTML=
      '<div class="storage-check__summary"><strong>'+formatBytes(result.usage)+' used</strong><span>of '+formatBytes(result.limit)+' estimated localStorage limit ('+percent+'%)</span></div>'+
      '<div class="storage-check__meter" role="progressbar" aria-label="Estimated localStorage usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+
      '<p><strong>Remaining by estimate:</strong> '+formatBytes(result.remaining)+'</p>'+
      '<ul class="storage-check__details">'+
      '<li><strong>Context:</strong> '+contextLabel+'</li>'+
      '<li><strong>Podcast sources on this page:</strong> '+result.sourceCount+' ('+result.customPodcastSources+' custom feeds + '+result.newsPodcastSources+' news feeds)</li>'+
      '<li><strong>Podcast sources represented in saved storage:</strong> '+result.showCount+'</li>'+
      '<li><strong>Saved episode-history records:</strong> '+result.historyCount+'</li>'+
      '<li><strong>Played episodes estimated from status keys:</strong> '+result.statusCount+' ('+result.statusKeys+' raw status keys)</li>'+
      '<li><strong>Playback-progress records:</strong> '+result.progressCount+'</li>'+
      '<li><strong>Cached episode durations:</strong> '+result.durationCacheCount+'</li>'+
      '<li><strong>Estimated storage per additional episode:</strong> '+formatBytes(result.averageEpisodeBytes)+'</li>'+
      '<li><strong>Estimated additional episodes:</strong> about '+result.estimatedMore+' with a 10% quota reserve</li>'+
      '</ul><p class="storage-check__note">'+escapeText(warning)+'</p>'+
      '<p class="storage-check__note">Approximation: localStorage size is estimated from JavaScript UTF-16 key/value lengths. The 5 MiB limit is a common Web Storage limit, not a live quota reported by Safari. Episode capacity is estimated from records currently stored in this browsing context; custom feeds not yet saved may have different record sizes.</p>';
  }
  function init(){
    var button=document.getElementById('library-storage-check-toggle'),panel=document.getElementById('library-storage-check-panel');
    if(!button||!panel)return;
    button.addEventListener('click',function(){
      var opening=panel.hidden;panel.hidden=!opening;button.setAttribute('aria-expanded',String(opening));
      if(opening)render(panel);
    });
    window.LibraryStorageCheck={refresh:function(){render(panel);},inspect:inspect};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
