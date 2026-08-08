/* ============================================================
   STATE — no static/dummy records. Everything starts empty and
   is populated only through the Add Company / Add Drive forms,
   matching the schema in Section 4 exactly.
   ============================================================ */
let companies = [];          // {id, name, industry, location, created_at}
let placementDrives = [];    // {id, company_id, academic_year_id, eligibility_criteria, drive_status, drive_date, created_at}
let academicYears = [];      // {id, year_label}

let nextCompanyId = 1, nextDriveId = 1, nextYearId = 1;

const STATUS_OPTIONS = ["upcoming","ongoing","completed","cancelled"];

let state = { view:"companies", companyId:null, driveId:null,
  filters:{ industry:"All", year:"All", status:"All", q:"" },
  modal:null, editDriveId:null };

async function api(url, options={}){
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if(!response.ok) throw new Error("The database request could not be completed.");
  return response.status === 204 ? null : response.json();
}

async function loadData(){
  try {
    const data = await api("/api/data");
    companies = data.companies;
    placementDrives = data.placementDrives;
    academicYears = data.academicYears;
    nextCompanyId = Math.max(0, ...companies.map(c=>c.id)) + 1;
    nextDriveId = Math.max(0, ...placementDrives.map(d=>d.id)) + 1;
    nextYearId = Math.max(0, ...academicYears.map(y=>y.id)) + 1;
    render();
  } catch(error) {
    render();
    toast("Could not load the database. Check that the local server is running.");
  }
}

/* ---------- helpers ---------- */
const companyById = id => companies.find(c => c.id === id);
const yearById = id => academicYears.find(y => y.id === id);
const drivesForCompany = cid => placementDrives.filter(d => d.company_id === cid);
const industries = () => [...new Set(companies.map(c => c.industry))];

function repeatRecruiters(){
  return companies
    .map(c => ({ c, count: drivesForCompany(c.id).length,
      yrs: [...new Set(drivesForCompany(c.id).map(d => yearById(d.academic_year_id)?.year_label).filter(Boolean))] }))
    .filter(x => x.count > 1)
    .sort((a,b) => b.count - a.count);
}
function toast(msg){
  const root = document.getElementById("toastRoot");
  root.innerHTML = `<div class="toast">${msg}</div>`;
  setTimeout(()=>{ root.innerHTML = ""; }, 2600);
}
function nav(view, extra={}){
  state = { ...state, view, companyId:null, driveId:null, modal:null, ...extra };
  render();
  window.scrollTo({top:0, behavior:"smooth"});
}
document.getElementById("railNav").addEventListener("click", e=>{
  const btn = e.target.closest(".rail-btn"); if(!btn) return;
  nav(btn.dataset.view);
});

/* ============================================================
   RENDER
   ============================================================ */
