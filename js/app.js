// When hosting separately, you MUST use an absolute URL pointing to your backend.
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://api-mt.thejaeu.com/api';

const escapeHTML = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[match] || match));
};

// ===== DYNAMIC SURVEY CONFIGURATION =====
const SURVEY_CONFIG = [
  {
    id: "stdId",
    label: "학번",
    type: "text",
    placeholder: "예: 202612345 (9자리)",
    pattern: "\\d{4}\\d{5}",
    maxlength: 9,
    required: true,
    showFor: ['student', 'leave', 'army']
  },
  { 
    id: "participationCount", 
    label: "빅이큐 MT 참여 횟수", 
    type: "select", 
    options: ["0번 (처음이에요!)", "1번", "2번", "3번", "4번"],
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "schedule",
    label: "참가 일정",
    type: "schedule",
    options: ["전일정 참여", "중간 합류"],
    placeholder: "언제 합류 예정인지 알려주세요 (예: 8/23 오후)",
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "transport",
    label: "이동 수단",
    type: "transport",
    options: ["🚗 자차", "🚌 대중교통 / 뚜벅이"],
    carpoolLabel: "🚗 자차 이용 시 — 다른 인원을 태워주실 수 있나요?",
    carpoolOptions: ["태워줄 수 있어요 😊", "나 혼자만 이동해요"],
    carpoolPlaceholder: "본인 포함 가능 인원 *",
    publicNote: "<strong>🚌 대중교통 / 뚜벅이</strong> — 버스, 지하철, 도보 등 모두 포함이에요.",
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "departureArea",
    label: "출발 지역",
    type: "text",
    placeholder: "예: 서울 강남, 경기 이천 등",
    required: true,
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "allergies",
    label: "음식 알레르기 및 특이사항",
    type: "text",
    placeholder: "없으면 비워두세요",
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "license",
    label: "운전 면허 소지 여부",
    type: "license",
    licenseOptions: ["1종 보통", "2종 보통(자동)", "기타"],
    canDriveOptions: ["불가능 (장롱)", "가능"],
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "militaryPriority",
    label: "군인 우대 신청 여부",
    type: "select",
    options: ["군인 우선 예약 신청", "일반 신청 (우선예약 미사용)"],
    values: ["yes", "no"],
    required: true,
    showFor: ['army']
  },
  {
    id: "militaryStatus",
    label: "현재 상태",
    type: "select",
    options: ["휴가 확정", "휴가 신청 중", "휴가 신청 예정", "기타"],
    required: true,
    showFor: ['army']
  },
  {
    id: "expectation",
    label: "기대평 한 줄 (메인화면에 표시돼요 🌟)",
    type: "text",
    placeholder: "기억에 남는 MT나 기대 한 마디",
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  },
  {
    id: "remarks",
    label: "기타 (하고 싶은 말)",
    type: "textarea",
    placeholder: "운영진에게 하고 싶은 말, 요청사항 등 자유롭게!",
    showFor: ['student', 'grad', 'leave', 'army', 'etc']
  }
];

// ===== GLOBAL STATE =====
window.siteSettings = null;
window.currentParticipant = null;
window.editingParticipantId = null;
window.editingPassword = null;
window.currentCounts = null;
window.cachedMembers = null;
window.currentChecklist = [];
window.currentCommonStatus = {};
window.curType = 'student';
window.pendingAction = null; 

// ===== DASHBOARD & UI =====
async function updateDashboard() {
  const errorEl = document.getElementById('globalError');
  try {
    const settingsRes = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
    if (!settingsRes.ok) throw new Error('Settings fetch failed');
    const settings = await settingsRes.json();
    window.siteSettings = settings;
    renderSettings(settings);
    renderDynamicSurveys(window.curType);

    const res = await fetch(`${API_BASE}/Management/status`, { credentials: 'include' });
    if (!res.ok) throw new Error('Status fetch failed');
    const data = await res.json();
    if (errorEl) errorEl.style.display = 'none';

    const { counts, expectations } = data;
    const s = window.siteSettings || {};
    const MAX_GEN = s.maxGeneralCapacity || 16;
    const MAX_ARMY = s.maxMilitaryCapacity || 4;
    const MAX_TOTAL = MAX_GEN + MAX_ARMY;

    const confirmedGen = (counts.student || 0) + (counts.alumni || 0) + (counts.leave || 0) + (counts.other || 0);
    const confirmedArmy = counts.military || 0;
    const confirmedTotal = confirmedGen + confirmedArmy;

    const sVal = window.siteSettings || {};
    const MAX_G = sVal.maxGeneralCapacity ?? 16;
    const MAX_A = sVal.maxMilitaryCapacity ?? 4;
    const MAX_T = MAX_G + MAX_A;

    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) {
        totalCountEl.textContent = `${counts.total || 0}명`;
        if (counts.waitlisted > 0) totalCountEl.innerHTML += ` <span style="font-size:12px; color:#E5484D; font-weight:600;">(대기 ${counts.waitlisted}명)</span>`;
    }
    
    const totalCapEl = document.getElementById('totalCapacityLabel');
    if (totalCapEl) totalCapEl.textContent = ` / ${MAX_T}명 정원`;

    const remainCountEl = document.getElementById('remainCount');
    if (remainCountEl) {
        if (counts.waitlistedGeneral > 0 || counts.waitlistedMilitary > 0) remainCountEl.textContent = `0명 (대기 발생)`;
        else remainCountEl.textContent = `${Math.max(0, MAX_T - confirmedTotal)}명`;
    }

    const genLabelEl = document.getElementById('genLabel');
    if (genLabelEl) genLabelEl.textContent = `${confirmedGen}명 / ${MAX_G}명`;
    const armyLabelEl = document.getElementById('armyLabel');
    if (armyLabelEl) armyLabelEl.textContent = `${confirmedArmy}명 / ${MAX_A}명`;
    const armyMainLabelEl = document.getElementById('armyMainLabel');
    if (armyMainLabelEl) armyMainLabelEl.textContent = `${confirmedArmy}명 / ${MAX_A}명`;
    
    setBarW('barGen', Math.min(100, Math.round((confirmedGen / (MAX_G || 1)) * 100)));
    setBarW('barArmy', Math.min(100, Math.round((confirmedArmy / (MAX_A || 1)) * 100)));
    setBarW('barArmyMain', Math.min(100, Math.round((confirmedArmy / (MAX_A || 1)) * 100)));

    renderStatusModal(data, sVal);
    renderExpectations(expectations);
    
    // Update Army Modal Labels
    const armyModalLabel = document.getElementById('armyModalLabel');
    if (armyModalLabel) armyModalLabel.textContent = `${confirmedArmy} / ${MAX_A}명`;
    setBarW('barArmyModal', Math.min(100, Math.round((confirmedArmy / (MAX_A || 1)) * 100)));

    window.currentCounts = counts;
  } catch (err) {
    console.error('Error updating dashboard:', err);
    if (errorEl) errorEl.style.display = 'flex';
    else showToast('데이터를 불러오는 중 오류가 발생했습니다.');
  }
}

function renderStatusModal(data, s) {
    const thermoContainer = document.getElementById('thermoRows');
    if (!thermoContainer) return;

    const MAX_G_VAL = s.maxGeneralCapacity ?? 16;
    const MAX_A_VAL = s.maxMilitaryCapacity ?? 4;
    const MAX_T_VAL = MAX_G_VAL + MAX_A_VAL;
    const confirmedTotal = (data.counts.student || 0) + (data.counts.alumni || 0) + (data.counts.leave || 0) + (data.counts.other || 0) + (data.counts.military || 0);

    const totalPct = MAX_T_VAL > 0 ? Math.min(100, Math.round((confirmedTotal / MAX_T_VAL) * 100)) : 0;
    
    const modalTotalLabel = document.getElementById('modalTotalLabel');
    if (modalTotalLabel) modalTotalLabel.textContent = `총 정원 ${MAX_T_VAL}명 (군인 우선 ${MAX_A_VAL}명 포함)`;

    let thermoHtml = `
      <div class="cohort-thermo-row" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
        <div class="cohort-thermo-label" style="min-width: 45px; font-weight: 800; color: var(--blue-deep);">전체</div>
        <div class="thermo-track" style="height: 28px;">
          <div class="thermo-fill" id="thermo-total" style="width:0%; background: var(--blue);">
            <span class="thermo-count" style="font-size: 13px; font-weight:700;">${confirmedTotal} / ${MAX_T_VAL}명</span>
          </div>
        </div>
        <div class="cohort-thermo-num" style="min-width: 45px; font-weight: 800; color: var(--blue-deep);">${totalPct}%</div>
      </div>
    `;

    // Find minimum count among cohorts to show "Cheer up!" label
    const countsOnly = [];
    for (let i = 1; i <= 7; i++) countsOnly.push(data.cohortCounts[i] || 0);
    const minCount = Math.min(...countsOnly);

    for (let i = 1; i <= 7; i++) {
      const count = data.cohortCounts[i] || 0;
      const cPct = Math.min(100, Math.round((count / 4) * 100)); // Still base 4 for individual cohorts? Or dynamic?
      const color = thermoColor(cPct);
      const isLowest = count === minCount;
      
      thermoHtml += `
        <div class="cohort-thermo-row" style="margin-bottom: 8px;">
          <div class="cohort-thermo-label" style="min-width: 45px;">${i}기</div>
          <div class="thermo-track">
            <div class="thermo-fill" id="thermo-${i}" style="width:0%; background:${color}">${count > 0 ? `<span class="thermo-count">${count}명</span>` : ''}</div>
          </div>
          <div class="cohort-thermo-num" style="min-width: 45px; display:flex; align-items:center; gap:8px;">
            ${count}명
            ${isLowest ? '<span style="font-size:10px; color:#E5484D; font-weight:800; white-space:nowrap; background:#FFF0F0; padding:2px 6px; border-radius:4px; border:1px solid rgba(229,72,77,0.2);">분발하세요!</span>' : ''}
          </div>
        </div>
      `;
    }

    const armyPct = MAX_A_VAL > 0 ? Math.min(100, Math.round((data.counts.military / MAX_A_VAL) * 100)) : 0;
    thermoHtml += `
      <div class="cohort-thermo-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
        <div class="cohort-thermo-label" style="min-width: 45px; color: var(--army);">군인</div>
        <div class="thermo-track">
          <div class="thermo-fill" id="thermo-army" style="width:0%; background: var(--army);">
            <span class="thermo-count">${data.counts.military || 0} / ${MAX_A_VAL}명</span>
          </div>
        </div>
        <div class="cohort-thermo-num" style="min-width: 45px; color: var(--army);">${armyPct}%</div>
      </div>
    `;
    thermoContainer.innerHTML = thermoHtml;

    setTimeout(() => {
      const elTotal = document.getElementById('thermo-total'); if (elTotal) elTotal.style.width = `${totalPct}%`;
      for (let i = 1; i <= 7; i++) {
        const cPct = Math.min(Math.round(((data.cohortCounts[i] || 0) / 4) * 100), 100);
        const el = document.getElementById(`thermo-${i}`); if (el) el.style.width = `${cPct}%`;
      }
      const elArmy = document.getElementById('thermo-army'); if (elArmy) elArmy.style.width = `${armyPct}%`;
    }, 100);
}

function thermoColor(pct) {
  if (pct <= 0) return '#EEF4FB';
  if (pct < 25) return '#94bfe2';
  if (pct < 50) return '#76aed9';
  if (pct < 75) return '#F5A623';
  return '#E5484D';
}

function goToCohort(gen) {
    closeModal('status');
    openCohortModal();
    const filter = document.getElementById('cohortGenFilter');
    if (filter) {
        filter.value = gen;
        applyCohortFilter();
    }
}

function renderExpectations(expectations) {
    const marqueeTrack = document.getElementById('marqueeTrack');
    const expectationSection = document.getElementById('expectationSection');
    if (!marqueeTrack) return;

    const validExpectations = (expectations || []).filter(e => e.text && e.text.trim() !== '');

    if (validExpectations.length === 0) {
      if (expectationSection) expectationSection.style.display = 'none';
      marqueeTrack.innerHTML = '';
      return;
    }
    if (expectationSection) expectationSection.style.display = 'block';
    const repeatCount = validExpectations.length < 5 ? 10 : 2; 
    const allExp = []; for (let i = 0; i < repeatCount; i++) allExp.push(...validExpectations);
    marqueeTrack.innerHTML = allExp.map(e => `<div class="exp-chip">${escapeHTML(e.text)}<div class="exp-author">— ${escapeHTML(e.author || '익명')}</div></div>`).join('');
    marqueeTrack.style.animation = 'none'; marqueeTrack.offsetHeight; 
    
    // Maintain constant speed: Duration proportional to ACTUAL track length
    const speedFactor = 10.0; // Seconds for one chip to pass
    const moveCount = allExp.length / 2; // Moving half the track (50%)
    const totalDuration = moveCount * speedFactor;
    
    marqueeTrack.style.animation = `marquee ${totalDuration}s linear infinite`;
    marqueeTrack.style.setProperty('--marquee-end', `-50%`);
}

async function updateCohortTable() {
  if (window.cachedMembers) return renderMembers(window.cachedMembers);
  try {
    const res = await fetch(`${API_BASE}/Management/members`, { credentials: 'include' });
    if (res.ok) { window.cachedMembers = await res.json(); renderMembers(window.cachedMembers); }
    else if (res.status === 401) {
        await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
    }
  } catch (err) { console.error(err); }
}

function renderMembers(members) {
  const tableBody = document.querySelector('#cohortTable tbody');
  if (!tableBody) return;
  if (members.length === 0) { tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 20px; color: var(--text3);">등록된 동문 데이터가 없습니다.</td></tr>'; return; }
  members.sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));
  tableBody.innerHTML = members.map(p => `<tr data-cohort-val="${p.generation}"><td>${p.generation}기</td><td class="name-cell"><b>${p.name}</b></tr>`).join('');
}

