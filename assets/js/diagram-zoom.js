(function () {
  "use strict";
  function init() {
    if (document.querySelector(".diagram-lightbox")) return;
    const overlay = document.createElement("div");
    overlay.className = "diagram-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Zoomable diagram");
    overlay.innerHTML = '<button class="diagram-lightbox__close" type="button" aria-label="Close diagram">Close ✕</button><div class="diagram-lightbox__stage"></div><div class="diagram-lightbox__help">Pinch to zoom · Drag to move · Tap Close to return</div>';
    document.body.appendChild(overlay);
    const stage = overlay.querySelector(".diagram-lightbox__stage");
    const close = overlay.querySelector(".diagram-lightbox__close");
    let scale = 1, tx = 0, ty = 0, pointers = new Map(), startDistance = 0, startScale = 1, startMid = null, startTx = 0, startTy = 0, lastPoint = null;
    function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
    function midpoint(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
    function point(e){return {x:e.clientX,y:e.clientY}}
    function apply(){const el=stage.firstElementChild;if(el)el.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'}
    function reset(){scale=1;tx=0;ty=0;pointers.clear();startDistance=0;apply()}
    function hide(){overlay.classList.remove("is-open");document.body.style.overflow="";stage.replaceChildren();reset()}
    function show(source){
      const clone=source.cloneNode(true);
      clone.removeAttribute("id");
      clone.style.width="auto";clone.style.height="auto";clone.style.maxWidth="none";clone.style.maxHeight="none";
      clone.style.minWidth="0";clone.style.minHeight="0";
      if(clone.tagName.toLowerCase()==="svg"){
        const vb=clone.viewBox&&clone.viewBox.baseVal;
        if(vb&&vb.width&&vb.height){const maxW=window.innerWidth-32,maxH=window.innerHeight-90;const fit=Math.min(maxW/vb.width,maxH/vb.height);clone.style.width=(vb.width*fit)+"px";clone.style.height=(vb.height*fit)+"px";}
        else {clone.style.maxWidth="calc(100vw - 32px)";clone.style.maxHeight="calc(100vh - 90px)";}
      }else if(clone.tagName.toLowerCase()==="table"){
        clone.style.width="max-content";clone.style.maxWidth="none";clone.style.tableLayout="auto";clone.style.whiteSpace="nowrap";clone.style.borderCollapse="collapse";
        clone.querySelectorAll("th,td").forEach(function(cell){cell.style.whiteSpace="nowrap";cell.style.overflowWrap="normal";cell.style.wordBreak="normal";cell.style.padding="10px 12px";cell.style.fontSize="16px";});
      }else{clone.style.maxWidth="calc(100vw - 32px)";clone.style.maxHeight="calc(100vh - 90px)";}
      stage.replaceChildren(clone);reset();overlay.classList.add("is-open");document.body.style.overflow="hidden";close.focus();
    }
    document.addEventListener("click",function(e){
      const trigger=e.target.closest(".wiki-wrap .diagram svg, .wiki-wrap svg.ai-illustration, .wiki-wrap figure img, .wiki-wrap table");
      if(!trigger || overlay.contains(trigger))return;
      if(e.target.closest("a"))return;
      show(trigger);
    });
    close.addEventListener("click",hide);
    overlay.addEventListener("click",function(e){if(e.target===overlay)hide()});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&overlay.classList.contains("is-open"))hide()});
    overlay.addEventListener("pointerdown",function(e){
      if(e.target===close)return;
      overlay.setPointerCapture&&overlay.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,point(e));
      if(pointers.size===1){lastPoint=point(e);startTx=tx;startTy=ty}
      if(pointers.size===2){const pts=Array.from(pointers.values());startDistance=distance(pts[0],pts[1]);startScale=scale;startMid=midpoint(pts[0],pts[1]);startTx=tx;startTy=ty}
    });
    overlay.addEventListener("pointermove",function(e){
      if(!pointers.has(e.pointerId))return;
      pointers.set(e.pointerId,point(e));
      if(pointers.size>=2){
        const pts=Array.from(pointers.values()).slice(0,2),d=distance(pts[0],pts[1]),mid=midpoint(pts[0],pts[1]);
        if(startDistance>0){const next=Math.max(1,Math.min(6,startScale*d/startDistance));tx=startTx+(mid.x-startMid.x);ty=startTy+(mid.y-startMid.y);scale=next;apply()}
      }else if(scale>1.02&&lastPoint){
        const p=point(e);tx+=p.x-lastPoint.x;ty+=p.y-lastPoint.y;lastPoint=p;apply()
      }
    });
    function release(e){pointers.delete(e.pointerId);if(pointers.size<2)startDistance=0;if(pointers.size===1){lastPoint=Array.from(pointers.values())[0]}}
    overlay.addEventListener("pointerup",release);overlay.addEventListener("pointercancel",release);
    overlay.addEventListener("wheel",function(e){e.preventDefault();scale=Math.max(1,Math.min(6,scale*(e.deltaY<0?1.15:.87)));apply()},{passive:false});
    document.addEventListener("keydown",function(e){if(overlay.classList.contains("is-open")&&(e.key==="+"||e.key==="="||e.key==="-")){scale=Math.max(1,Math.min(6,scale*(e.key==="-"?.85:1.18)));apply()}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();