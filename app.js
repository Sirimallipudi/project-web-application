// --- same logic as before ---
// (I kept code clean & modular, only UI style is improved)

// Sample jobs (replace or upload JSON)
const sampleJobs = [
  {id:1,title:'Junior Web Developer',company:'TechWorks',skills:['javascript','html','css'],location:'Remote',desc:'Build web pages using HTML/CSS and JS.'},
  {id:2,title:'Data Analyst',company:'Insight Labs',skills:['sql','excel','python','statistics'],location:'Hyderabad',desc:'Analyze datasets and produce reports.'},
  {id:3,title:'Machine Learning Intern',company:'AI Labs',skills:['python','pandas','numpy','ml'],location:'Bangalore',desc:'Work on ML models like classification.'},
  {id:4,title:'Product Manager - Associate',company:'Prodify',skills:['communication','product','roadmap','stakeholder'],location:'Chennai',desc:'Assist in building product features.'},
  {id:5,title:'Backend Developer (Node)',company:'DevHouse',skills:['nodejs','express','mongodb','api'],location:'Remote',desc:'Build REST APIs and backend systems.'}
];

const normalize = t => (t||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ');
const tokenize = t => normalize(t).split(/\s+/).filter(Boolean);

const stopwords = new Set(['and','or','with','the','a','an','in','on','for','to','of','experience','knowledge','skills','working','using','familiar']);

function extractSkills(text){
  const tokens = tokenize(text);
  const freq = {};
  tokens.forEach(t=>{
    if(t.length>1 && !stopwords.has(t) && isNaN(Number(t))){
      freq[t] = (freq[t]||0)+1;
    }
  });
  const techKeywords = ['javascript','html','css','python','sql','java','c','c++','node','nodejs','react','angular','vue','mongodb','mysql','excel','pandas','numpy','ml','machine','learning','api','aws','azure','docker','kubernetes','git','linux','communication','product'];
  const candidates = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]);
  const chosen = new Set();
  techKeywords.forEach(k=>{ if(freq[k]) chosen.add(k) });
  for(let i=0;i<candidates.length && chosen.size<12;i++) chosen.add(candidates[i]);
  return Array.from(chosen).slice(0,12);
}

function scoreJob(job, resumeSkills, resumeText){
  const sSet = new Set(resumeSkills.map(x=>x.toLowerCase()));
  const jobSkills = job.skills.map(x=>x.toLowerCase());
  let matchCount = 0;
  jobSkills.forEach(js=>{ if(sSet.has(js) || resumeText.includes(js)) matchCount++; });
  const skillScore = jobSkills.length ? (matchCount / jobSkills.length) : 0;
  const titleDesc = normalize(job.title + ' ' + job.desc);
  let bonus = 0;
  resumeSkills.forEach(sk=>{ if(titleDesc.includes(sk.toLowerCase())) bonus += 0.05 });
  return Math.min(100, Math.round((skillScore + bonus) * 100));
}

// DOM refs
const resumeText = document.getElementById('resumeText');
const extractBtn = document.getElementById('extract');
const clearBtn = document.getElementById('clear');
const skillCloud = document.getElementById('skillCloud');
const skillCount = document.getElementById('skillCount');
const jobList = document.getElementById('jobList');
const minMatch = document.getElementById('minMatch');
const refresh = document.getElementById('refresh');
const search = document.getElementById('search');
const downloadCSV = document.getElementById('downloadCSV');
const fileInput = document.getElementById('fileInput');
const jobsUpload = document.getElementById('jobsUpload');

let jobs = sampleJobs.slice();
let skills = [];

function renderSkills(sk){
  skillCloud.innerHTML = '';
  sk.forEach(s=>{
    const el = document.createElement('div');
    el.className = 'chip';
    el.textContent = s;
    skillCloud.appendChild(el);
  });
  skillCount.textContent = sk.length;
}

function renderJobs(){
  const txt = normalize(resumeText.value);
  const min = Number(minMatch.value);
  const q = (search.value || '').trim().toLowerCase();
  const scored = jobs.map(j => ({...j, score: scoreJob(j, skills, txt)}));
  const filtered = scored.filter(j => j.score >= min && (j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || q === ''));
  filtered.sort((a,b) => b.score - a.score);
  jobList.innerHTML = '';
  if(filtered.length === 0){
    jobList.innerHTML = '<div class="small">No jobs found — adjust filters or update resume.</div>';
    return;
  }
  filtered.forEach(j=>{
    const el = document.createElement('div'); el.className = 'job';
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<h3>${j.title} — ${j.company}</h3><div class="small">${j.location} • ${j.desc}</div>`;
    const skillsWrap = document.createElement('div'); skillsWrap.className = 'skills';
    j.skills.forEach(sk => {
      const c = document.createElement('div'); c.className = 'chip'; c.textContent = sk; skillsWrap.appendChild(c);
    });
    meta.appendChild(skillsWrap);
    const score = document.createElement('div'); score.className = 'result-score'; score.textContent = `${j.score}% match`;
    el.appendChild(meta); el.appendChild(score);
    jobList.appendChild(el);
  });
}

// Events
extractBtn.addEventListener('click', ()=>{
  if(!resumeText.value.trim()){ alert('Paste resume text or upload a .txt file first.'); return; }
  skills = extractSkills(resumeText.value);
  renderSkills(skills); renderJobs();
});
clearBtn.addEventListener('click', ()=>{ resumeText.value=''; skills=[]; renderSkills(skills); renderJobs(); });
minMatch.addEventListener('input', renderJobs);
search.addEventListener('input', renderJobs);
refresh.addEventListener('click', renderJobs);

fileInput.addEventListener('change', async e=>{
  const f = e.target.files[0]; if(!f) return;
  if(!f.name.endsWith('.txt')){ alert('Only plain .txt resumes supported in demo.'); return; }
  const txt = await f.text(); resumeText.value = txt;
  skills = extractSkills(txt); renderSkills(skills); renderJobs();
});

jobsUpload.addEventListener('change', async e=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const parsed = JSON.parse(await f.text());
    if(Array.isArray(parsed)){ jobs = parsed; renderJobs(); }
    else alert('JSON must be an array of job objects');
  }catch{ alert('Invalid JSON file'); }
});

downloadCSV.addEventListener('click', ()=>{
  const rows = [['id','title','company','location','score','skills','desc']];
  const txt = normalize(resumeText.value);
  const min = Number(minMatch.value);
  jobs.map(j=>({...j,score:scoreJob(j,skills,txt)}))
      .filter(j=>j.score>=min)
      .forEach(j=>{
        rows.push([j.id,j.title,j.company,j.location,j.score,j.skills.join('|'),j.desc]);
      });
  const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='recommended_jobs.csv'; a.click();
});

// Demo pre-fill
setTimeout(()=>{
  if(!resumeText.value) resumeText.value = "Skills: JavaScript, HTML, CSS, Git, Node.js\nExperience in building responsive websites.";
  skills = extractSkills(resumeText.value); renderSkills(skills); renderJobs();
},300);