async function updateFeeTable() {
  try {
    const [resList, resSummary] = await Promise.all([fetch(`${API_BASE}/Fee`, { credentials: 'include' }), fetch(`${API_BASE}/Fee/summary`, { credentials: 'include' })]);
    if (resList.ok) {
      const fees = await resList.json();
      const tbody = document.querySelector('#feeTable tbody');
      if (tbody) {
        if (fees.length === 0) tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 20px; color: var(--text3);">등록된 지출 내역이 없습니다.</td></tr>';
        else {
          const catMap = { 'Food': '음식/장보기', 'Rent': '숙소/대관', 'Transport': '교통/유류비', 'General': '기타 지출' };
          tbody.innerHTML = fees.map(f => `<tr><td><div style="font-weight:600;">${f.description}</div><div style="font-size:10px; color:var(--text3);">${catMap[f.category] || f.category}</div></td><td style="text-align:right; font-weight:700; color:#E5484D">${Math.abs(f.amount).toLocaleString()}원</td></tr>`).join('');
        }
      }
    }
    if (resSummary.ok) {
      const summary = await resSummary.json();
      const el = document.getElementById('fee-expense'); if (el) el.textContent = `${summary.totalExpense.toLocaleString()}원`;
    }
  } catch (err) { console.error(err); }
}

function setBarW(id, pct) { const el = document.getElementById(id); if (el) { el.style.transition = 'width .9s cubic-bezier(0.4,0,0.2,1)'; el.style.width = Math.min(100, pct) + '%'; } }

// ===== TOGGLES =====
function toggleTransport(btn) {
  const row = btn.closest('.toggle-row'); row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  const isCar = btn.textContent.includes('자차'); const section = btn.closest('.form-section');
  const noteC = section.querySelector('.transport-note-car'); const noteP = section.querySelector('.transport-note-pub');
  if (noteC) noteC.style.display = isCar ? 'block' : 'none'; if (noteP) noteP.style.display = isCar ? 'none' : 'block';
}
function toggleLicense(btn, fId) {
  const row = btn.closest('.toggle-row'); row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  const hasLicense = btn.textContent.includes('소지') && !btn.textContent.includes('미소지');
  const sub = document.getElementById(`license-detail-${fId}`); if (sub) sub.style.display = hasLicense ? 'block' : 'none';
}
function toggleSchedule(btn, subId) {
  const row = btn.closest('.toggle-row'); row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  const isJoin = btn.textContent.includes('합류'); const sub = document.getElementById(subId); if (sub) sub.style.display = isJoin ? 'block' : 'none';
}

// ===== DYNAMIC SURVEY RENDERING =====
function renderDynamicSurveys(curType) {
    const container = document.getElementById('survey-content-unified');
    if (!container) return;

    container.innerHTML = SURVEY_CONFIG.filter(q => q.showFor.includes(curType)).map(q => {
        if (q.type === 'select') {
            return `
                <div class="form-group">
                    <label>${q.label} ${q.required ? '*' : ''}</label>
                    <select id="survey-unified-${q.id}" data-survey-id="${q.id}">
                        <option value="">선택</option>
                        ${q.options.map((opt, i) => `<option value="${q.values ? q.values[i] : opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (q.type === 'textarea') {
            return `<div class="form-group"><label>${q.label} ${q.required ? '*' : ''}</label><textarea id="survey-unified-${q.id}" data-survey-id="${q.id}" placeholder="${q.placeholder || ''}"></textarea></div>`;
        } else if (q.type === 'schedule') {
            return `<div class="form-group"><label>${q.label}</label><div class="toggle-row"><button class="toggle-btn active" onclick="toggleSchedule(this,'unified-join')">${q.options[0]}</button><button class="toggle-btn" onclick="toggleSchedule(this,'unified-join')">${q.options[1]}</button></div><div class="sub-input" id="unified-join" style="display:none"><input type="text" id="survey-unified-midJoinDetails" data-survey-id="midJoinDetails" placeholder="${q.placeholder || ''}"></div></div>`;
        } else if (q.type === 'transport') {
            return `<div class="form-group"><label>${q.label}</label><div class="toggle-row"><button class="toggle-btn active" onclick="toggleTransport(this)">${q.options[0]}</button><button class="toggle-btn" onclick="toggleTransport(this)">${q.options[1]}</button></div><div class="transport-note transport-note-car"><strong>${q.carpoolLabel || ''}</strong><div class="carpool-row" style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px;"><select id="survey-unified-carpoolAvailable" data-survey-id="carpoolAvailable" class="carpool-available" onchange="const el=document.getElementById('survey-unified-carpoolSeats'); if(el) el.style.display=(this.value==='yes'?'block':'none')"><option value="">동승 가능 여부 *</option><option value="yes">${q.carpoolOptions[0]}</option><option value="no">${q.carpoolOptions[1]}</option></select><input type="number" id="survey-unified-carpoolSeats" data-survey-id="carpoolSeats" class="carpool-num" style="display:none" placeholder="${q.carpoolPlaceholder || ''}" min="1" max="10"></div></div><div class="transport-note transport-note-pub" style="display:none">${q.publicNote || ''}</div></div>`;
        } else if (q.type === 'license') {
            return `<div class="form-group"><label>${q.label} *</label><div class="toggle-row"><button class="toggle-btn" onclick="toggleLicense(this, 'unified')">소지</button><button class="toggle-btn active" onclick="toggleLicense(this, 'unified')">미소지</button></div><div id="license-detail-unified" class="sub-input" style="display:none"><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;"><div><label style="font-size:11px;">면허 종류</label><select id="survey-unified-licenseType" data-survey-id="licenseType" class="license-type"><option value="">선택</option>${q.licenseOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select></div><div><label style="font-size:11px;">실제 운전 가능 여부</label><select id="survey-unified-canDrive" data-survey-id="canDrive" class="can-drive">${q.canDriveOptions.map((opt, i) => `<option value="${i === 1 ? 'yes' : 'no'}">${opt}</option>`).join('')}</select></div></div><input type="text" id="survey-unified-drivingExperience" data-survey-id="drivingExperience" class="driving-exp" placeholder="운전 경력 (예: 2년, 매일 운전 등)" style="margin-top:8px;"></div></div>`;
        } else {
            return `<div class="form-group"><label>${q.label} ${q.required ? '*' : ''}</label><input type="${q.type || 'text'}" id="survey-unified-${q.id}" data-survey-id="${q.id}" placeholder="${q.placeholder || ''}" ${q.pattern ? `pattern="${q.pattern}"` : ''} ${q.maxlength ? `maxlength="${q.maxlength}"` : ''}></div>`;
        }
    }).join('');
}

function getSurveyData(formId) {
    const data = {};
    const container = document.getElementById(`survey-content-${formId}`);
    if (!container) return data;
    container.querySelectorAll('[data-survey-id]').forEach(el => { data[el.getAttribute('data-survey-id')] = el.value; });
    const formSection = document.getElementById(`form-${formId}`);
    const scheduleBtn = formSection.querySelector('button[onclick*="toggleSchedule"].active');
    data.participationSchedule = scheduleBtn ? (scheduleBtn.textContent.includes('전일정') ? 'Full' : 'Partial') : 'Full';
    const transportBtn = formSection.querySelector('button[onclick*="toggleTransport"].active');
    data.transportation = transportBtn ? (transportBtn.textContent.includes('자차') ? 'Car' : 'Walk') : 'Car';
    const licenseBtn = formSection.querySelector('button[onclick*="toggleLicense"].active');
    data.hasDriverLicense = licenseBtn ? licenseBtn.textContent.includes('소지') && !licenseBtn.textContent.includes('미소지') : false;
    return data;
}

function setSurveyData(formId, p) {
    if (!p) return;
    const mapping = { stdId: p.studentId, participationCount: p.participationCount, memory: p.memoryOrExpectation, departureArea: p.departureArea, allergies: p.allergies, expectation: p.oneLineExpectation, militaryPriority: p.isMilitaryPriority ? 'yes' : 'no', militaryStatus: p.militaryStatus, midJoinDetails: p.midJoinDetails, carpoolAvailable: p.isCarpoolAvailable ? 'yes' : 'no', carpoolSeats: p.carpoolSeats, licenseType: p.driverLicenseType, canDrive: p.canDrive ? 'yes' : 'no', drivingExperience: p.drivingExperience, remarks: p.remarks };
    for (const [id, val] of Object.entries(mapping)) {
        const el = document.getElementById(`survey-${formId}-${id}`);
        if (el) { 
            el.value = val || ""; 
            if (id === 'carpoolAvailable') { 
                const numInp = document.getElementById(`survey-${formId}-carpoolSeats`); 
                if (numInp) numInp.style.display = (val === 'yes') ? 'block' : 'none'; 
            } 
        }
    }
    const formSection = document.getElementById(`form-${formId}`);
    const isFull = p.participationSchedule !== 'Partial';
    formSection.querySelectorAll('button[onclick*="toggleSchedule"]').forEach(btn => btn.classList.toggle('active', btn.textContent.includes('전일정') === isFull));
    const joinDetail = document.getElementById(`${formId}-join`); if (joinDetail) joinDetail.style.display = isFull ? 'none' : 'block';
    const isCar = p.transportation === 'Car';
    formSection.querySelectorAll('button[onclick*="toggleTransport"]').forEach(btn => btn.classList.toggle('active', btn.textContent.includes('자차') === isCar));
    const carNote = formSection.querySelector('.transport-note-car'); const pubNote = formSection.querySelector('.transport-note-pub');
    if (carNote) carNote.style.display = isCar ? 'block' : 'none'; if (pubNote) pubNote.style.display = isCar ? 'none' : 'block';
    const hasLicense = !!p.hasDriverLicense;
    formSection.querySelectorAll('button[onclick*="toggleLicense"]').forEach(btn => { const isYes = btn.textContent.includes('소지') && !btn.textContent.includes('미소지'); btn.classList.toggle('active', isYes === hasLicense); });
    const licenseDetail = document.getElementById(`license-detail-${formId}`); if (licenseDetail) licenseDetail.style.display = hasLicense ? 'block' : 'none';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }
}

