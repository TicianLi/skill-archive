const KEY="skiiil_archives_v1";

// ---------- 同义词库（可按需增删）----------
const SYNONYMS = {
  "视频": ["video", "影片", "录像", "转码"],
  "音频": ["audio", "声音", "语音", "录音"],
  "字幕": ["subtitle", "caption", "cc", "srt"],
  "大模型": ["llm", "chatgpt", "deepseek", "qwen", "gpt", "claude"],
  "部署": ["deploy", "上线", "发布", "docker compose", "ci/cd"],
  "设计": ["ui", "ux", "figma", "sketch", "界面", "视觉"],
  "编程": ["code", "coding", "开发", "脚本", "programming"],
  "数据": ["data", "database", "sql", "excel", "报表"],
  "项目": ["project", "管理", "甘特", "里程碑", "jira"],
  "沟通": ["communication", "presentation", "汇报", "谈判", "异议"],
};

// ---------- Levenshtein 距离（拼写容错）----------
function levenshtein(a, b) {
  const an = a.length, bn = b.length;
  const dp = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) dp[i][0] = i;
  for (let j = 0; j <= bn; j++) dp[0][j] = j;
  for (let i = 1; i <= an; i++)
    for (let j = 1; j <= bn; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
  return dp[an][bn];
}

// ---------- 分类规则（含同义词扩展和模糊匹配）----------
const CAT_RULES_FUZZY = [
  { cat: "编程开发/系统部署", kw: ["python","js","javascript","docker","api","服务器","部署","yt-dlp","ffmpeg","whisper","github","linux","shell","node","ci","cd","devops"] },
  { cat: "设计多媒体", kw: ["figma","调色","lightroom","剪辑","字幕","srt","视频转文字","视频","音频","设计","ps","pr","ae","ui","ux","动效"] },
  { cat: "办公项目", kw: ["会议","纪要","甘特","项目","收集表","文档协作","excel","word","ppt","日程","okr","jira","teams"] },
  { cat: "沟通语言", kw: ["客户","谈判","外语","英语","演讲","沟通","销售","异议","presentation","report"] },
  { cat: "数据AI", kw: ["数据分析","sql","大模型","摘要","prompt","rag","ai","deepseek","qwen","摘要生成","nlp","ocr","asr"] },
];

// ---------- 模糊匹配主函数 ----------
function guessCat(text) {
  const t = text.toLowerCase();
  let bestCat = "其他", bestScore = 0;

  for (const rule of CAT_RULES_FUZZY) {
    let score = 0;
    // 精确关键词匹配（每个命中+2）
    for (const kw of rule.kw) {
      if (t.includes(kw.toLowerCase())) score += 2;
    }

    // 同义词扩展匹配（命中同义词库中的任意一个+1）
    for (const [baseWord, synList] of Object.entries(SYNONYMS)) {
      if (rule.kw.includes(baseWord) || rule.kw.some(k => k.includes(baseWord))) {
        for (const syn of synList) {
          if (t.includes(syn.toLowerCase())) { score += 1; break; }
        }
      }
    }

    // 拼写容错（对每个关键词计算Levenshtein距离，距离≤2且长度差≤2则+1）
    for (const kw of rule.kw) {
      const words = t.split(/[\s,，、;；]/); // 按空白/标点分词
      for (const word of words) {
        if (word.length < 2) continue;
        if (levenshtein(kw, word) <= 2 && Math.abs(kw.length - word.length) <= 2) {
          score += 1;
          break; // 一个词只计一次
        }
      }
    }

    if (score > bestScore) { bestScore = score; bestCat = rule.cat; }
  }

  return bestCat;
}

// ---------- 以下为原有功能（名称提取、摘要、标签、存储、渲染等）----------
function guessName(text){
  const m=text.match(/skill\s*[:：]\s*(.+)/i);
  if(m) return m[1].trim().split(/\n/)[0].slice(0,80);
  const lines=text.split(/\n/).map(x=>x.trim()).filter(Boolean);
  if(lines[0]) return lines[0].replace(/^#+\s*/,"").slice(0,80);
  return "未命名技能";
}
function guessSummary(text){
  const m=text.match(/(角色定位|功能|技术架构|一、[^\n]+|二、[^\n]+)[\s\S]{0,300}/i);
  let s=m?m[0]:text.slice(0,200);
  return s.replace(/\s+/g," ").trim();
}
function extractTags(text){
  const out=new Set();
  for(const r of CAT_RULES_FUZZY)for(const k of r.kw){
    if(text.toLowerCase().includes(k.toLowerCase()))out.add(k);
  }
  return [...out].slice(0,8);
}
function loadAll(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}}
function saveAll(a){localStorage.setItem(KEY,JSON.stringify(a))}

function parseFile(name,content){
  const results=[];
  if(name.endsWith(".json")){
    let data;try{data=JSON.parse(content)}catch(e){return results;}
    const arr=Array.isArray(data)?data:(data.skills||data.items||[data]);
    for(const it of arr){
      if(it&&typeof it==="object"){
        results.push(makeCard(it.name||guessName(it.raw||JSON.stringify(it)),
          it.category||guessCat(it.raw||JSON.stringify(it)),
          it.status||"已掌握",
          (it.tags||extractTags(it.raw||"")).join(","),
          it.summary||"",it.raw||JSON.stringify(it,null,2)));
      }
    }
    return results;
  }
  // txt/md：单文件一条
  results.push(makeCard(guessName(content),guessCat(content),"已掌握",
    extractTags(content).join(","),guessSummary(content),content));
  return results;
}
function makeCard(name,cat,status,tags,summary,raw){
  return {id:"s_"+(Date.now())+"_"+Math.random().toString(36).slice(2,7),
    name,cat,status,tags,summary,raw,file:"",created:new Date().toISOString().slice(0,10)};
}

