/* ホームページの中身をスプレッドシートから読む
   「EGO AMIGO ホームページの中身」のスプシを直すと、料金・コーチ・お知らせが変わる。
   読めないときは、ページに書いてある中身をそのまま出す。 */
(function(){
  var SHEET_ID = "1UPZjvL0F8K2yehmfyfCLYB2L29dIc7FQcFnmQsgUaTQ";
  var cache = {};
  function csv(t){
    var rows=[], row=[], f="", q=false;
    for(var i=0;i<t.length;i++){
      var c=t[i];
      if(q){ if(c==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
      else if(c==='"') q=true;
      else if(c===','){ row.push(f); f=""; }
      else if(c==='\n'){ row.push(f); rows.push(row); row=[]; f=""; }
      else if(c!=='\r') f+=c;
    }
    if(f!==""||row.length){ row.push(f); rows.push(row); }
    return rows;
  }
  /* 1行目を見出しにして {見出し:中身} の並びにする */
  function get(name){
    if(!SHEET_ID) return Promise.reject();
    if(cache[name]) return cache[name];
    var url="https://docs.google.com/spreadsheets/d/"+SHEET_ID+"/gviz/tq?tqx=out:csv&headers=1&sheet="+encodeURIComponent(name)+"&t="+Date.now();
    cache[name]=fetch(url).then(function(r){ if(!r.ok) throw 0; return r.text(); }).then(function(t){
      if(/^\s*</.test(t)) throw 0;   /* 見られない設定のときはログインの画面が返る */
      var rs=csv(t); var h=(rs.shift()||[]).map(function(x){return x.trim()});
      return rs.map(function(r){ var o={}; h.forEach(function(k,i){ o[k]=(r[i]||"").trim(); }); return o; })
               .filter(function(o){ return Object.keys(o).some(function(k){return o[k]}); });
    });
    return cache[name];
  }
  /* 「、」「。」のところで区切って、スマホで言葉の途中で改行されないようにする */
  function phr(el, text){
    el.textContent="";
    (text.match(/[^、。]+[、。]?/g)||[text]).forEach(function(p){
      var s=document.createElement("span"); s.className="p"; s.textContent=p; el.appendChild(s);
    });
  }
  function row(dl, a, aSmall, b, bSmall){
    var d=document.createElement("div"), dt=document.createElement("dt"), dd=document.createElement("dd");
    dt.textContent=a;
    if(aSmall){ var s=document.createElement("small"); s.textContent=aSmall; dt.appendChild(s); }
    phr(dd,b);
    if(bSmall){ var s2=document.createElement("small"); phr(s2,bSmall); dd.appendChild(s2); }
    d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
  }
  function lists(){
    var fee=document.getElementById("fee"); if(!fee) return [];
    return fee.querySelectorAll("dl.fee-list");
  }
  window.EgoSheet = { get: get };
  if(typeof document==="undefined") return;

  /* 料金 */
  get("料金").then(function(rs){
    var dl=lists()[0]; if(!dl || !rs.length) return;
    var note=document.querySelector("#fee .fee-note");
    var items=rs.filter(function(r){ return r["項目"] && !/^※/.test(r["項目"]) && r["金額"]; });
    var notes=rs.filter(function(r){ return /^※/.test(r["項目"]||"") && r["金額"]; });
    if(!items.length) return;
    dl.textContent="";
    items.forEach(function(r){ row(dl, r["項目"], r["項目の下の小さい字"], r["金額"], r["金額の下の小さい字"]); });
    if(note){ if(notes.length){ phr(note, notes.map(function(r){return r["金額"]}).join("")); note.hidden=false; } else note.hidden=true; }
  }).catch(function(){});

  /* コーチ */
  get("コーチ").then(function(rs){
    var dl=lists()[1]; if(!dl || !rs.length) return;
    dl.textContent="";
    rs.forEach(function(r){ row(dl, r["役割"]||"コーチ", "", r["お名前"]||"（お名前・準備中）", r["ひとこと"]); });
  }).catch(function(){});
})();