// ===== AUTH & MY PAGE =====
async function doLogin() {
  const name = document.getElementById('login-name').value; 
  const gen = document.getElementById('login-gen').value; 
  const password = document.getElementById('login-password').value;
  if (!name || !gen || !password) return showToast('정보를 모두 입력해주세요.');
  
  try {
    const res = await fetch(`${API_BASE}/Participants/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, generation: parseInt(gen), password }), 
        credentials: 'include' 
    });

    if (res.ok) { 
        const data = await res.json(); 
        localStorage.setItem('participantName', data.name); 
        window.editingPassword = password; 
        showToast(`${data.name}님, 환영합니다!`); 
        closeModal('login'); 
        updateAuthUI(); 
        
        // Populate currentParticipant immediately after login
        const meRes = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
        if (meRes.ok) {
            window.currentParticipant = await meRes.json();
        }

        if (window.pendingAction) {
            const action = window.pendingAction;
            window.pendingAction = null;
            action();
        } else {
            openMyPage(); 
        }
    }
    else showToast(`❌ 로그인 실패: ${await res.text()}`);
  } catch (err) { 
    showToast('서버 연결 오류가 발생했습니다.'); 
  }
}

function updateAuthUI() {
  const name = localStorage.getItem('participantName');
  const loginBtn = document.getElementById('btnLoginOpen'); const mypageBtn = document.getElementById('btnMyPageOpen'); const applyBtn = document.getElementById('btnApply'); const editInfoBtn = document.getElementById('btnEditInfo');
  if (name) { if (loginBtn) loginBtn.style.display = 'none'; if (mypageBtn) mypageBtn.style.display = 'block'; if (applyBtn) applyBtn.style.display = 'none'; if (editInfoBtn) editInfoBtn.style.display = 'inline-flex'; }
  else { window.editingPassword = null; if (loginBtn) loginBtn.style.display = 'block'; if (mypageBtn) mypageBtn.style.display = 'none'; if (applyBtn) applyBtn.style.display = 'inline-flex'; if (editInfoBtn) editInfoBtn.style.display = 'none'; }
  const btn = document.getElementById('btnChangePwUnified'); const label = document.getElementById('pwLabelUnified_New'); const inp = document.getElementById('pwUnified');
  if (name) { if (btn) btn.style.display = 'block'; if (label) label.style.display = 'none'; if (inp) inp.style.display = 'none'; }
  else { if (btn) btn.style.display = 'none'; if (label) label.style.display = 'block'; if (inp) inp.style.display = 'block'; }
}

async function openMyPage() {
  try {
    const res = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
    if (res.ok) {
      const p = await res.json(); window.currentParticipant = p;
      const el = document.getElementById('mypage-name-gen'); if (el) el.textContent = `${p.generation}기 ${p.name}님 안녕하세요!`;
      const depEl = document.getElementById('mypage-deposit-status'); const depCard = depEl?.closest('.card');
      const btnE = document.getElementById('btnMyPageEdit'); const btnC = document.getElementById('btnMyPageCancel');
      const btnManitto = document.querySelector('#modal-mypage .btn-submit[onclick*="openManittoModal"]');
      const titles = document.querySelectorAll('#modal-mypage .section-title'); 
      const cC = document.getElementById('checklist-container'); 
      const ccC = document.getElementById('common-checklist-container');
      const cI = document.querySelector('#modal-mypage .form-group[style*="display:flex"]');

      if (!p.isRegistered) {
          const el = document.getElementById('mypage-name-gen'); if (el) el.textContent = `${p.generation}기 ${p.name}님 (신청 취소됨)`;
          if (depEl) {
              depEl.innerHTML = '❌ 취소 완료';
              depEl.style.color = '#E5484D';
              if (depCard) { depCard.style.borderLeftColor = '#E5484D'; const l = depCard.querySelector('div'); if (l) l.textContent = '현재 상태'; }
          }
          titles.forEach(t => t.style.display = 'none'); 
          if (cC) cC.style.display = 'none'; 
          if (ccC) ccC.style.display = 'none'; 
          if (cI) cI.style.display = 'none'; 
          if (btnManitto) btnManitto.style.display = 'none';
          if (btnE) btnE.style.display = 'none'; 
          if (btnC) btnC.style.display = 'none'; 
          const btnMbti = document.querySelector('#modal-mypage button[onclick*="viewMBTIFromMyPage"]');
          if (btnMbti) btnMbti.style.display = 'none';
          openModal('mypage');
          return;
      }

      if (depEl) {
        if (p.isWaitlisted) { 
          depEl.innerHTML = '⏳ 신청 대기 중'; 
          depEl.style.color = '#E5484D'; 
          if (depCard) { depCard.style.borderLeftColor = '#E5484D'; const l = depCard.querySelector('div'); if (l) l.textContent = '현재 상태'; } 
          
          titles.forEach(t => t.style.display = 'none'); 
          if (cC) cC.style.display = 'none'; 
          if (ccC) ccC.style.display = 'none'; 
          if (cI) cI.style.display = 'none'; 
          if (btnManitto) btnManitto.style.display = 'none';
          
          if (btnE) btnE.style.display = 'none'; 
          if (btnC) btnC.style.display = 'block'; 
        }
        else { 
          titles.forEach(t => t.style.display = 'block'); 
          if (cC) cC.style.display = 'flex'; 
          if (ccC) ccC.style.display = 'flex'; 
          if (cI) cI.style.display = 'flex'; 
          if (btnManitto) btnManitto.style.display = 'block';
          
          if (btnE) btnE.style.display = 'block'; 
          
          // Hide Cancel button for confirmed participants after deadline
          if (btnC) btnC.style.display = (window.isDeadlinePassed) ? 'none' : 'none'; 
          // Confirmed users usually cancel through Edit form, so keep it 'none' here
          // but let's make it consistent: only show btnC for waitlist in MyPage.
          if (btnC) btnC.style.display = 'none'; 
          
          if (p.isDepositConfirmed) { depEl.textContent = '✅ 입금 확인 완료'; depEl.style.color = '#22C55E'; if (depCard) depCard.style.borderLeftColor = '#22C55E'; } 
          else { depEl.textContent = '⏳ 입금 대기 중'; depEl.style.color = '#F5A623'; if (depCard) depCard.style.borderLeftColor = '#F5A623'; } 
          const l = depCard?.querySelector('div'); if (l && l.textContent === '현재 상태') l.textContent = '입금 확인 상태'; 
        }

        // 취소 요청 상태에 따른 일괄 UI 업데이트 (대기/확정 상관없음)
        if (p.isCancelRequested) {
          // Hide all the extra features
          titles.forEach(t => t.style.display = 'none'); 
          if (cC) cC.style.display = 'none'; 
          if (ccC) ccC.style.display = 'none'; 
          if (cI) cI.style.display = 'none'; 
          if (btnManitto) btnManitto.style.display = 'none';
          const btnMbti = document.querySelector('#modal-mypage button[onclick*="viewMBTIFromMyPage"]');
          if (btnMbti) btnMbti.style.display = 'none';

          if (depEl) {
              depEl.textContent = '⏳ 취소 승인 대기 중'; 
              depEl.style.color = '#F5A623'; 
              if (depCard) { 
                  depCard.style.borderLeftColor = '#F5A623'; 
                  const l = depCard.querySelector('div'); 
                  if (l) l.textContent = '현재 상태'; 
              }
          }

          if (btnE) btnE.style.display = 'none'; // 취소 진행 중에는 정보 수정 불가
          if (btnC) {
            btnC.style.display = 'block';
            btnC.textContent = '🔄 재참여 신청';
            btnC.style.background = '#22C55E';
            btnC.style.color = 'white';
            btnC.disabled = false;
            btnC.onclick = undoCancelRegistration;
          }
        } else {
          if (btnC) {
            btnC.textContent = '🚫 신청 취소';
            btnC.style.background = 'var(--bg3)';
            btnC.style.color = '#E5484D';
            btnC.disabled = false;
            btnC.onclick = cancelRegistration;
          }
        }
      }
      renderCommonChecklist(window.siteSettings.commonChecklistJson, p.commonChecklistStatusJson); renderChecklist(p.checklistJson); openModal('mypage');
    } else { 
        await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout(); 
    }
  } catch (err) { console.error(err); }
}

function renderCommonChecklist(commonJson, statusJson) {
  const container = document.getElementById('common-checklist-container'); if (!container) return;
  let items = []; try { if (commonJson) items = JSON.parse(commonJson); } catch(e) {}
  let status = {}; try { if (statusJson) status = JSON.parse(statusJson); } catch(e) {}
  if (items.length === 0) { container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text3); font-size:13px;">등록된 공동 체크리스트가 없습니다.</div>'; return; }
  container.innerHTML = items.map((t, i) => { 
    const done = !!status[i]; 
    return `<div class="card" onclick="toggleCommonCheck(${i})" style="padding:16px; display:flex; align-items:center; gap:12px; cursor:pointer; background:var(--blue-soft); border-color:var(--blue-mid); margin-bottom:0;"><div style="width:24px; height:24px; border:2px solid ${done ? 'var(--blue)' : 'var(--blue-mid)'}; border-radius:6px; display:flex; align-items:center; justify-content:center; background:${done ? 'var(--blue)' : 'transparent'}; color:white; font-size:14px; flex-shrink:0;">${done ? '✓' : ''}</div><span style="flex:1; font-size:15px; font-weight:600; text-decoration:${done ? 'line-through' : 'none'}; color:${done ? 'var(--text3)' : 'var(--text)'}">[공동] ${t}</span></div>`; 
  }).join('');
  window.currentCommonStatus = status;
}

async function toggleCommonCheck(index) {
  const s = window.currentCommonStatus || {}; s[index] = !s[index]; renderCommonChecklist(window.siteSettings.commonChecklistJson, JSON.stringify(s));
  try { await fetch(`${API_BASE}/Participants/me/common-checklist-status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(JSON.stringify(s)), credentials: 'include' }); } catch(e) {}
}

function renderChecklist(json) {
  const container = document.getElementById('checklist-container'); if (!container) return;
  let list = []; try { if (json) list = JSON.parse(json); } catch(e) {}
  if (list.length === 0) { container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text3); font-size:13px;">체크리스트가 비어있습니다.</div>'; window.currentChecklist = []; return; }
  container.innerHTML = list.map((item, i) => `<div class="card" style="padding:16px; display:flex; align-items:center; gap:12px; cursor:pointer; margin-bottom:0;"><div onclick="toggleCheck(${i})" style="width:24px; height:24px; border:2px solid ${item.done ? 'var(--blue)' : 'var(--border)'}; border-radius:6px; display:flex; align-items:center; justify-content:center; background:${item.done ? 'var(--blue)' : 'transparent'}; color:white; font-size:14px; flex-shrink:0;">${item.done ? '✓' : ''}</div><span onclick="toggleCheck(${i})" style="flex:1; font-size:15px; font-weight:600; text-decoration:${item.done ? 'line-through' : 'none'}; color:${item.done ? 'var(--text3)' : 'var(--text)'}">${item.text}</span><button onclick="removeChecklistItem(${i})" style="background:var(--bg3); border:none; color:#E5484D; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; flex-shrink:0;">✕</button></div>`).join('');
  window.currentChecklist = list;
}

async function saveChecklist(list) { try { await fetch(`${API_BASE}/Participants/me/checklist`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(JSON.stringify(list)), credentials: 'include' }); } catch(e) {} }
async function addChecklistItem() { const input = document.getElementById('checklist-input'); const text = input.value.trim(); if (!text) return; const list = window.currentChecklist || []; list.push({ text, done: false }); input.value = ''; renderChecklist(JSON.stringify(list)); await saveChecklist(list); }
async function removeChecklistItem(index) { const list = window.currentChecklist; if (!list) return; list.splice(index, 1); renderChecklist(JSON.stringify(list)); await saveChecklist(list); }
async function toggleCheck(index) { const list = window.currentChecklist; if (!list) return; list[index].done = !list[index].done; renderChecklist(JSON.stringify(list)); await saveChecklist(list); }

async function openEditFromMyPage() {
    let p = window.currentParticipant;
    let password = window.editingPassword;

    // If data is missing (e.g. after refresh), try fetching it
    if (!p) {
        try {
            const res = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
            if (res.ok) {
                p = await res.json();
                window.currentParticipant = p;
            }
        } catch (e) { console.error('Fetch me error:', e); }
    }

    if (!p) {
        showToast('세션 정보가 부족합니다. 다시 로그인해주세요.');
        logout();
        return;
    }

    window.editingParticipantId = p.id;
    // Note: window.editingPassword might still be null if we haven't prompted for it yet this session
    // but the backend will check the cookie. However, our submitApplication prompts for it if editing.

    closeModal('mypage');

    const editHeader = document.getElementById('editHeader');
    const editHeaderInfo = document.getElementById('editHeaderInfo');
    const typeSelectionArea = document.getElementById('typeSelectionArea');
    const btnActualCancel = document.getElementById('btnActualCancel');
    const btnUndoCancel = document.getElementById('btnUndoCancel');
    const cancelPendingNotice = document.getElementById('cancelPendingNotice');

    if (editHeader && editHeaderInfo && typeSelectionArea) {
      const typeLabels = ['재학생', '졸업생', '휴학생', '군인', '기타'];
      const typeLabel = typeLabels[p.type] || '회원';
      editHeaderInfo.textContent = `[${typeLabel}] ${p.name} (${p.generation}기)`;
      editHeader.style.display = 'flex';
      typeSelectionArea.style.display = 'none';
      
      const isDead = window.isDeadlinePassed && !p.isWaitlisted;

      if (p.isCancelRequested) {
          if (btnActualCancel) btnActualCancel.style.display = 'none';
          if (btnUndoCancel) btnUndoCancel.style.display = 'block';
          if (cancelPendingNotice) cancelPendingNotice.style.display = 'block';
          
          const btnSubmitUnified = document.getElementById('btnSubmitUnified');
          if (btnSubmitUnified) btnSubmitUnified.style.display = 'none';
      } else {
          if (btnActualCancel) btnActualCancel.style.display = isDead ? 'none' : 'block';
          if (btnUndoCancel) btnUndoCancel.style.display = 'none';
          if (cancelPendingNotice) cancelPendingNotice.style.display = 'none';

          const btnSubmitUnified = document.getElementById('btnSubmitUnified');
          if (btnSubmitUnified) btnSubmitUnified.style.display = 'block';
      }
    }

    document.getElementById('nameUnified').value = p.name;
    document.getElementById('genUnified').value = p.generation;
    document.getElementById('telUnified').value = p.phoneNumber;

    const typeStr = (p.type === 3) ? 'army' : 
                    (p.type === 0 ? 'student' :
                    (p.type === 1 ? 'grad' :
                    (p.type === 2 ? 'leave' : 'etc')));

    window.curType = typeStr; // Ensure curType is updated
    renderDynamicSurveys(typeStr);
    setSurveyData('unified', p);
    updateAuthUI();
    openModal('apply');
}

function logout() {
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(e => {});
  localStorage.removeItem('participantName'); 
  window.editingPassword = null; 
  window.currentParticipant = null; 
  window.editingParticipantId = null; 
  
  showToast('로그아웃 되었습니다.');
  setTimeout(() => location.reload(), 1000);
}

function resetApplyForm() {
  const modal = document.getElementById('modal-apply'); if (!modal) return;
  modal.querySelectorAll('input').forEach(i => { if (i.type === 'checkbox' || i.type === 'radio') i.checked = false; else i.value = ''; });
  modal.querySelectorAll('textarea').forEach(t => t.value = ''); modal.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  modal.querySelectorAll('.toggle-btn').forEach(btn => { const isDefault = btn.textContent.includes('전일정') || btn.textContent.includes('자차') || btn.textContent.includes('미소지'); btn.classList.toggle('active', isDefault); });
  const sj = document.getElementById('unified-join'); if (sj) sj.style.display = 'none';
  modal.querySelectorAll('.transport-note-car').forEach(n => n.style.display = 'block'); modal.querySelectorAll('.transport-note-pub').forEach(n => n.style.display = 'none');
  const btns = document.querySelectorAll('.type-btns .type-btn'); if (btns.length > 0) switchType(btns[0], 'student');
  const ld = document.getElementById('license-detail-unified'); if (ld) ld.style.display = 'none';
  const btn = document.getElementById('btnChangePwUnified'); const label = document.getElementById('pwLabelUnified_New'); const inp = document.getElementById('pwUnified');
  if (btn) btn.style.display = 'none'; if (label) label.style.display = 'block'; if (inp) inp.style.display = 'block';
}