/* 渲染 */
const listEl=document.getElementById("list");
const statsEl=document.getElementById("stats");
const filterCat=document.getElementById("filterCat");
function refreshFilters(){
  const all=loadAll();const cats=[...new Set(all.map(x=>x.cat))].sort();
  filterCat.innerHTML='<option value="">全部分类</option>'+cats.map(c=>`<option>${c}</option>`).join("");
}
function render(){
  const kw=document.getElementById("search").value.trim().toLowerCase();
  const fc=filterCat.value,fs=document.getElementById("filterStatus").value;
  let all=loadAll();
  all=all.filter(x=>{
    if(fc&&x.cat!==fc)return false;
    if(fs&&x.status!==fs)return false;
    if(kw){const hay=(x.name+x.cat+x.tags+x.summary+x.raw).toLowerCase();if(!hay.includes(kw))return false;}
    return true;
  });
  listEl.innerHTML=all.map(x=>`
    <div class="card">
      <h3>${esc(x.name)}</h3>
      <div><span class="pill">${esc(x.cat)}</span><span class="status">${esc(x.status)}</span></div>
      <div class="sum">${esc(x.summary||"").slice(0,120)}</div>
      <div class="tags">${(x.tags||"" ).split(",").filter(Boolean).map(t=>`<span class="pill">${esc(t)}</span>`).join("")}</div>
      <div class="meta">${x.created} · ${esc(x.file||"")}</div>
      <button data-edit="${x.id}">编辑</button>
      <button data-open="${x.id}">看原文</button>
    </div>`).join("")||"<p style='padding:20px'>暂无技能，上传文件或导入JSON。</p>";
  const total=loadAll().length;
  const byStatus={};loadAll().forEach(x=>byStatus[x.status]=(byStatus[x.status]||0)+1);
  statsEl.textContent=`共 ${total} 条 ｜ 已掌握 ${byStatus["已掌握"]||0} ｜ 学习中 ${byStatus["学习中"]||0} ｜ 待复习 ${byStatus["待复习"]||0}`;
}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

/* 上传 */
document.getElementById("files").addEventListener("change",async e=>{
  const files=[...e.target.files];const all=loadAll();
  for(const f of files){
    const text=await f.text();
    const cards=parseFile(f.name,text);
    cards.forEach(c=>c.file=f.name);
    all.push(...cards);
  }
  saveAll(all);refreshFilters();render();e.target.value="";
});

/* 搜索/筛选 */
document.getElementById("search").addEventListener("input",render);
filterCat.addEventListener("change",render);
document.getElementById("filterStatus").addEventListener("change",render);

/* 导出/导入 */
document.getElementById("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(loadAll(),null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="skiiil-backup.json";a.click();
});
document.getElementById("importFile").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;const text=await f.text();
  try{const data=JSON.parse(text);if(Array.isArray(data)){saveAll(data);}}catch(err){alert("JSON解析失败");}
  refreshFilters();render();e.target.value="";
});
document.getElementById("clearBtn").addEventListener("click",()=>{
  if(confirm("确定清空全部本地技能？建议先导出备份。")){localStorage.removeItem(KEY);refreshFilters();render();}
});

/* 编辑/原文 */
let curId=null;
listEl.addEventListener("click",e=>{
  const id=e.target.dataset.edit||e.target.dataset.open;if(!id)return;
  const all=loadAll();const x=all.find(y=>y.id===id);if(!x)return;
  curId=id;
  document.getElementById("e_name").value=x.name;
  document.getElementById("e_cat").value=x.cat;
  document.getElementById("e_status").value=x.status;
  document.getElementById("e_tags").value=x.tags;
  document.getElementById("e_summary").value=x.summary;
  document.getElementById("e_raw").value=e.target.dataset.open?x.raw:x.raw;
  document.getElementById("modal").classList.remove("hidden");
});
document.getElementById("e_close").addEventListener("click",()=>document.getElementById("modal").classList.add("hidden"));
document.getElementById("e_save").addEventListener("click",()=>{
  const all=loadAll();const x=all.find(y=>y.id===curId);if(!x)return;
  x.name=document.getElementById("e_name").value;
  x.cat=document.getElementById("e_cat").value;
  x.status=document.getElementById("e_status").value;
  x.tags=document.getElementById("e_tags").value;
  x.summary=document.getElementById("e_summary").value;
  x.raw=document.getElementById("e_raw").value;
  saveAll(all);document.getElementById("modal").classList.add("hidden");refreshFilters();render();
});
document.getElementById("e_del").addEventListener("click",()=>{
  if(!confirm("删除该技能？"))return;
  saveAll(loadAll().filter(y=>y.id!==curId));
  document.getElementById("modal").classList.add("hidden");refreshFilters();render();
});

refreshFilters();render();