function render(){
  document.querySelectorAll(".rail-btn").forEach(b=>{
    b.classList.toggle("active", b.dataset.view === state.view ||
      (state.view==="companyProfile" && b.dataset.view==="companies") ||
      (state.view==="driveDetail" && b.dataset.view==="drives"));
  });

  const content = document.getElementById("content");
  const crumbs = document.getElementById("crumbs");
  const title = document.getElementById("pageTitle");
  const desc = document.getElementById("pageDesc");
  const actions = document.getElementById("topbarActions");
  actions.innerHTML = "";

  if(state.view === "companies"){
    crumbs.innerHTML = `<span class="cur">Companies</span>`;
    title.textContent = "Companies";
    desc.textContent = "Master directory of recruiting employers — each company is stored once and reused across every drive.";
    actions.innerHTML = `<button class="btn btn-primary" id="btnAddCompany">+ Add Company</button>`;
    content.innerHTML = renderCompanies();
    bindCompanyCards();
    document.getElementById("btnAddCompany").addEventListener("click", ()=> openCompanyModal());
  }
  else if(state.view === "companyProfile"){
    const c = companyById(state.companyId);
    if(!c){ nav("companies"); return; }
    crumbs.innerHTML = `<span class="seg" onclick="nav('companies')">Companies</span><span class="sep">/</span><span class="cur">${esc(c.name)}</span>`;
    title.textContent = "Company Profile";
    desc.textContent = "Full recruiting history for this employer — one master record, many drives.";
    actions.innerHTML = `<button class="btn btn-primary" id="btnAddDriveHere">+ New Drive for this company</button>`;
    content.innerHTML = renderCompanyProfile(c);
    bindDriveRows();
    document.getElementById("btnAddDriveHere").addEventListener("click", ()=> openDriveModal(null, c.id));
  }
  else if(state.view === "drives"){
    crumbs.innerHTML = `<span class="cur">Placement Drives</span>`;
    title.textContent = "Placement Drives";
    desc.textContent = "Every recruiting drive conducted on campus, each one referencing a single existing company record.";
    actions.innerHTML = `<button class="btn btn-primary" id="btnAddDrive" ${companies.length===0?"disabled title='Add a company first'":""}>+ New Drive</button>`;
    content.innerHTML = renderDrives();
    bindFilterBar();
    bindDriveRows();
    const b = document.getElementById("btnAddDrive");
    if(b && companies.length) b.addEventListener("click", ()=> openDriveModal());
  }
  else if(state.view === "driveDetail"){
    const d = placementDrives.find(x=>x.id===state.driveId);
    if(!d){ nav("drives"); return; }
    const c = companyById(d.company_id);
    crumbs.innerHTML = `<span class="seg" onclick="nav('drives')">Placement Drives</span><span class="sep">/</span><span class="seg" onclick="nav('companyProfile',{companyId:c.id})">${esc(c.name)}</span><span class="sep">/</span><span class="cur">Drive #${d.id}</span>`;
    title.textContent = "Participation Record";
    desc.textContent = "Drive detail — eligibility, status and the linked company profile.";
    actions.innerHTML = `<button class="btn btn-ghost" id="btnEditDrive">Edit status</button>`;
    content.innerHTML = renderDriveDetail(d, c);
    document.getElementById("btnEditDrive").addEventListener("click", ()=> openDriveModal(d.id));
  }
  else if(state.view === "reports"){
    crumbs.innerHTML = `<span class="cur">Reports</span>`;
    title.textContent = "Reports";
    desc.textContent = "Live summaries computed from current records — nothing here is hardcoded.";
    content.innerHTML = renderReports();
  }
}