async function undoCancelRegistration() {
  const targetId = window.editingParticipantId || (window.currentParticipant ? window.currentParticipant.id : null);
  if (!targetId) return;
  const p = window.currentParticipant;
  
  const password = await prompt('취소 요청을 철회하고 재참여하려면 비밀번호를 입력해주세요.');
  if (!password) return;

  if (!await confirm('취소 요청을 철회하시겠습니까?')) return;
  try {
    const res = await fetch(`${API_BASE}/Participants/${targetId}/undo-cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), credentials: 'include' });
    if (res.ok) { 
        showToast('✅ 취소 요청이 철회되었습니다. 다시 정상 신청 상태로 변경되었습니다.'); 
        setTimeout(() => location.reload(), 1000);
    }
    else {
        const txt = await res.text();
        showToast(`❌ 철회 실패: ${txt}`);
    }
  } catch (err) { showToast('서버 연결 오류가 발생했습니다.'); }
}

async function cancelRegistration() {
  const targetId = window.editingParticipantId || (window.currentParticipant ? window.currentParticipant.id : null);
  if (!targetId) return;

  const isM = window.isDeadlinePassed;
  const p = window.currentParticipant;

  if (p && p.isDepositConfirmed) {
      await alert('입금이 완료된 상태에서는 신청 취소가 불가능합니다. 관리자에게 문의해주세요.');
      return;
  }

  if (isM && p && !p.isWaitlisted) {
      await alert('마감일 이후에는 신청 취소가 불가능합니다. 관리자에게 문의해주세요.');
      return;
  }
  
  if (p && p.isCancelRequested) {
      await alert('이미 취소 요청이 접수되었습니다. 관리자의 승인을 기다려주세요.');
      return;
  }

  const password = await prompt(p && p.isWaitlisted ? '대기 취소를 위해 비밀번호를 입력해주세요.' : '신청 취소를 위해 비밀번호를 입력해주세요.');
  if (!password) return;

  if (!await confirm(p && p.isWaitlisted ? '정말로 대기를 취소하시겠습니까?' : '정말로 신청을 취소하시겠습니까?')) return;
  try {
    const res = await fetch(`${API_BASE}/Participants/${targetId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), credentials: 'include' });
    if (res.ok) { 
        await alert('✅ 취소 요청이 정상적으로 접수되었습니다.\n\n취소 승인 대기 중에는 행사 도구 및 일부 서비스 이용이 제한됩니다.'); 
        location.reload();
    }
    else {
        const txt = await res.text();
        showToast(`❌ 취소 실패: ${txt}`);
    }
  } catch (err) { showToast('서버 연결 오류가 발생했습니다.'); }
}

// ===== MANITTO =====
async function openManittoModal() {
  const name = localStorage.getItem('participantName'); 
  if (!name) { 
      window.pendingAction = openManittoModal;
      await alert('MT 참가 신청 후 확인 가능합니다'); 
      openModal('login'); 
      return; 
  }

  try {
    const meRes = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
    if (meRes.ok) {
        const p = await meRes.json();
        if (!p.isRegistered || p.isCancelRequested) {
            await alert('취소 신청 상태이거나 취소된 참가자는 행사 도구를 이용할 수 없습니다.');
            return;
        }
    }
  } catch (e) {}

  try {
    const res = await fetch(`${API_BASE}/Manitto/me`, { credentials: 'include' }); 
    if (res.status === 401) {
        await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
    }
    if (!res.ok) { showToast('신청 데이터가 없거나 로드에 실패했습니다.'); return; }
    const data = await res.json(); 
    if (data.message) { await alert(data.message); return; }
    
    document.getElementById('manitto-target-name').textContent = data.targetName; 
    document.getElementById('manitto-target-gen').textContent = `${data.targetGeneration}기`;
    
    const missionContainer = document.getElementById('manitto-mission-container');
    if (missionContainer) {
        if (data.missions && data.missions.length > 0) {
            missionContainer.innerHTML = data.missions.map(m => `
                <div class="mission-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8f9fa; border-radius:12px; margin-bottom:8px; border:1px solid ${m.isComplete ? '#22C55E' : '#eee'};">
                    <div style="flex:1; font-size:14px; line-height:1.4; ${m.isComplete ? 'text-decoration:line-through; color:#999;' : ''}">
                        ${escapeHTML(m.description)}
                    </div>
                    ${m.isComplete ? 
                        '<span style="color:#22C55E; font-weight:800; font-size:12px; margin-left:10px;">✅ 완료</span>' : 
                        `<button onclick="completeMission(${m.missionId})" style="width:auto; padding:6px 12px; background:var(--blue-deep); color:white; font-size:12px; margin:0 0 0 10px; border-radius:8px;">완료하기</button>`
                    }
                </div>
            `).join('');
        } else {
            missionContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">배정된 미션이 없습니다.</div>';
        }
    } else {
        // Fallback for old HTML structure
        document.getElementById('manitto-mission-desc').textContent = data.missions && data.missions.length > 0 ? data.missions[0].description : "미션 없음";
        const btnC = document.getElementById('btnCompleteMission'); 
        const bC = document.getElementById('mission-complete-badge');
        if (data.missions && data.missions.length > 0 && data.missions[0].isComplete) { 
            if (btnC) btnC.style.display = 'none'; 
            if (bC) bC.style.display = 'block'; 
        } else { 
            if (btnC) btnC.style.display = 'block'; 
            if (bC) bC.style.display = 'none'; 
        }
    }
    
    openModal('manitto'); switchManittoTab('target');
  } catch (err) { console.error(err); showToast('데이터를 불러오지 못했습니다.'); }
}

function switchManittoTab(tabId) {
    const modal = document.getElementById('modal-manitto'); if (!modal) return;
    modal.querySelectorAll('.tab-btn').forEach(btn => { const isM = btn.getAttribute('onclick').includes(`'${tabId}'`); btn.classList.toggle('active', isM); btn.style.background = isM ? '#212529' : 'transparent'; btn.style.color = isM ? 'white' : '#666'; });
    modal.querySelectorAll('.manitto-tab-content').forEach(c => c.style.display = c.id === `manitto-${tabId}` ? 'block' : 'none');
    if (tabId === 'report') loadReports();
}

async function completeMission(missionId) {
    // If missionId is not provided (legacy call), we might need to handle it
    const id = missionId || 0; 
    if (!await confirm('미션을 완료하셨습니까?\n한 번 완료하면 취소할 수 없습니다.')) return;
    try { 
        const res = await fetch(`${API_BASE}/Manitto/me/complete-mission/${id}`, { method: 'POST', credentials: 'include' }); 
        if (res.ok) { 
            showToast('✅ 미션 완료! 고생하셨습니다.'); 
            openManittoModal(); // Refresh UI
        } else showToast('완료 처리 실패'); 
    } catch (e) { showToast('서버 연결 오류'); }
}

async function loadReports() {
    const container = document.getElementById('report-container'); if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/Manitto/reports`); if (!res.ok) return;
        const list = await res.json();
        if (list.length === 0) { container.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:13px;">아직 올라온 제보가 없습니다.</div>'; return; }
        container.innerHTML = list.map(r => { const kstDate = new Date(new Date(r.createdAt).getTime() + (9 * 60 * 60 * 1000)); return `<div class="card" style="padding:12px; background:#fff; border:1px solid #eee;"><div style="font-size:14px; line-height:1.5;">${escapeHTML(r.content)}</div><div style="font-size:10px; color:#999; margin-top:8px;">${kstDate.toLocaleString()}</div></div>`; }).join('');
    } catch (e) { console.error(e); }
}

let lastReportTimestamp = 0;
let isPostingReport = false;

async function postReport() {
    if (isPostingReport) return;

    const now = Date.now();
    if (now - lastReportTimestamp < 5000) {
        showToast('제보는 연속으로 할 수 없습니다. 잠시만 기다려주세요.');
        return;
    }

    const name = localStorage.getItem('participantName');
    if (!name) {
        await alert('제보는 신청 및 로그인 후에 이용 가능합니다. 🕵️');
        openModal('login');
        return;
    }

    const inp = document.getElementById('report-input'); 
    const content = inp.value.trim(); 
    if (!content) return;

    const btn = document.querySelector('#manitto-report button');
    const originalText = btn ? btn.textContent : '제보';

    try { 
        isPostingReport = true;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '...';
        }

        const clientRequestId = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 9); 
        const res = await fetch(`${API_BASE}/Manitto/reports`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ content, clientRequestId }), 
            credentials: 'include' 
        }); 

        if (res.status === 401) {
            await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            logout();
            return;
        }

        if (res.ok) { 
            inp.value = ''; 
            lastReportTimestamp = Date.now();
            await loadReports(); 
            showToast('🚀 제보가 완료되었습니다!'); 
        } else {
            const errorText = await res.text();
            showToast(`제보 실패: ${errorText}`); 
        }
    } catch (e) { 
        showToast('서버 오류'); 
    } finally {
        isPostingReport = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// ===== SUBMIT FORM =====
async function submitApplication(formId) {
  const name = document.getElementById('nameUnified')?.value.trim();
  const generation = parseInt(document.getElementById('genUnified')?.value) || 0;
  const phoneNumber = document.getElementById('telUnified')?.value.trim();
  
  if (!name) return showToast('이름을 입력해주세요.');
  if (!generation) return showToast('기수를 선택해주세요.');
  if (!phoneNumber) return showToast('연락처를 입력해주세요.');
  
  const phoneRegex = /^010\d{7,8}$/;
  if (!phoneRegex.test(phoneNumber)) {
      return showToast('올바른 연락처 형식이 아닙니다. (010으로 시작하는 10~11자리 숫자)');
  }

  const surveyData = getSurveyData('unified');
  
  // Dynamic validation based on SURVEY_CONFIG
  for (const q of SURVEY_CONFIG) {
    if (q.showFor.includes(window.curType)) {
        const val = surveyData[q.id];
        if (q.required && (!val || val.toString().trim() === '')) {
            return showToast(`${q.label} 필드를 입력/선택해주세요.`);
        }
        if (val && q.pattern) {
            const regex = new RegExp(`^${q.pattern}$`);
            if (!regex.test(val)) {
                return showToast(`${q.label} 형식이 올바르지 않습니다.`);
            }
        }
    }
  }

  // Special validation for Carpool
  if (surveyData.transportation === 'Car') {
      if (!surveyData.carpoolAvailable) return showToast('동승 가능 여부를 선택해주세요.');
      if (surveyData.carpoolAvailable === 'yes' && !surveyData.carpoolSeats) {
          return showToast('카풀 가능 인원을 입력해주세요.');
      }
  }

  // Special validation for License
  if (surveyData.hasDriverLicense) {
      if (!surveyData.licenseType) return showToast('면허 종류를 선택해주세요.');
      if (!surveyData.canDrive) return showToast('실제 운전 가능 여부를 선택해주세요.');
  }

  const passwordInp = document.getElementById('pwUnified');
  let finalPassword = passwordInp ? passwordInp.value : "";
  
  if (!window.editingParticipantId || finalPassword.length > 0) {
      const pwRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if (!pwRegex.test(finalPassword)) {
          return showToast('비밀번호는 8자리 이상이며, 영문과 숫자를 모두 포함해야 합니다.');
      }
  }

  let currentPassword = "";

  if (window.editingParticipantId) {
    currentPassword = await prompt('정보 수정을 위해 기존 비밀번호를 입력해주세요.'); if (!currentPassword) return;
  }
  
  const payload = {
    name, generation, phoneNumber, password: finalPassword, currentPassword, type: getParticipantType(window.curType), studentId: surveyData.stdId, participationCount: parseInt(surveyData.participationCount) || 0,
    memoryOrExpectation: surveyData.memory, oneLineExpectation: surveyData.expectation, hasDriverLicense: surveyData.hasDriverLicense, driverLicenseType: surveyData.licenseType, canDrive: surveyData.canDrive === 'yes',
    drivingExperience: surveyData.drivingExperience, isMilitaryPriority: surveyData.militaryPriority === 'yes', militaryStatus: surveyData.militaryStatus, participationSchedule: surveyData.participationSchedule || "Full",
    transportation: surveyData.transportation || "Car", isCarpoolAvailable: surveyData.carpoolAvailable === 'yes', carpoolSeats: parseInt(surveyData.carpoolSeats) || 0, departureArea: surveyData.departureArea,
    allergies: surveyData.allergies, remarks: surveyData.remarks || "", createdAt: new Date().toISOString(), isRegistered: true
  };

  try {
    const isEdit = !!window.editingParticipantId;
    const res = await fetch(isEdit ? `${API_BASE}/Participants/${window.editingParticipantId}` : `${API_BASE}/Participants`, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    
    if (res.status === 401) {
        await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
    }

    if (res.ok) {
      if (isEdit) { await alert('✅ 정보가 수정되었습니다. 다시 로그인해주세요.'); logout(); }
      else { await alert((await res.json()).message || '🎉 신청이 완료되었습니다!'); location.reload(); }
    } else showToast(`❌ 오류: ${await res.text()}`);
  } catch (err) { showToast('서버 연결 오류가 발생했습니다.'); }
}

function getParticipantType(typeStr) { const map = { student: 0, grad: 1, leave: 2, army: 3, etc: 4 }; return map[typeStr] ?? 0; }
function renderSettings(s) {
  const titleEl = document.querySelector('.hero h1');
  if (titleEl) {
    const ft = s.title || "제 0회 빅이큐 총동문 MT";
    if (ft.includes("총동문")) { const p = ft.split("총동문"); titleEl.innerHTML = `${p[0].trim()}<br><span>총동문 ${p[1].trim()}</span>`; }
    else { const p = ft.split(' '); const s = p.pop(); titleEl.innerHTML = `${p.join(' ')}<br><span>${s}</span>`; }
  }
  const subEl = document.querySelector('.hero-sub'); if (subEl) subEl.textContent = s.subtitle;
  const applyModalTitle = document.querySelector('#modal-apply .modal-title'); const applyModalSub = document.querySelector('#modal-apply .modal-sub');
  if (applyModalTitle) applyModalTitle.textContent = `✍️ ${s.title} 신청서`; if (applyModalSub) applyModalSub.textContent = `${s.title} · ${s.eventDateRange}`;
  const chips = document.querySelectorAll('.info-chip');
  if (chips.length >= 3) {
    chips[0].textContent = `📅 ${s.eventDateRange}`;
    chips[1].innerHTML = `📍 ${s.location} <span style="font-size:10px; opacity:0.7; margin-left:2px;">▶</span>`; chips[1].onclick = () => openLocationModal();
    chips[2].innerHTML = `💳 회비 ${s.registrationFee.toLocaleString()}원 <span style="font-size:10px; opacity:0.7; margin-left:2px;">▶</span>`; chips[2].onclick = () => openFeeModal();
  }
  const mtD = document.getElementById('mtDDayBlock'); const mtDN = document.getElementById('ddayNum');
  if (mtD && mtDN && s.dDayTargetDate && s.dDayTargetDate !== "0001-01-01T00:00:00") {
    const diff = Math.ceil((new Date(s.dDayTargetDate) - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff >= 0) { mtDN.textContent = diff === 0 ? '오늘!' : diff; mtD.style.display = 'inline-flex'; } else mtD.style.display = 'none';
  }
  const dlB = document.getElementById('deadlineBlock'); const dlN = document.getElementById('ddayDeadline'); let isM = false;
  if (dlB && dlN && s.registrationDeadline && s.registrationDeadline !== "0001-01-01T00:00:00") {
    const diff = Math.ceil((new Date(s.registrationDeadline) - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff >= 0) { dlN.textContent = diff === 0 ? '오늘!' : diff; dlB.style.display = 'inline-flex'; } else { dlB.style.display = 'none'; isM = true; }
  }
  window.isDeadlinePassed = isM; // Store globally
  if (isM) {
    const applyBtn = document.getElementById('btnApply');
    if (applyBtn) {
        applyBtn.onclick = null;
        applyBtn.textContent = '❌ 신청 마감';
        applyBtn.style.background = 'var(--border)';
        applyBtn.style.color = 'var(--text3)';
        applyBtn.style.cursor = 'not-allowed';
        applyBtn.style.boxShadow = 'none';
    }
    // Note: btnEditInfo and btnMyPageEdit remain functional
  }
  const MAX_ARMY = s.maxMilitaryCapacity || 4;
  const armyN = document.getElementById('armyNoticeText'); if (armyN) armyN.innerHTML = `🫡 군인 우선 예약으로 접수됩니다.<br>우선 배정 자리 ${MAX_ARMY}석 중 선착순으로 신청 가능합니다.`;
  const armyB = document.getElementById('armyBenefitText'); if (armyB) armyB.textContent = `선착순 마감과 관계없이 군인 우선 배정 — 별도 ${MAX_ARMY}자리가 먼저 배정됩니다.`;
  try { renderSchedule(JSON.parse(s.scheduleDataJson || "[]")); } catch (e) {}
}

function renderSchedule(data) {
  const cardsC = document.getElementById('scheduleCards'); const modalsC = document.getElementById('dynamicModals'); if (!cardsC || !modalsC) return;
  if (data.length === 0) { cardsC.innerHTML = '<p style="text-align:center; width:100%; color:var(--text3); padding:20px;">일정이 아직 등록되지 않았습니다.</p>'; modalsC.innerHTML = ''; return; }
  
  cardsC.innerHTML = data.map((d, i) => `
    <div class="schedule-day" onclick="openModal('sched${i+1}')">
      <div class="day-emoji">${d.emoji}</div>
      <div class="day-badge">DAY ${i+1}</div>
      <h4>${d.date}</h4>
      <p>${d.summary}</p>
      <div class="schedule-tap">탭하여 자세히 →</div>
    </div>
  `).join('');

  modalsC.innerHTML = data.map((d, i) => `
    <div class="modal-overlay" id="modal-sched${i+1}" onclick="closeBg(event,'sched${i+1}')">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <button class="modal-close" onclick="closeModal('sched${i+1}')">✕</button>
        <div class="modal-title">${d.emoji} DAY ${i+1} — ${d.date}</div>
        <div class="modal-sub">${d.summary.replace(/<br>/g, ' · ')}</div>
        <div class="timeline-container">
          ${d.timeline.map((t, ti) => {
            const hasManitto = t.title.includes('마니또') || t.desc.includes('마니또');
            const hasVehicle = t.title.includes('체육관으로 이동') || t.desc.includes('체육관으로 이동');
            const hasCooking = t.title.includes('요리 배틀') || t.desc.includes('요리 배틀') || t.title.includes('요리배틀') || t.desc.includes('요리배틀');
            return `
              <div class="tl-item">
                <div class="tl-time">${t.time}</div>
                <div class="tl-dots"><div class="tl-dot"></div>${ti < d.timeline.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
                <div class="tl-body">
                  <h4>${t.title}</h4>
                  <p>${t.desc}</p>
                  <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                    ${hasManitto ? `<button onclick="openManittoModal()" style="padding:4px 10px; background:var(--blue-soft); color:var(--blue-deep); border:1px solid var(--blue-mid); border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">🎁 내 마니또 확인</button>` : ''}
                    ${hasVehicle ? `<button onclick="openVehicleModal()" style="padding:4px 10px; background:var(--blue-soft); color:var(--blue-deep); border:1px solid var(--blue-mid); border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">🚗 차량 확인</button>` : ''}
                    ${hasCooking ? `<button onclick="openCookingBattleModal()" style="padding:4px 10px; background:var(--blue-soft); color:var(--blue-deep); border:1px solid var(--blue-mid); border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">👨‍🍳 요리배틀</button>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== UTILS & HELPERS =====
async function updateLocationModal() {
  const s = window.siteSettings; if (!s) return;
  const nEl = document.getElementById('location-name'); const dEl = document.getElementById('location-detail'); const btnM = document.getElementById('btnOpenMap');
  if (nEl) nEl.textContent = s.location; if (dEl) dEl.textContent = s.locationDetail || "상세 정보가 아직 등록되지 않았습니다.";
  if (btnM) { if (s.mapLink) { btnM.href = s.mapLink; btnM.style.display = 'block'; } else btnM.style.display = 'none'; }
}

async function openCohortModal() {
  const name = localStorage.getItem('participantName');
  if (!name) { 
      window.pendingAction = openCohortModal;
      await alert('MT 참가 신청 후 확인 가능합니다'); 
      openModal('login'); 
      return; 
  }

  try {
    const meRes = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
    if (meRes.ok) {
        const p = await meRes.json();
        if (!p.isRegistered || p.isCancelRequested) {
            await alert('취소 신청 상태이거나 취소된 참가자는 행사 도구를 이용할 수 없습니다.');
            return;
        }
    }
  } catch (e) {}

  openModal('cohort'); updateCohortTable();
}

function openModal(id) {
  const el = document.getElementById('modal-' + id); if (!el) return;
  if (id === 'apply' && !window.editingParticipantId) { resetApplyForm(); const eh = document.getElementById('editHeader'); const ts = document.getElementById('typeSelectionArea'); if (eh) eh.style.display = 'none'; if (ts) ts.style.display = 'block'; }
  el.classList.add('active'); document.body.classList.add('no-scroll');
}
function closeModal(id) { 
  const el = document.getElementById('modal-' + id); 
  if (el) el.classList.remove('active'); 
  if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('no-scroll'); 
}

// Track where mousedown started to prevent closing when releasing a drag outside
let modalMouseDownTarget = null;
document.addEventListener('mousedown', e => {
    modalMouseDownTarget = e.target;
});

function closeBg(e, id) { 
  const overlay = document.getElementById('modal-' + id);
  // Only close if BOTH mousedown and mouseup (click) happened strictly on the overlay
  if (e.target === overlay && modalMouseDownTarget === overlay) {
      closeModal(id); 
  }
}
function switchType(btn, type) { window.curType = type; btn.closest('.type-btns').querySelectorAll('.type-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderDynamicSurveys(type); }
function openApplyArmy() { openModal('apply'); const btns = document.querySelectorAll('.type-btn'); if (btns.length >= 4) switchType(btns[3], 'army'); }
function openFeeModal() { openModal('fee'); updateFeeTable(); }
function openLocationModal() { openModal('location'); updateLocationModal(); }
function applyCohortFilter() {
  const gen = document.getElementById('cohortGenFilter').value; const name = document.getElementById('cohortNameFilter').value.toLowerCase();
  document.querySelectorAll('#cohortTable tbody tr').forEach(r => { const genM = (gen === 'all' || r.getAttribute('data-cohort-val') === gen); const nameM = r.querySelector('.name-cell').textContent.toLowerCase().includes(name); r.style.display = (genM && nameM) ? '' : 'none'; });
}
function openEditFromHome() { const name = localStorage.getItem('participantName'); if (name) openEditFromMyPage(); else openModal('login'); }

function showPopup(title, message, type = 'alert') {
  return new Promise((resolve) => {
    const m = document.getElementById('modal-alert'); const t = document.getElementById('alert-title'); const msg = document.getElementById('alert-message');
    const iw = document.getElementById('alert-input-wrap'); const i = document.getElementById('alert-input'); const inew = document.getElementById('alert-input-new');
    const bcf = document.getElementById('btn-alert-confirm'); const bcl = document.getElementById('btn-alert-cancel');
    t.textContent = title || '알림'; msg.textContent = message; const isC = type === 'confirm' || type === 'prompt' || type === 'passwordChange';
    bcl.style.display = isC ? 'block' : 'none'; bcf.textContent = isC ? '확인' : '닫기';
    if (type === 'prompt' || type === 'passwordChange') { 
      iw.style.display = 'block'; 
      i.value = ''; 
      i.placeholder = type === 'passwordChange' ? '현재 비밀번호' : '비밀번호를 입력하세요'; 
      if (type === 'passwordChange') { 
        inew.style.display = 'block'; 
        inew.value = ''; 
        inew.placeholder = '새 비밀번호 (8자 이상, 영문+숫자)';
      } else inew.style.display = 'none'; 
      setTimeout(() => i.focus(), 100); 
    }
    else iw.style.display = 'none';
    const cl = () => { bcf.onclick = null; bcl.onclick = null; i.onkeypress = null; inew.onkeypress = null; closeModal('alert'); };
    bcf.onclick = () => { let val = type === 'prompt' ? i.value : (type === 'passwordChange' ? { old: i.value, new: inew.value } : true); cl(); resolve(val); };
    bcl.onclick = () => { cl(); resolve(type === 'prompt' || type === 'passwordChange' ? null : false); };
    const he = (e) => { if (e.key === 'Enter') bcf.click(); }; i.onkeypress = he; inew.onkeypress = he; openModal('alert');
  });
}

async function openChangePasswordPopup() {
    const res = await showPopup('비밀번호 변경', '현재 비밀번호와 새 비밀번호를 입력해주세요.', 'passwordChange'); 
    if (!res) return; 
    
    if (!res.new) return showToast('새 비밀번호를 입력해주세요.');
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!pwRegex.test(res.new)) {
        return showToast('비밀번호는 8자리 이상이며, 영문과 숫자를 모두 포함해야 합니다.');
    }

    const p = window.currentParticipant; if (!p) return;
    try {
        const ur = await fetch(`${API_BASE}/Participants/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, currentPassword: res.old, password: res.new, name: p.name, phoneNumber: p.phoneNumber, studentId: p.studentId }), credentials: 'include' });
        if (ur.ok) { await alert('✅ 비밀번호가 변경되었습니다. 다시 로그인해주세요.'); logout(); } else showToast(`❌ 변경 실패: ${await ur.text()}`);
    } catch (e) { showToast('서버 오류가 발생했습니다.'); }
}

// Global Exports
window.alert = (msg) => showPopup('알림', msg, 'alert'); window.confirm = (msg) => showPopup('확인', msg, 'confirm'); window.prompt = (msg) => showPopup('확인', msg, 'prompt');
window.openModal = openModal; window.closeModal = closeModal; window.closeBg = closeBg; window.switchType = switchType; window.openApplyArmy = openApplyArmy; window.openFeeModal = openFeeModal; window.openLocationModal = openLocationModal; window.openCohortModal = openCohortModal; window.toggleSchedule = toggleSchedule; window.applyCohortFilter = applyCohortFilter; window.openEditFromHome = openEditFromHome; window.showPopup = showPopup; window.setSurveyData = setSurveyData; window.openChangePasswordPopup = openChangePasswordPopup; window.submitApplication = submitApplication; window.doSubmit = submitApplication; window.toggleTransport = toggleTransport; window.toggleLicense = toggleLicense; window.goToCohort = goToCohort;

// ===== V-MBTI LOGIC =====
const MBTI_QUESTIONS = [
  {
    q: "경기 시작 전, 모르는 사람들과 팀이 되었을 때 나는?",
    a: "먼저 말을 걸며 파이팅을 외친다",
    b: "조용히 몸을 풀며 내 역할에 집중한다"
  },
  {
    q: "공격 찬스가 왔을 때 내가 더 선호하는 득점 방식은?",
    a: "블로킹 위에서 찍어 누르는 강력한 스파이크",
    b: "상대 수비가 없는 곳을 찌르는 정교한 연타나 페인트"
  },
  {
    q: "우리 팀 세터의 토스가 오늘따라 불안정하다면?",
    a: "공이 올라오는 궤적과 높이를 분석해 맞춤형으로 뜬다",
    b: "\"괜찮아!\"라고 외치며 일단 어떻게든 처리해주려 노력한다"
  },
  {
    q: "랠리 상황에서 수비 위치를 잡을 때 나는?",
    a: "미리 약속된 수비 포메이션 위치를 철저히 지킨다",
    b: "공이 날아가는 방향을 보고 본능적으로 몸을 던진다"
  },
  {
    q: "경기가 끝나고 다 같이 회식을 갔을 때 나의 모습은?",
    a: "게임 주도! 텐션 폭발! 분위기 메이커",
    b: "구석에서 소소하게 딥토크 하는 상담가"
  }
];

let mbtiAnswers = [];
let currentMbtiIdx = 0;
let currentMbtiResultCode = "";

function openMBTIModal() {
  currentMbtiIdx = 0;
  mbtiAnswers = [];
  document.getElementById('mbti-start').style.display = 'block';
  document.getElementById('mbti-quiz').style.display = 'none';
  document.getElementById('mbti-result').style.display = 'none';
  openModal('mbti');
}

function startMBTI() {
  currentMbtiIdx = 0;
  mbtiAnswers = [];
  currentMbtiResultCode = "";
  
  const btnSave = document.getElementById('btnSaveMbti');
  if (btnSave) {
    btnSave.textContent = '저장하기';
    btnSave.style.background = '#22C55E';
    btnSave.disabled = false;
  }
  
  document.getElementById('mbti-start').style.display = 'none';
  document.getElementById('mbti-result').style.display = 'none';
  document.getElementById('mbti-quiz').style.display = 'block';
  renderMBTIQuestion();
}

function renderMBTIQuestion() {
  const q = MBTI_QUESTIONS[currentMbtiIdx];
  document.getElementById('mbti-q-num').textContent = `Q${currentMbtiIdx + 1}.`;
  document.getElementById('mbti-question').textContent = q.q;
  document.getElementById('mbti-opt-a').textContent = `A. ${q.a}`;
  document.getElementById('mbti-opt-b').textContent = `B. ${q.b}`;
  document.getElementById('mbti-progress').style.width = `${((currentMbtiIdx) / MBTI_QUESTIONS.length) * 100}%`;
}

function selectMBTIAnswer(ans) {
  mbtiAnswers.push(ans);
  if (currentMbtiIdx < MBTI_QUESTIONS.length - 1) {
    currentMbtiIdx++;
    renderMBTIQuestion();
  } else {
    showMBTIResult();
  }
}

function showMBTIResult() {
  let code = "";
  code += mbtiAnswers[0] === 'A' ? 'A' : 'R';
  code += mbtiAnswers[1] === 'A' ? 'P' : 'C';
  code += mbtiAnswers[2] === 'A' ? 'L' : 'H';
  code += mbtiAnswers[3] === 'A' ? 'S' : 'F';
  showMBTIResultByCode(code);
}

const MBTI_RESULTS = {
  "APLS": {
    "title": "💣 전술적 폭격기형",
    "desc": "빅이큐의 인간 활력소이자 훈련 부장 스타일. 득점하면 체육관이 떠나가라 소리를 지르며 부원들 등을 불이 나게 두들겨 줍니다. 감독님이 지시한 작전이나 연습했던 포메이션을 자다가 깨워도 칼같이 몸으로 구현해 내는 팀의 아주 든든한 대들보입니다.",
    "mt": "고기 굽기부터 게임 진행까지 도맡는 과대표 스타일"
  },
  "APLF": {
    "title": "🐎 코트의 야생마형",
    "desc": "일단 공이 높게 떴다? 그러면 눈빛부터 야수로 변합니다. 각도가 나오든 안 나오든 본능적인 동물적 감각과 무지막지한 파워로 블로킹을 찢고 득점을 만들어냅니다. 가끔 너무 신나서 라인을 벗어나는 대형 범실을 하지만, 다음 랠리에서 더 강한 스파이크로 만회하는 미워할 수 없는 크레이지 에이스!",
    "mt": "제일 늦게까지 남아서 술자리를 지키는 에너자이저"
  },
  "APHS": {
    "title": "👑 열정의 리더형",
    "desc": "우리 팀원이 서브 범실을 하거나 넷터치를 해도 절대로 기죽지 않게 \"나이스 서브!\", \"마이 가자!\"를 가장 크게 외쳐주는 멘탈 케어 장인입니다. 흔들리는 팀 분위기를 전술적인 팁과 따뜻한 격려로 한 번에 다잡는, 그야말로 코트 위의 정신적 지주이자 캡틴 그 자체.",
    "mt": "분위기 처질 때쯤 브금(BGM) 선곡하며 텐션 올림"
  },
  "APHF": {
    "title": "✨ 분위기 메이커형",
    "desc": "배구를 하러 온 건지 예능을 찍으러 온 건지 모를 정도로 리액션이 화려합니다. 멋진 페인트 한 번 성공하면 세상 세레머니는 혼자 다 하며 코트를 뒤집어 놓습니다. 타고난 유연성과 감각적인 플레이로 예상치 못한 득점을 빵빵 터뜨려 관중석 환호성을 독차지하는 타입!",
    "mt": "웃음소리가 제일 커서 멀리서도 위치 파악 가능"
  },
  "ACLS": {
    "title": "🎯 정밀한 저격수형",
    "desc": "코트 위에서 소리는 지르고 있지만 머릿속은 AI처럼 차갑게 돌아가고 있습니다. 상대 수비가 어디로 치우쳤는지 논리적으로 분석한 뒤, 빈 공간에 서브를 꽂아 넣거나 빈틈을 정교하게 찔러서 득점합니다. 겉은 뜨겁고 속은 냉철한 츤데레 지략가입니다.",
    "mt": "장보기 리스트 완벽 정리하고 회계 정산하는 총무"
  },
  "ACLF": {
    "title": "🪄 코트의 마술사형",
    "desc": "상대 블로커 세 명이 높게 뜨면, 때리는 척하면서 툭- 팁을 놔버리는 야속하고도 완벽한 기술자입니다. 뻔한 플레이는 거부하는 개성파로, 예상치 못한 타이밍에 기상천외한 이단 연결이나 패스 페인트로 상대 팀 타이밍을 완벽하게 뺏고 혼자 씩 웃는 스타일.",
    "mt": "구석에서 웃긴 드립 하나씩 던져서 빵 터뜨림"
  },
  "ACHS": {
    "title": "🏠 든든한 살림꾼형",
    "desc": "화려한 공격에 가려지기 쉽지만, 팀이 이기기 위해 절대 없어서는 안 될 소중한 존재입니다. 정해진 수비 위치를 자석처럼 지키며 공을 살려내고, 리시브가 흔들려도 \"내가 커버할게!\"라며 동료들의 허점을 온몸으로 메워주는 배구판의 마더 테레사.",
    "mt": "모두가 즐거운지 확인하며 조용히 뒷정리함"
  },
  "ACHF": {
    "title": "💡 센스 만점 수비수형",
    "desc": "\"그게 왜 거기 가 있어?\" 소리가 절로 나오는 신기한 수비 위치 선정을 보여줍니다. 상대 공격수가 때릴 코스를 본능적으로 예측해서 몸을 날려 디그해 냅니다. 미스한 팀원에게 다가가 손을 꼭 잡아주며 \"다음 거 하나 하자\"고 다정하게 속삭여주는 소통 보스.",
    "mt": "선배·후배 모두에게 스스럼없이 다가가는 마당발"
  },
  "RPLS": {
    "title": "❄️ 냉철한 에이스형",
    "desc": "평소엔 말없이 묵묵히 몸을 풀지만, 경기 시작 휘슬이 울리면 눈빛이 돌변합니다. 철저하게 계산된 포지셔닝과 논리적인 코스 분석으로, 결정적인 순간에 블로킹 벽을 찢어버리는 강력한 한 방을 꽂아 넣습니다. 과묵한 카리스마로 팀원들이 믿고 공을 올리는 진정한 에이스.",
    "mt": "필요한 말만 딱딱 하고 족구 내기에서 캐리함"
  },
  "RPLF": {
    "title": "🧱 묵묵한 해결사형",
    "desc": "코트 위에서 말이 별로 없습니다. 하지만 랠리가 길어지고 다들 지쳐서 공을 놓칠 때, 어디선가 무서운 기세로 튀어나와 몸을 날려 공을 살려내고 해결해 줍니다. 본능적인 순발력과 피지컬로 말보다 행동, 점수로 모든 것을 증명하는 상남자/상여자 스타일.",
    "mt": "조용히 술 마시다가 게임 시작하면 눈빛 변함"
  },
  "RPHS": {
    "title": "⚓ 소리 없는 기둥형",
    "desc": "팀원들이 연속 범실을 해서 멘탈이 바스러지기 직전, 중심을 꽉 잡아주는 든든한 주춧돌입니다. 전술적으로 자기가 커버해야 할 영역을 조용히 넓히며 동료들의 부담을 덜어줍니다. 화려하게 눈에 띄진 않아도 이 사람의 존재 자체가 팀원들에게는 엄청난 안도감을 줍니다.",
    "mt": "사람들 얘기 다 들어주고 고민 상담해 주는 상담소"
  },
  "RPHF": {
    "title": "🐈 자유로운 영혼형",
    "desc": "배구를 고통스럽게 하지 않고 세상에서 가장 편안하고 유연하게 즐깁니다. 긴장감 넘치는 매치포인트 상황에서도 혼자 여유로운 미소를 띠며 본능적인 센스로 공을 툭 넘겨 득점합니다. 압박감 따위는 가볍게 씹어 드시는 코트 위의 낭만 고양이.",
    "mt": "안주 맛집 기가 막히게 찾아서 혼자 잘 즐김"
  },
  "RCLS": {
    "title": "💻 인간 데이터기형",
    "desc": "상대 팀 세터의 손 모양, 공격수의 시선 처리를 조용히 스캔하고 있습니다. \"저 형 다음엔 무조건 직선 때린다\"를 예측하고 정해진 수비 코스에 미리 가 서 있는 돋보기 같은 존재. 기복 없이 늘 평균 이상의 안정적인 플레이를 보여주는 인간 계산기입니다.",
    "mt": "다음 날 아침 제일 먼저 일어나서 설거지하는 타입"
  },
  "RCLF": {
    "title": "🧠 본능적 전략가형",
    "desc": "영리함 그 자체. 상대 수비수들과의 치열한 두뇌 싸움에서 절대 밀리지 않습니다. 넓은 수비 범위와 날카로운 촉을 가지고 있어서, 상대가 빈틈을 만들면 귀신같이 알아채고 감각적인 토스나 페인트로 코트를 요리조리 흔들어 놓습니다.",
    "mt": "다들 취했을 때 혼자 안 취하고 상황 정리 끝냄"
  },
  "RCHS": {
    "title": "🛡️ 안전 지대형",
    "desc": "이 사람 뒤에 서 있으면 마치 내 뒤에 거대한 방파제가 있는 것 같습니다. 완벽한 위치 선정으로 어떤 강타든 부드럽게 받아 올려 세터 머리 위에 예쁘게 배달해 줍니다. 실수한 동료에게 \"내 토스가 짧았어, 미안해\"라며 모든 걸 안아주는 포근함의 대명사.",
    "mt": "뒤에서 묵묵히 고기 나르고 쌈 싸주는 스타일"
  },
  "RCHF": {
    "title": "🔭 코트의 관찰자형",
    "desc": "전체적인 경기 흐름을 읽는 눈이 아주 좋습니다. 팀원들이 어떤 타이밍에 공을 때리기 좋아하는지, 어떤 위치를 불안해하는지 조용히 관찰했다가 가장 편안한 플레이를 할 수 있도록 부드럽게 호흡을 맞춰주는 숨은 조력자이자 살림꾼입니다.",
    "mt": "마당 평상에 앉아 밤하늘 보며 힐링하는 감성파"
  }
};

const MBTI_LETTER_MAP = {
  'A': { category: '에너지', name: 'Active (활동파)' },
  'R': { category: '에너지', name: 'Reserved (묵묵파)' },
  'P': { category: '플레이', name: 'Power (파워형)' },
  'C': { category: '플레이', name: 'Control (컨트롤형)' },
  'L': { category: '판단/소통', name: 'Logic (논리형)' },
  'H': { category: '판단/소통', name: 'Heart (따뜻한 마음형)' },
  'S': { category: '경기 운영', name: 'System (전술파)' },
  'F': { category: '경기 운영', name: 'Flex (감각파)' }
};

function showLetterDesc(letter, event) {
  const info = MBTI_LETTER_MAP[letter];
  if (!info) return;

  const container = document.getElementById('res-mbti-code');
  const target = event.currentTarget;
  
  // Remove existing tooltips
  const oldTooltips = container.querySelectorAll('.letter-tooltip');
  oldTooltips.forEach(t => t.remove());

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'letter-tooltip';
  tooltip.innerHTML = `<span style="opacity:0.7; font-size:10px; display:block; margin-bottom:2px;">${info.category}</span>${info.name}`;
  
  // Calculate position relative to container
  const rect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  const left = (rect.left - containerRect.left) + (rect.width / 2);
  const top = (rect.top - containerRect.top);
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  
  container.appendChild(tooltip);
  
  // Force reflow and activate
  tooltip.offsetHeight;
  tooltip.classList.add('active');
  
  // Auto-remove after 2.5 seconds
  setTimeout(() => {
    if (tooltip.parentElement) {
      tooltip.classList.remove('active');
      setTimeout(() => tooltip.remove(), 400);
    }
  }, 2000);

  const letters = container.querySelectorAll('[data-letter]');
  letters.forEach(el => {
    if (el.getAttribute('data-letter') === letter) {
      el.style.transform = 'scale(1.1)';
      el.style.boxShadow = '0 0 0 2px var(--blue)';
    } else {
      el.style.transform = 'scale(1)';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    }
  });
}

function showMBTIResultByCode(code) {
  let result = MBTI_RESULTS[code];
  if (!result) result = MBTI_RESULTS["APLS"]; // Fallback

  currentMbtiResultCode = code;

  document.getElementById('mbti-progress').style.width = '100%';
  document.getElementById('mbti-start').style.display = 'none';
  document.getElementById('mbti-quiz').style.display = 'none';
  document.getElementById('mbti-result').style.display = 'block';

  const lettersHtml = code.split('').map(c =>
    `<div data-letter="${c}" onclick="showLetterDesc('${c}', event)" style="width: 44px; height: 44px; background: var(--blue-soft); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: var(--blue-deep); box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s;">${c}</div>`
  ).join('');
  document.getElementById('res-mbti-code').innerHTML = `<div style="display: flex; justify-content: center; gap: 8px;">${lettersHtml}</div>`;
  document.getElementById('res-title').textContent = result.title;
  document.getElementById('res-desc').textContent = result.desc;
  document.getElementById('res-mt').textContent = result.mt;

  const btnSave = document.getElementById('btnSaveMbti');  if (btnSave) {
    if (window.currentParticipant && window.currentParticipant.mbtiResult === code) {
      btnSave.textContent = '저장됨';
      btnSave.style.background = '#999';
      btnSave.disabled = true;
    } else {
      btnSave.textContent = '저장하기';
      btnSave.style.background = '#22C55E';
      btnSave.disabled = false;
    }
  }
}

async function saveMBTIResult() {
  if (!window.currentParticipant) {
    window.pendingAction = saveMBTIResult;
    await alert('로그인 후 결과를 저장할 수 있습니다. 🏐');
    openModal('login');
    return;
  }
  
  if (!currentMbtiResultCode) return;
  
  try {
    const res = await fetch(`${API_BASE}/Participants/me/mbti`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentMbtiResultCode),
      credentials: 'include'
    });
    
    if (res.status === 401) {
        await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
    }

    if (res.ok) {
      window.currentParticipant.mbtiResult = currentMbtiResultCode;
      const btnSave = document.getElementById('btnSaveMbti');
      if (btnSave) {
        btnSave.textContent = '저장됨';
        btnSave.style.background = '#999';
        btnSave.disabled = true;
      }
      showToast('✅ MBTI 결과가 저장되었습니다!');
    } else {
      showToast('저장 실패');
    }
  } catch(e) {
    showToast('서버 연결 오류');
  }
}

async function viewMBTIFromMyPage() {
  if (window.currentParticipant && window.currentParticipant.mbtiResult) {
    closeModal('mypage');
    showMBTIResultByCode(window.currentParticipant.mbtiResult);
    openModal('mbti');
  } else {
    await alert('아직 저장된 V-MBTI 결과가 없습니다.\n테스트를 진행하고 결과를 저장해보세요! 🏐');
    closeModal('mypage');
    openMBTIModal();
  }
}

async function openCookingBattleModal() {
  const name = localStorage.getItem('participantName'); 
  if (!name) { 
      window.pendingAction = openCookingBattleModal;
      await alert('MT 참가 신청 후 이용 가능합니다'); 
      openModal('login'); 
      return; 
  }

  try {
    const meRes = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
    if (meRes.ok) {
        const p = await meRes.json();
        if (!p.isRegistered || p.isCancelRequested) {
            await alert('취소 신청 상태이거나 취소된 참가자는 행사 도구를 이용할 수 없습니다.');
            return;
        }
    }
  } catch (e) {}
  
  openModal('cooking');
  const statusData = await refreshCookingStatus();
  await refreshCookingComments();

  // Start polling only if public
  if (cookingPollingInterval) clearInterval(cookingPollingInterval);
  if (statusData && statusData.isPublic) {
    cookingPollingInterval = setInterval(() => {
      const modal = document.getElementById('modal-cooking');
      if (modal && modal.classList.contains('active')) {
        refreshCookingStatus().then(data => {
            // If it becomes private while polling, stop polling
            if (data && !data.isPublic) {
                clearInterval(cookingPollingInterval);
                cookingPollingInterval = null;
            }
        });
        refreshCookingComments();
      } else {
        clearInterval(cookingPollingInterval);
        cookingPollingInterval = null;
      }
    }, 5000);
  }
}

async function refreshCookingStatus() {
  try {
    const res = await fetch(`${API_BASE}/CookingBattle/status`, { credentials: 'include' });
    if (res.status === 401) return logout();
    if (!res.ok) return null;
    const data = await res.json();

    if (data.myApplication) {
      document.getElementById('cooking-apply-form').style.display = 'none';
      document.getElementById('cooking-apply-done').style.display = 'block';
    }

    // My Team Button
    const btnMyTeam = document.getElementById('btnMyTeam');
    if (btnMyTeam) {
        const isAssigned = data.teams && data.teams.some(t => t.chef);
        btnMyTeam.disabled = !isAssigned;
        btnMyTeam.style.opacity = isAssigned ? '1' : '0.5';
        btnMyTeam.style.background = isAssigned ? 'var(--blue-deep)' : 'var(--bg3)';
        btnMyTeam.style.color = isAssigned ? 'white' : 'var(--text2)';
        btnMyTeam.style.cursor = isAssigned ? 'pointer' : 'not-allowed';
    }

    // Team Profiles
    if (data.teams) {
      data.teams.forEach(t => {
        const prefix = t.team.toLowerCase();
        const nameEl = document.getElementById(`${prefix}-chef-name`);
        const descEl = document.getElementById(`${prefix}-chef-desc`);
        const membersEl = document.getElementById(`${prefix}-members`);

        if (t.chef) {
          nameEl.textContent = `${t.chef.name} (${t.chef.generation}기)`;
          descEl.textContent = t.chef.experience || '';
        } else {
          nameEl.textContent = '-';
          descEl.textContent = '지원자 중 선발 예정';
        }

        if (membersEl) {
            if (t.members && t.members.length > 0) {
                const avatars = t.members.filter(m => m.role === 'Avatar');
                const assistants = t.members.filter(m => m.role === 'Assistant');
                
                let html = '';
                if (avatars.length > 0) {
                    html += `<div style="display:flex; flex-wrap:wrap; gap:6px; width:100%; border-bottom:1px dashed var(--border); padding-bottom:8px; margin-bottom:8px;">`;
                    html += avatars.map(m => `<span style="background: var(--blue-soft); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: var(--blue-deep); border: 1px solid var(--blue-mid);">아바타: ${m.name}</span>`).join('');
                    html += `</div>`;
                }
                if (assistants.length > 0) {
                    html += `<div style="display:flex; flex-wrap:wrap; gap:6px; width:100%;">`;
                    html += assistants.map(m => `<span style="background: var(--bg2); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: var(--text2); border: 1px solid var(--border);">보조: ${m.name}</span>`).join('');
                    html += `</div>`;
                }
                membersEl.innerHTML = html;
            } else {
                membersEl.innerHTML = '';
            }
        }
      });
    }

    // My Role Data (for modal)
    window.myCookingData = { 
        assignment: data.myAssignment, 
        isPublic: data.isPublic,
        isChefPublic: data.isChefPublic,
        teamsAssigned: data.teams && data.teams.some(t => t.chef)
    };

    // Stats
    document.getElementById('black-cheer-bar').style.height = `${data.cheerStats.blackPercent}%`;
    document.getElementById('white-cheer-bar').style.height = `${data.cheerStats.whitePercent}%`;

    // Cheer Buttons and Comment Inputs
    const canCheer = (data.isPublic || data.isChefPublic) && data.teams && data.teams.some(t => t.chef);
    document.querySelectorAll('.heart-btn-wrap').forEach(btn => {
      btn.style.opacity = canCheer ? '1' : '0.5';
      btn.style.cursor = canCheer ? 'pointer' : 'not-allowed';
      btn.style.pointerEvents = canCheer ? 'auto' : 'none';
    });

    // Comment Inputs
    ['black', 'white'].forEach(team => {
      const input = document.getElementById(`cook-comment-${team}`);
      const btn = document.getElementById(`btn-comment-${team}`);
      if (input && btn) {
        input.disabled = !canCheer;
        input.placeholder = canCheer ? '한줄평 남기기...' : '팀 배정 후 작성 가능합니다.';
        btn.disabled = !canCheer;
        btn.style.opacity = canCheer ? '1' : '0.5';
        btn.style.cursor = canCheer ? 'pointer' : 'not-allowed';
      }
    });

    // Voting
    document.querySelectorAll('.vote-btn').forEach(btn => {
      btn.style.display = 'block';
      btn.disabled = !data.isVotingActive;
      btn.style.opacity = data.isVotingActive ? '1' : '0.5';
      btn.style.cursor = data.isVotingActive ? 'pointer' : 'not-allowed';
    });

    return data;
  } catch (e) { 
    console.error(e);
    return null;
  }
}

async function openMyTeamModal() {
  if (!window.myCookingData || (!window.myCookingData.isPublic && !window.myCookingData.isChefPublic)) return;
  
  const roleEl = document.getElementById('my-cooking-role-large');
  const name = localStorage.getItem('participantName');

  if (!window.myCookingData.teamsAssigned) {
      roleEl.innerHTML = `${name}님은<br><span style="color:var(--text3); font-size:24px;">팀 배정 대기 중</span>입니다.`;
  } else if (window.myCookingData.assignment && window.myCookingData.assignment.role !== 0) {
    const isSpectator = window.myCookingData.assignment.role === 4;
    const isChefOnlyReveal = window.myCookingData.isChefPublic && !window.myCookingData.isPublic;
    
    // If only chef is public and user is NOT a chef, show as spectator or waiting
    if (isChefOnlyReveal && window.myCookingData.assignment.role !== 1) {
        roleEl.innerHTML = `${name}님은<br><span style="color:var(--text3); font-size:24px;">팀 배정 대기 중</span>입니다.`;
    } else {
        const teamStr = window.myCookingData.assignment.team === 1 ? '흑팀' : window.myCookingData.assignment.team === 2 ? '백팀' : '';
        let roleStr = '';
        switch(window.myCookingData.assignment.role) {
            case 1: roleStr = '오더 셰프'; break;
            case 2: roleStr = '아바타'; break;
            case 3: roleStr = '보조 셰프'; break;
            case 4: roleStr = '관객'; break;
            default: roleStr = '팀 배정 대기 중'; break;
        }
        if (window.myCookingData.assignment.role === 4) {
            roleEl.innerHTML = `${name}님은<br><span style="color:var(--text3); font-size:24px;">관객</span>입니다.`;
        } else {
            roleEl.innerHTML = `${name}님은<br><span style="color:var(--blue); font-size:24px;">${teamStr} ${roleStr}</span>입니다!`;
        }
    }
  } else {
    // Teams are assigned, but this user has no assignment or Role=0 (None)
    roleEl.innerHTML = `${name}님은<br><span style="color:var(--text3); font-size:24px;">관객</span>입니다.`;
  }

  openModal('cook-team');
}

async function applyForChef() {
  const exp = document.getElementById('cook-exp').value.trim();
  const dish = document.getElementById('cook-dish').value.trim();
  if (!exp || !dish) return alert('포부와 자신있는 요리를 입력해주세요.');

  try {
    const res = await fetch(`${API_BASE}/CookingBattle/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experience: exp, signatureDish: dish }),
      credentials: 'include'
    });
    if (res.ok) {
      showToast('✅ 셰프 지원 완료!');
      refreshCookingStatus();
    } else {
      const msg = await res.text();
      alert(msg || '지원 실패');
    }
  } catch (e) { alert('서버 오류'); }
}

async function cheerTeam(team) {
  const prefix = team.toLowerCase();
  const btnWrap = document.getElementById(`btn-cheer-${prefix}`);
  const bar = document.getElementById(`${prefix}-cheer-bar`);
  
  // 1. Optimistic UI: Immediately update the bar slightly
  if (bar) {
    const currentHeight = parseFloat(bar.style.height || '0');
    if (currentHeight < 100) {
      bar.style.height = `${Math.min(100, currentHeight + 3)}%`;
    }
  }

  // 2. Animation: Heart beat effect
  if (btnWrap) {
    btnWrap.classList.remove('heart-beat');
    void btnWrap.offsetWidth; // Trigger reflow
    btnWrap.classList.add('heart-beat');
    setTimeout(() => btnWrap.classList.remove('heart-beat'), 400);
  }

  try {
    const res = await fetch(`${API_BASE}/CookingBattle/cheer/${team}`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      // Background refresh to sync with real data
      refreshCookingStatus();
    } else if (res.status === 429) {
      alert('응원하기 횟수가 소진되었습니다.');
      refreshCookingStatus();
    } else {
      let msg = '응원 실패';
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        msg = data.message || msg;
      } catch {
        msg = text || msg;
      }
      alert(msg);
      refreshCookingStatus();
    }
  } catch (e) { 
      console.error(e);
      refreshCookingStatus();
  }
}

async function voteTeam(team) {
  if (!await confirm(`${team === 'Black' ? '흑팀' : '백팀'}에 투표하시겠습니까? 한번 투표하면 변경할 수 없습니다.`)) return;
  try {
    const res = await fetch(`${API_BASE}/CookingBattle/vote/${team}`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      alert('🗳️ 투표가 완료되었습니다!');
      refreshCookingStatus();
    } else {
      let msg = '투표 실패';
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        msg = data.message || msg;
      } catch {
        msg = text || msg;
      }
      alert(msg);
    }
  } catch (e) { alert('서버 오류'); }
}