function esc(s){ return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

/* ---------- Companies view ---------- */
function renderCompanies(){
  if(companies.length === 0){
    return `<div class="empty"><div class="big">◆</div>No companies on file yet.<br><span style="font-size:12.5px;">Add the first employer to start building the master directory.</span>
      <div><button class="btn btn-primary" onclick="document.getElementById('btnAddCompany').click()">+ Add Company</button></div></div>`;
  }
  const repeats = repeatRecruiters();
  return `
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-card"><div class="num">${companies.length}</div><div class="lbl">Companies on file</div></div>
    <div class="stat-card"><div class="num">${placementDrives.length}</div><div class="lbl">Total drives</div></div>
    <div class="stat-card"><div class="num">${industries().length}</div><div class="lbl">Industries represented</div></div>
    <div class="stat-card"><div class="num">${repeats.length}</div><div class="lbl">Repeat recruiters</div></div>
  </div>
  <div class="grid grid-3" id="companyGrid">
    ${companies.map(c=>{
      const cd = drivesForCompany(c.id);
      const isRepeat = cd.length > 1;
      return `
      <div class="company-card" data-cid="${c.id}">
        ${isRepeat ? `<div class="repeat-tag">Repeat recruiter</div>`:""}
        <div class="cname">${esc(c.name)}</div>
        <div class="cloc">📍 ${esc(c.location || "—")}</div>
        <div style="margin-top:12px;"><span class="badge badge-industry">${esc(c.industry)}</span></div>
        <div class="meta-row">
          <div class="meta-item"><b>${cd.length}</b>Drive${cd.length!==1?"s":""}</div>
          <div class="meta-item"><b>${[...new Set(cd.map(d=>d.academic_year_id))].length}</b>Year(s) active</div>
          <div class="meta-item"><b>${cd.filter(d=>d.drive_status==="completed").length}</b>Completed</div>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}
function bindCompanyCards(){
  document.querySelectorAll(".company-card").forEach(el=>{
    el.addEventListener("click", ()=> nav("companyProfile", {companyId: Number(el.dataset.cid)}));
  });
}

/* ---------- Company profile ---------- */
function renderCompanyProfile(c){
  const cd = drivesForCompany(c.id).sort((a,b)=> (yearById(a.academic_year_id)?.year_label||"").localeCompare(yearById(b.academic_year_id)?.year_label||""));
  return `
  <span class="back-link" onclick="nav('companies')">← All companies</span>
  <div class="profile-head">
    <div>
      <h2>${esc(c.name)}</h2>
      <div class="ploc">📍 ${esc(c.location || "Location not set")}</div>
      <div class="pbadges">
        <span class="pbadge">${esc(c.industry)}</span>
        <span class="pbadge">ID: C-${c.id}</span>
        ${cd.length>1 ? `<span class="pbadge">Repeat recruiter</span>`:""}
      </div>
    </div>
    <div class="profile-stats">
      <div class="pstat"><div class="n">${cd.length}</div><div class="l">Drives</div></div>
      <div class="pstat"><div class="n">${[...new Set(cd.map(d=>d.academic_year_id))].length}</div><div class="l">Years</div></div>
      <div class="pstat"><div class="n">${cd.filter(d=>d.drive_status==="completed").length}</div><div class="l">Completed</div></div>
    </div>
  </div>

  <div class="section-title"><div class="titlewrap">Placement drives for this company <span class="count">${cd.length}</span></div></div>
  ${cd.length === 0 ? `<div class="empty"><div class="big">▤</div>No drives recorded for ${esc(c.name)} yet.<div><button class="btn btn-primary" onclick="document.getElementById('btnAddDriveHere').click()">+ New Drive for this company</button></div></div>` : `
  <div class="table-wrap">
    <table>
      <thead><tr><th>Drive ID</th><th>Academic Year</th><th>Eligibility Criteria</th><th>Drive Date</th><th>Status</th></tr></thead>
      <tbody>
        ${cd.map(d=>`
        <tr class="clickable" data-did="${d.id}">
          <td class="mono">D-${d.id}</td>
          <td>${esc(yearById(d.academic_year_id)?.year_label || "—")}</td>
          <td style="max-width:340px;">${esc(d.eligibility_criteria || "—")}</td>
          <td>${d.drive_date || "—"}</td>
          <td><span class="status-pill st-${d.drive_status}">${d.drive_status}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`}
  <div class="note-box">This company record was entered once. Each drive above is a separate <b>PlacementDrive</b> row referencing <b>company_id = ${c.id}</b> — adding another drive never re-asks for name, industry or location.</div>
  `;
}

/* ---------- Drives view ---------- */
function renderDrives(){
  if(placementDrives.length === 0){
    const msg = companies.length === 0
      ? "Add a company first, then create a drive against it."
      : "No placement drives recorded yet.";
    return `<div class="empty"><div class="big">▤</div>${msg}
      ${companies.length ? `<div><button class="btn btn-primary" onclick="document.getElementById('btnAddDrive').click()">+ New Drive</button></div>` : `<div><button class="btn btn-primary" onclick="nav('companies')">Go to Companies</button></div>`}
    </div>`;
  }
  const f = state.filters;
  let list = placementDrives.filter(d=>{
    const c = companyById(d.company_id);
    if(!c) return false;
    if(f.industry!=="All" && c.industry!==f.industry) return false;
    if(f.year!=="All" && String(d.academic_year_id)!==f.year) return false;
    if(f.status!=="All" && d.drive_status!==f.status) return false;
    if(f.q && !c.name.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  }).sort((a,b)=> b.id - a.id);

  return `
  <div class="filter-bar">
    <input type="text" id="qSearch" placeholder="Search company…" value="${esc(f.q)}" style="width:200px;">
    <select id="fIndustry">
      <option${f.industry==="All"?" selected":""}>All</option>
      ${industries().map(i=>`<option${f.industry===i?" selected":""}>${esc(i)}</option>`).join("")}
    </select>
    <select id="fYear">
      <option value="All"${f.year==="All"?" selected":""}>All years</option>
      ${academicYears.map(y=>`<option value="${y.id}"${f.year===String(y.id)?" selected":""}>${esc(y.year_label)}</option>`).join("")}
    </select>
    <div class="tab-group" id="statusTabs">
      ${["All",...STATUS_OPTIONS].map(s=>
        `<button class="tab-btn${f.status===s?" active":""}" data-status="${s}">${s}</button>`).join("")}
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr><th>Drive ID</th><th>Company</th><th>Industry</th><th>Academic Year</th><th>Eligibility Criteria</th><th>Status</th></tr></thead>
      <tbody>
        ${list.length ? list.map(d=>{
          const c = companyById(d.company_id);
          return `
          <tr class="clickable" data-did="${d.id}">
            <td class="mono">D-${d.id}</td>
            <td><span class="company-link" data-cid="${c.id}">${esc(c.name)}</span></td>
            <td><span class="badge badge-industry">${esc(c.industry)}</span></td>
            <td>${esc(yearById(d.academic_year_id)?.year_label || "—")}</td>
            <td style="max-width:300px;">${esc(d.eligibility_criteria || "—")}</td>
            <td><span class="status-pill st-${d.drive_status}">${d.drive_status}</span></td>
          </tr>`;
        }).join("") : `<tr><td colspan="6"><div class="empty"><div class="big">∅</div>No drives match these filters.</div></td></tr>`}
      </tbody>
    </table>
  </div>`;
}

function bindFilterBar(){
  const q = document.getElementById("qSearch");
  if(!q) return;
  q.addEventListener("input", e=>{ state.filters.q = e.target.value; render();
    const el = document.getElementById("qSearch"); if(el){ el.focus(); el.selectionStart = el.selectionEnd = el.value.length; } });
  document.getElementById("fIndustry").addEventListener("change", e=>{ state.filters.industry = e.target.value; render(); });
  document.getElementById("fYear").addEventListener("change", e=>{ state.filters.year = e.target.value; render(); });
  document.getElementById("statusTabs").addEventListener("click", e=>{
    const b = e.target.closest(".tab-btn"); if(!b) return;
    state.filters.status = b.dataset.status; render();
  });
}

function bindDriveRows(){
  document.querySelectorAll("tr[data-did]").forEach(tr=>{
    tr.addEventListener("click", (e)=>{
      if(e.target.closest(".company-link")) return;
      nav("driveDetail", {driveId: Number(tr.dataset.did)});
    });
  });
  document.querySelectorAll(".company-link").forEach(el=>{
    el.addEventListener("click", (e)=>{ e.stopPropagation(); nav("companyProfile", {companyId: Number(el.dataset.cid)}); });
  });
}

/* ---------- Drive detail ---------- */
function renderDriveDetail(d, c){
  const others = drivesForCompany(c.id).filter(x=>x.id!==d.id);
  return `
  <span class="back-link" onclick="nav('drives')">← All drives</span>
  <div class="detail-grid">
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:11px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.6px;">Drive D-${d.id}</div>
          <div class="display" style="font-size:21px; font-weight:600; margin-top:2px;">${esc(c.name)}</div>
        </div>
        <span class="status-pill st-${d.drive_status}">${d.drive_status}</span>
      </div>

      <div class="kv-row"><div class="k">Company</div><div class="v"><span class="company-link" onclick="nav('companyProfile',{companyId:${c.id}})">${esc(c.name)} →</span></div></div>
      <div class="kv-row"><div class="k">Industry / Sector</div><div class="v">${esc(c.industry)}</div></div>
      <div class="kv-row"><div class="k">Company Location</div><div class="v">${esc(c.location || "—")}</div></div>
      <div class="kv-row"><div class="k">Academic Year</div><div class="v">${esc(yearById(d.academic_year_id)?.year_label || "—")}</div></div>
      <div class="kv-row"><div class="k">Drive Date</div><div class="v">${d.drive_date || "—"}</div></div>
      <div class="kv-row"><div class="k">Drive Status</div><div class="v">${d.drive_status}</div></div>

      <div class="section-title" style="margin-top:22px;"><div class="titlewrap">Eligibility criteria</div></div>
      <div class="eligibility-box">${esc(d.eligibility_criteria || "Not specified")}</div>

      <div class="note-box">Participation is scoped to this single drive record. The company's identity, industry and location aren't duplicated here — they're pulled live via <b>company_id = ${c.id}</b>.</div>
    </div>

    <div class="panel">
      <div class="display" style="font-weight:600; font-size:15px; margin-bottom:12px;">Other drives — ${esc(c.name)}</div>
      ${others.length ? others.map(o=>`
        <div style="padding:12px 0; border-bottom:1px solid var(--line); cursor:pointer;" onclick="nav('driveDetail',{driveId:${o.id}})">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:13px; font-weight:700;">${esc(yearById(o.academic_year_id)?.year_label || "—")}</span>
            <span class="status-pill st-${o.drive_status}">${o.drive_status}</span>
          </div>
          <div style="font-size:11.5px; color:var(--ink-soft); margin-top:4px;">D-${o.id}</div>
        </div>`).join("") : `<div style="font-size:12.5px; color:var(--ink-soft);">No other drives yet — first visit on record.</div>`}
      <div style="margin-top:16px;"><span class="badge badge-industry">${esc(c.industry)}</span></div>
    </div>
  </div>`;
}

/* ---------- Reports ---------- */
function renderReports(){
  if(placementDrives.length === 0 || companies.length === 0){
    return `<div class="empty"><div class="big">◈</div>Reports need at least one company and one drive.<br><span style="font-size:12.5px;">Add records from the Companies and Placement Drives tabs to populate live reports.</span></div>`;
  }
  const usedYears = academicYears.filter(y => placementDrives.some(d=>d.academic_year_id===y.id));
  const byYearDrives = {}, byYearCompanies = {};
  usedYears.forEach(y=>{
    byYearDrives[y.id] = placementDrives.filter(d=>d.academic_year_id===y.id).length;
    byYearCompanies[y.id] = new Set(placementDrives.filter(d=>d.academic_year_id===y.id).map(d=>d.company_id)).size;
  });
  const maxDrives = Math.max(1, ...Object.values(byYearDrives));
  const maxComp = Math.max(1, ...Object.values(byYearCompanies));

  const indParticipation = industries().map(i=>({
    industry:i, count: placementDrives.filter(d=> companyById(d.company_id)?.industry===i).length
  })).sort((a,b)=>b.count-a.count);
  const maxInd = Math.max(1, ...indParticipation.map(i=>i.count));

  const repeats = repeatRecruiters();

  return `
  <div class="callout"><b>Live query, not a snapshot</b>Repeat-recruiter detection counts distinct <b>PlacementDrive</b> rows per <b>Company</b> (equivalent to <span class="mono" style="color:var(--mulberry-deep);">GROUP BY company_id HAVING COUNT(*) &gt; 1</span>). Any company with more than one drive appears here automatically.</div>

  <div class="grid grid-3">
    <div class="report-block">
      <h4>Companies by year</h4>
      ${usedYears.map(y=>`
        <div class="bar-row"><div class="bar-label">${esc(y.year_label)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(byYearCompanies[y.id]/maxComp*100)}%"><span>${byYearCompanies[y.id]}</span></div></div>
        </div>`).join("")}
    </div>
    <div class="report-block">
      <h4>Drives by year</h4>
      ${usedYears.map(y=>`
        <div class="bar-row"><div class="bar-label">${esc(y.year_label)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(byYearDrives[y.id]/maxDrives*100)}%"><span>${byYearDrives[y.id]}</span></div></div>
        </div>`).join("")}
    </div>
    <div class="report-block">
      <h4>Repeat recruiters</h4>
      <div class="num display" style="font-size:32px; color:var(--mulberry-deep); font-weight:700;">${repeats.length}</div>
      <div style="font-size:12px; color:var(--ink-soft);">of ${companies.length} companies have visited more than once</div>
    </div>
  </div>

  <div class="report-block">
    <h4>Industry-wise participation (drives)</h4>
    ${indParticipation.map(i=>`
      <div class="bar-row"><div class="bar-label">${esc(i.industry)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(i.count/maxInd*100)}%"><span>${i.count}</span></div></div>
      </div>`).join("")}
  </div>

  <div class="report-block">
    <h4>Repeat recruiters — detail</h4>
    ${repeats.length === 0 ? `<div style="font-size:12.5px; color:var(--ink-soft);">No repeat recruiters yet — every company on file has visited exactly once.</div>` : `
    <div class="repeat-list">
      ${repeats.map(r=>`
        <div class="repeat-row" onclick="nav('companyProfile',{companyId:${r.c.id}})">
          <div>
            <div class="rname">${esc(r.c.name)}</div>
            <div class="rmeta">${esc(r.c.industry)} · ${esc(r.c.location||"—")} · Visited in ${r.yrs.map(esc).join(", ")}</div>
          </div>
          <div class="repeat-count">${r.count} drives</div>
        </div>`).join("")}
    </div>`}
  </div>
  `;
}

/* ============================================================
   MODALS — Add Company / Add-Edit Drive
   ============================================================ */
function openCompanyModal(){
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
  <div class="modal-backdrop" id="backdrop">
    <div class="modal">
      <div class="modal-head"><h3 class="display">Add Company</h3><button class="modal-close" id="mClose">✕</button></div>
      <div class="field" id="fName"><label>Company name *</label><input type="text" id="iName" placeholder="e.g. Tata Consultancy Services"></div>
      <div class="field" id="fIndustry"><label>Industry / sector *</label><input type="text" id="iIndustry" placeholder="e.g. IT Services"></div>
      <div class="field"><label>Company location</label><input type="text" id="iLocation" placeholder="e.g. Bengaluru, KA"></div>
      <div class="hint">Company records are created once here and referenced by every future drive — never re-entered.</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Cancel</button>
        <button class="btn btn-primary" id="mSave">Save Company</button>
      </div>
    </div>
  </div>`;
  const close = ()=> root.innerHTML = "";
  document.getElementById("mClose").onclick = close;
  document.getElementById("mCancel").onclick = close;
  document.getElementById("backdrop").addEventListener("click", e=>{ if(e.target.id==="backdrop") close(); });
  document.getElementById("mSave").onclick = async ()=>{
    const name = document.getElementById("iName").value.trim();
    const industry = document.getElementById("iIndustry").value.trim();
    const location = document.getElementById("iLocation").value.trim();
    let ok = true;
    document.getElementById("fName").classList.remove("has-err");
    document.getElementById("fIndustry").classList.remove("has-err");
    document.querySelectorAll(".field-err").forEach(e=>e.remove());

    if(!name){ markErr("fName","Company name is required."); ok=false; }
    else if(companies.some(c=>c.name.toLowerCase()===name.toLowerCase())){ markErr("fName","A company with this name already exists — use it from the Companies list instead of duplicating it."); ok=false; }
    if(!industry){ markErr("fIndustry","Industry is required."); ok=false; }
    if(!ok) return;

    try {
      const c = await api("/api/companies", { method:"POST", body:{ name, industry, location } });
      companies.push(c);
      close();
      toast(`Company "${name}" added.`);
      nav("companyProfile", {companyId: c.id});
    } catch(error) { markErr("fName", "Could not save the company. Please try again."); }
  };
}
function markErr(fieldId, msg){
  const f = document.getElementById(fieldId);
  f.classList.add("has-err");
  const e = document.createElement("div");
  e.className = "field-err"; e.textContent = msg;
  f.appendChild(e);
}

function openDriveModal(driveId=null, presetCompanyId=null){
  const editing = driveId ? placementDrives.find(d=>d.id===driveId) : null;
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
  <div class="modal-backdrop" id="backdrop">
    <div class="modal">
      <div class="modal-head"><h3 class="display">${editing ? "Edit Drive" : "New Placement Drive"}</h3><button class="modal-close" id="mClose">✕</button></div>

      <div class="field" id="fCompany">
        <label>Company *</label>
        <select id="iCompany" ${editing?"disabled":""}>
          <option value="">Select an existing company…</option>
          ${companies.map(c=>`<option value="${c.id}" ${((editing?editing.company_id:presetCompanyId)===c.id)?"selected":""}>${esc(c.name)} — ${esc(c.industry)}</option>`).join("")}
        </select>
        <div class="hint">${companies.length ? "This is a select from the existing Company master list — no free-text company name field." : "No companies yet — add one from the Companies tab first."}</div>
      </div>

      <div class="form-row-2">
        <div class="field" id="fYear">
          <label>Academic year *</label>
          <select id="iYear">
            <option value="">Select year…</option>
            ${academicYears.map(y=>`<option value="${y.id}" ${editing && editing.academic_year_id===y.id ? "selected":""}>${esc(y.year_label)}</option>`).join("")}
            <option value="__new__">+ Add new academic year…</option>
          </select>
        </div>
        <div class="field">
          <label>Drive date</label>
          <input type="date" id="iDate" value="${editing?.drive_date || ""}">
        </div>
      </div>

      <div class="field">
        <label>Eligibility criteria</label>
        <textarea id="iElig" rows="3" placeholder="e.g. CGPA ≥ 6.5, no active backlogs, CSE/ISE only">${editing ? esc(editing.eligibility_criteria||"") : ""}</textarea>
      </div>

      <div class="field">
        <label>Drive status *</label>
        <select id="iStatus">
          ${STATUS_OPTIONS.map(s=>`<option value="${s}" ${(editing?editing.drive_status:"upcoming")===s?"selected":""}>${s}</option>`).join("")}
        </select>
      </div>

      <div class="modal-actions">
        ${editing ? `<button class="btn btn-danger" id="mDelete" style="margin-right:auto;">Delete drive</button>` : ""}
        <button class="btn btn-ghost" id="mCancel">Cancel</button>
        <button class="btn btn-primary" id="mSave">${editing?"Save changes":"Save Drive"}</button>
      </div>
    </div>
  </div>`;
  const close = ()=> root.innerHTML = "";
  document.getElementById("mClose").onclick = close;
  document.getElementById("mCancel").onclick = close;
  document.getElementById("backdrop").addEventListener("click", e=>{ if(e.target.id==="backdrop") close(); });

  document.getElementById("iYear").addEventListener("change", async e=>{
    if(e.target.value === "__new__"){
      const label = prompt("New academic year label (e.g. 2026-2027):");
      if(label && label.trim()){
        try {
          const y = await api("/api/academic-years", { method:"POST", body:{ year_label: label.trim() } });
          academicYears.push(y);
          openDriveModal(driveId, presetCompanyId ?? (editing?editing.company_id:null));
          setTimeout(()=>{ const sel = document.getElementById("iYear"); if(sel) sel.value = y.id; }, 0);
        } catch(error) { alert("Could not save the academic year. Please try again."); }
      } else {
        e.target.value = editing ? editing.academic_year_id : "";
      }
    }
  });

  if(editing){
    document.getElementById("mDelete").onclick = async ()=>{
      if(confirm("Delete this drive record? This cannot be undone.")){
        try {
          await api(`/api/drives/${editing.id}`, { method:"DELETE" });
          placementDrives = placementDrives.filter(d=>d.id!==editing.id);
          close(); toast("Drive deleted.");
          nav("drives");
        } catch(error) { alert("Could not delete the drive. Please try again."); }
      }
    };
  }

  document.getElementById("mSave").onclick = async ()=>{
    document.querySelectorAll(".field-err").forEach(e=>e.remove());
    document.querySelectorAll(".field").forEach(f=>f.classList.remove("has-err"));
    let ok = true;
    const companyIdVal = editing ? editing.company_id : Number(document.getElementById("iCompany").value || 0);
    const yearVal = Number(document.getElementById("iYear").value || 0);
    const elig = document.getElementById("iElig").value.trim();
    const dateVal = document.getElementById("iDate").value;
    const statusVal = document.getElementById("iStatus").value;

    if(!companyIdVal){ markErr("fCompany","Select an existing company — required."); ok=false; }
    if(!yearVal){ markErr("fYear","Academic year is required."); ok=false; }
    if(!STATUS_OPTIONS.includes(statusVal)){ ok=false; }
    if(!ok) return;

    const payload = { company_id: companyIdVal, academic_year_id: yearVal, eligibility_criteria: elig, drive_date: dateVal, drive_status: statusVal };
    try {
      if(editing){
        const updated = await api(`/api/drives/${editing.id}`, { method:"PATCH", body:payload });
        placementDrives = placementDrives.map(d=>d.id===updated.id ? updated : d);
        close(); toast("Drive updated.");
        nav("driveDetail", {driveId: updated.id});
      } else {
        const d = await api("/api/drives", { method:"POST", body:payload });
        placementDrives.push(d);
        close(); toast("Placement drive added.");
        nav("driveDetail", {driveId: d.id});
      }
    } catch(error) { markErr(editing ? "fYear" : "fCompany", "Could not save the drive. Please try again."); }
  };
}

/* init */
loadData();