async function refreshCookingComments() {
  const fetchComments = async (team) => {
    try {
      const res = await fetch(`${API_BASE}/CookingBattle/comments/${team}`);
      if (!res.ok) return;
      const comments = await res.json();
      const list = document.getElementById(`cook-comment-list-${team.toLowerCase()}`);
      if (list) {
        list.innerHTML = comments.map(c => `
          <div style="font-size: 11px; padding: 6px 10px; background: ${team === 'Black' ? '#f4f4f4' : '#fafafa'}; border-radius: 6px; line-height: 1.4;">
            ${escapeHTML(c.content)}
          </div>
        `).join('') || '<div style="text-align:center; color:#999; font-size:11px; padding:10px;">첫 한줄평을 남겨보세요!</div>';
      }
    } catch (e) {}
  };

  await fetchComments('Black');
  await fetchComments('White');
}

async function postCookComment(team) {
  const input = document.getElementById(`cook-comment-${team.toLowerCase()}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await fetch(`${API_BASE}/CookingBattle/comments/${team}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      credentials: 'include'
    });
    if (res.ok) {
      input.value = '';
      refreshCookingComments();
    }
  } catch (e) {}
}

window.openMBTIModal = openMBTIModal;
window.startMBTI = startMBTI;
window.selectMBTIAnswer = selectMBTIAnswer;
window.saveMBTIResult = saveMBTIResult;
window.viewMBTIFromMyPage = viewMBTIFromMyPage;
window.openCookingBattleModal = openCookingBattleModal;
window.openMyTeamModal = openMyTeamModal;
window.applyForChef = applyForChef;
window.cheerTeam = cheerTeam;
window.voteTeam = voteTeam;
window.postCookComment = postCookComment;
window.logout = logout; window.openMyPage = openMyPage; window.addChecklistItem = addChecklistItem; window.removeChecklistItem = removeChecklistItem; window.toggleCheck = toggleCheck; window.toggleCommonCheck = toggleCommonCheck; window.postReport = postReport; window.completeMission = completeMission; window.switchManittoTab = switchManittoTab; window.openManittoModal = openManittoModal; window.cancelRegistration = cancelRegistration;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard(); updateAuthUI(); updatePhotoSection();
  const ci = document.getElementById('checklist-input'); if (ci) ci.addEventListener('keypress', (e) => { if (e.key === 'Enter') addChecklistItem(); });
  const tb = document.getElementById('themeBtn'); if (tb) tb.addEventListener('click', function() { const d = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = d ? 'light' : 'dark'; this.textContent = d ? '🌙' : '☀️'; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id.replace('modal-', ''))); });
});

// ===== VEHICLE ASSIGNMENT =====
let vehiclePollingInterval = null;
let cookingPollingInterval = null;

async function openVehicleModal() {
  const name = localStorage.getItem('participantName'); 
  if (!name) { 
      window.pendingAction = openVehicleModal;
      await alert('MT 참가 신청 후 확인 가능합니다'); 
      openModal('login'); 
      return; 
  }

  try {
    const meRes = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });
    if (meRes.ok) {
        const p = await meRes.json();
        if (!p.isRegistered || p.isCancelRequested) {
            await alert('취소 신청 상태이거나 취소된 참가자는 행사 도구를 이용할 수 없습니다.');
            return;
        }
    }
  } catch (e) {}

  try {
    const res = await fetch(`${API_BASE}/Vehicle/my`, { credentials: 'include' });
    if (res.status === 401) {
        await alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
    }
    if (res.status === 404) {
        await alert('아직 차량이 배정되지 않았습니다. 관리자의 배정을 기다려주세요.');
        return;
    }
    if (!res.ok) { showToast('데이터 로드에 실패했습니다.'); return; }

    const data = await res.json();
    if (!data.isPublic && !window.isAdmin) {
        await alert('🔒 아직 차량 배정표가 공개되지 않았습니다.');
        return;
    }

    openModal('vehicle');
    switchVehicleTab('my');
    
    // Start polling
    if (vehiclePollingInterval) clearInterval(vehiclePollingInterval);
    vehiclePollingInterval = setInterval(() => {
      const modal = document.getElementById('modal-vehicle');
      if (modal && modal.classList.contains('active')) {
        const activeTab = document.querySelector('.tab-btn.active#tab-vehicle-my') ? 'my' : 'all';
        if (activeTab === 'my') fetchVehicleMy();
        else fetchVehicleAll();
      } else {
        clearInterval(vehiclePollingInterval);
        vehiclePollingInterval = null;
      }
    }, 5000);
  } catch (err) {
    console.error(err);
    showToast('서버 통신 중 오류가 발생했습니다.');
  }
}

function switchVehicleTab(tab) {
  const tabs = ['my', 'all'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-vehicle-${t}`);
    const content = document.getElementById(`vehicle-${t}-content`);
    if (btn) btn.classList.toggle('active', t === tab);
    if (content) content.style.display = t === tab ? 'block' : 'none';
  });

  if (tab === 'my') fetchVehicleMy();
  else fetchVehicleAll();
}

async function fetchVehicleMy() {
  const titleEl = document.getElementById('vehicle-my-title');
  const infoEl = document.getElementById('vehicle-my-info');
  const privateMsg = document.getElementById('vehicle-private-msg');
  const driverActions = document.getElementById('vehicle-driver-actions');
  const myContent = document.getElementById('vehicle-my-content');

  try {
    const res = await fetch(`${API_BASE}/Vehicle/my`, { credentials: 'include' });
    if (res.status === 401) {
      if (myContent) myContent.style.display = 'none';
      if (privateMsg) {
        privateMsg.style.display = 'block';
        privateMsg.innerHTML = '🔒 로그인 후 이용 가능합니다.';
      }
      return;
    }
    if (res.status === 404) {
      if (myContent) myContent.style.display = 'block';
      if (privateMsg) privateMsg.style.display = 'none';
      if (titleEl) titleEl.textContent = '아직 차량이 배정되지 않았습니다.';
      if (infoEl) infoEl.innerHTML = '<p style="text-align:center; color:var(--text3);">관리자의 배정을 기다려주세요.</p>';
      if (driverActions) driverActions.style.display = 'none';
      return;
    }
    if (!res.ok) throw new Error();

    const data = await res.json();
    if (!data.isPublic && !window.isAdmin) {
      if (myContent) myContent.style.display = 'none';
      if (privateMsg) {
        privateMsg.style.display = 'block';
        privateMsg.innerHTML = '🔒 아직 차량 배정표가 공개되지 않았습니다.';
      }
      return;
    }

    if (myContent) myContent.style.display = 'block';
    if (privateMsg) privateMsg.style.display = 'none';

    const v = data.vehicle;
    const myName = window.currentParticipant ? window.currentParticipant.name : '본인';
    if (titleEl) titleEl.textContent = `${myName} 님의 이동수단: [${v.vehicleNumber}호차]`;

    let html = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 12px; color: var(--text3); margin-bottom: 6px; font-weight: 700;">배정 상태</div>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: var(--blue-soft); color: var(--blue-deep); padding: 6px 14px; border-radius: 100px; font-weight: 800; font-size: 14px;">
              ${getVehicleStatusIcon(v.status)} ${getVehicleStatusText(v.status)}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: var(--text3); margin-bottom: 6px; font-weight: 700;">차량 정보</div>
            <div style="font-size: 15px; font-weight: 800; color: var(--text);">
              ${v.vehicleNumber}호차
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border); padding-top: 20px;">
          <div style="font-size: 12px; color: var(--text3); margin-bottom: 10px; font-weight: 700;">함께 이동하는 인원</div>
          <div style="background: var(--bg); border-radius: 14px; padding: 16px; border: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--border);">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--blue-soft); display: flex; align-items: center; justify-content: center; font-size: 18px;">👑</div>
              <div>
                <div style="font-size: 11px; color: var(--text3); font-weight: 700;">차장</div>
                <div style="font-size: 14px; font-weight: 800;">${v.driver ? `${v.driver.name} (${v.driver.generation}기)` : '미지정'}</div>
              </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${v.passengers.map(p => `<span style="background: var(--bg2); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--text2); border: 1px solid var(--border);">${p.name}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    if (infoEl) infoEl.innerHTML = html;

    if (v.driver && window.currentParticipant && v.driver.id === window.currentParticipant.id) {
      if (driverActions) driverActions.style.display = 'block';
      window.myVehicleId = v.id;
    } else {
      if (driverActions) driverActions.style.display = 'none';
    }

  } catch (err) {
    console.error(err);
  }
}

async function fetchVehicleAll() {
  const container = document.getElementById('vehicle-list-container');
  const privateMsg = document.getElementById('vehicle-private-msg');
  const allContent = document.getElementById('vehicle-all-content');

  try {
    const res = await fetch(`${API_BASE}/Vehicle/all`, { credentials: 'include' });
    if (!res.ok) throw new Error();

    const data = await res.json();
    if (!data.isPublic && !window.isAdmin) {
      if (allContent) allContent.style.display = 'none';
      if (privateMsg) {
        privateMsg.style.display = 'block';
        privateMsg.innerHTML = '🔒 아직 차량 배정표가 공개되지 않았습니다.';
      }
      return;
    }

    if (allContent) allContent.style.display = 'block';
    if (privateMsg) privateMsg.style.display = 'none';

    if (data.vehicles.length === 0) {
      if (container) container.innerHTML = '<p style="text-align:center; color:var(--text3); padding:40px 0;">배정된 차량이 없습니다.</p>';
      return;
    }

    if (container) container.innerHTML = data.vehicles.map(v => `
      <div class="card" style="padding: 16px; border: 1.5px solid ${v.status === 3 ? 'var(--border)' : 'var(--blue-mid)'}; opacity: ${v.status === 3 ? 0.7 : 1};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 15px; font-weight: 800;">[${v.vehicleNumber}호차] ${v.driver ? v.driver.name : '차장 없음'}</div>
          <div style="font-size: 13px; font-weight: 700; color: var(--blue-deep);">
            ${getVehicleStatusIcon(v.status)} ${getVehicleStatusText(v.status)}
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text3); line-height: 1.5;">
          ${v.passengers.map(p => p.name).join(', ')}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

async function updateVehicleStatus(status) {
  if (!window.myVehicleId) return;
  const statusMap = { 'Called': 1, 'Moving': 2, 'Arrived': 3 };
  try {
    const res = await fetch(`${API_BASE}/Vehicle/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: window.myVehicleId, status: statusMap[status] }),
      credentials: 'include'
    });
    if (res.ok) {
      showToast('상태가 업데이트되었습니다.');
      fetchVehicleMy();
    } else {
      showToast('상태 업데이트에 실패했습니다.');
    }
  } catch (err) {
    console.error(err);
  }
}

function getVehicleStatusIcon(status) {
  switch (status) {
    case 1: case 'Called': return '📞'; case 2: case 'Moving': return '🚚'; case 3: case 'Arrived': return '✅'; default: return '⏳';
  }
}

function getVehicleStatusText(status) {
  switch (status) {
    case 1: case 'Called': return '호출 완료'; case 2: case 'Moving': return '이동중'; case 3: case 'Arrived': return '도착'; default: return '대기 중';
  }
}

window.openVehicleModal = openVehicleModal;
window.switchVehicleTab = switchVehicleTab;
window.updateVehicleStatus = updateVehicleStatus;

// ===== PHOTO STUDIO =====
let photoFetched = false;
async function updatePhotoSection() {
  const section = document.getElementById('photoSection');
  const track = document.getElementById('photoMarqueeTrack');
  if (!section || !track || photoFetched) return;

  try {
    photoFetched = true;
    const res = await fetch(`${API_BASE}/Photo/all-photos`);
    if (!res.ok) return;
    const photos = await res.json();

    if (photos.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    
    // Create scrolling marquee
    const repeatCount = photos.length < 5 ? 10 : 2;
    const allPhotos = [];
    for (let i = 0; i < repeatCount; i++) allPhotos.push(...photos);
    
    track.innerHTML = allPhotos.map(p => `
      <div class="marquee-item" style="width: 120px; height: 120px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: var(--bg2); border: 1px solid var(--border);">
        <img src="${API_BASE.replace('/api', '')}${p.thumbnailUrl || p.url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/120?text=Error'">
      </div>
    `).join('');
    
    track.style.animation = 'none';
    track.offsetHeight; // trigger reflow
    
    // Maintain constant speed: Duration proportional to track length
    const speedFactor = 6.0; // Seconds for one image to pass
    const moveCount = allPhotos.length / 2;
    const totalDuration = moveCount * speedFactor;
    
    track.style.animation = `marquee ${totalDuration}s linear infinite`;
    track.style.setProperty('--marquee-end', `-50%`);
  } catch (e) {
    console.error('Error fetching photos:', e);
  }
}

let cachedSessions = null;

async function openPhotoModal() {
  openModal('photo');
  const listContainer = document.getElementById('photo-session-list');
  const emptyMsg = document.getElementById('photo-empty-msg');

  try {
    const res = await fetch(`${API_BASE}/Photo/sessions`);
    if (!res.ok) throw new Error();
    const sessions = await res.json();

    if (sessions.length === 0) {
      listContainer.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    listContainer.innerHTML = sessions.map(s => `
      <div class="photo-session-section" style="margin-bottom: 32px;">
        <div class="section-title">${escapeHTML(s.title)}</div>
        <div class="photo-scroll-container" style="display: flex; gap: 12px; overflow-x: auto; padding: 12px 0; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; cursor: grab; user-select: none;">
          ${s.photos && s.photos.length > 0 
            ? s.photos.map(p => `
                <div class="card" style="padding: 0; overflow: hidden; width: 160px; height: 160px; flex-shrink: 0; position: relative; border: 1px solid var(--border); border-radius: 14px; cursor: pointer;">
                  <img onclick="openFullPhoto('${API_BASE.replace('/api', '')}${p.url}')" src="${API_BASE.replace('/api', '')}${p.thumbnailUrl || p.url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/160?text=Error'">
                  ${p.description ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 6px 8px; font-size: 10px; backdrop-filter: blur(4px); border-radius: 0 0 14px 14px;">${escapeHTML(p.description)}</div>` : ''}
                </div>
              `).join('')
            : '<div style="text-align: center; width: 100%; padding: 20px 0; color: var(--text3); font-size: 13px;">등록된 사진이 없습니다.</div>'
          }
        </div>
      </div>
    `).join('');

    // --- PC Mouse Drag Scroll Logic ---
    const containers = document.querySelectorAll('.photo-scroll-container');
    containers.forEach(el => {
      let isDown = false;
      let startX;
      let scrollLeft;

      el.addEventListener('mousedown', (e) => {
        isDown = true;
        el.style.cursor = 'grabbing';
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
      });

      el.addEventListener('mouseleave', () => {
        isDown = false;
        el.style.cursor = 'grab';
      });

      el.addEventListener('mouseup', () => {
        isDown = false;
        el.style.cursor = 'grab';
      });

      el.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        el.scrollLeft = scrollLeft - walk;
      });
    });

  } catch (e) {
    showToast('사진 정보를 불러오는데 실패했습니다.');
  }
}


async function openFullPhoto(url) {
  const overlay = document.getElementById("modal-photo-full");
  const img = document.getElementById("photo-full-img");
  if (!overlay || !img) return;
  
  img.src = url;
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");
}

window.openFullPhoto = openFullPhoto;

window.openPhotoModal = openPhotoModal;
