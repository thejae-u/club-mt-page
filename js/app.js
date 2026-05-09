// When hosting separately, you MUST use an absolute URL pointing to your backend.
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://api-mt.thejaeu.com/api';

// ===== FETCH DATA & UPDATE UI =====
async function updateDashboard() {
  const errorEl = document.getElementById('globalError');
  try {
    // 1. Fetch Site Settings
    const settingsRes = await fetch(`${API_BASE}/Settings`);
    if (!settingsRes.ok) throw new Error('Settings fetch failed');
    const settings = await settingsRes.json();
    window.siteSettings = settings;
    renderSettings(settings);

    // 2. Fetch Status
    const res = await fetch(`${API_BASE}/Management/status`);
    if (!res.ok) throw new Error('Status fetch failed');
    const data = await res.json();

    // If successful, ensure error overlay is hidden
    if (errorEl) errorEl.style.display = 'none';

    const { counts, expectations } = data;

    // Update Counts
    const totalCountEl = document.getElementById('totalCount');
    const remainCountEl = document.getElementById('remainCount');
    const genLabelEl = document.getElementById('genLabel');
    const armyLabelEl = document.getElementById('armyLabel');
    const armyMainLabelEl = document.getElementById('armyMainLabel');

    const s = window.siteSettings || {};
    const MAX_GEN = s.maxGeneralCapacity || 16;
    const MAX_ARMY = s.maxMilitaryCapacity || 4;
    const MAX_TOTAL = MAX_GEN + MAX_ARMY;

    const currentGen = counts.general;
    const currentArmy = counts.military;
    const currentTotal = counts.total;

    if (totalCountEl) totalCountEl.textContent = `${currentTotal}명`;
    if (remainCountEl) remainCountEl.textContent = `${Math.max(0, MAX_TOTAL - currentTotal)}명`;
    if (genLabelEl) genLabelEl.textContent = `${currentGen}명 / ${MAX_GEN}명`;
    if (armyLabelEl) armyLabelEl.textContent = `${currentArmy}명 / ${MAX_ARMY}명`;
    if (armyMainLabelEl) armyMainLabelEl.textContent = `${currentArmy}명 / ${MAX_ARMY}명`;
    
    // Update Progress Bars (Main Page)
    setBarW('barGen', Math.round((currentGen / MAX_GEN) * 100));
    setBarW('barArmy', Math.round((currentArmy / MAX_ARMY) * 100));
    setBarW('barArmyMain', Math.round((currentArmy / MAX_ARMY) * 100));

    // Update Status Modal
    const thermoContainer = document.getElementById('thermoRows');
    if (thermoContainer) {
      const MAX_GEN_DISPLAY = 7;
      const targetPerCohort = 4;
      
      // 1. Total Row
      const totalPct = Math.round((currentTotal / MAX_TOTAL) * 100);
      let thermoHtml = `
        <div class="cohort-thermo-row" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
          <div class="cohort-thermo-label" style="min-width: 40px; font-weight: 800; color: var(--blue-deep);">전체</div>
          <div class="thermo-track" style="height: 26px;">
            <div class="thermo-fill" id="thermo-total" style="width:0%; background: var(--blue);">
              <span class="thermo-count" style="font-size: 12px;">${currentTotal} / ${MAX_TOTAL}명</span>
            </div>
          </div>
          <div class="cohort-thermo-num" style="min-width: 40px; font-weight: 800; color: var(--blue-deep);">${totalPct}%</div>
        </div>
      `;

      // 2. Cohort Rows
      for (let i = 1; i <= MAX_GEN_DISPLAY; i++) {
        const count = data.cohortCounts[i] || 0;
        const cPct = Math.min(Math.round((count / targetPerCohort) * 100), 100);
        const color = thermoColor(cPct);
        thermoHtml += `
          <div class="cohort-thermo-row">
            <div class="cohort-thermo-label">${i}기</div>
            <div class="thermo-track">
              <div class="thermo-fill" id="thermo-${i}" style="width:0%; background:${color}">
                ${count > 0 ? `<span class="thermo-count">${count}명</span>` : ''}
              </div>
            </div>
            <div class="cohort-thermo-num">${count}명</div>
          </div>
        `;
      }

      // 3. Military Row
      const armyPct = Math.round((currentArmy / MAX_ARMY) * 100);
      thermoHtml += `
        <div class="cohort-thermo-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border);">
          <div class="cohort-thermo-label" style="min-width: 40px; color: var(--army);">군인</div>
          <div class="thermo-track">
            <div class="thermo-fill" id="thermo-army" style="width:0%; background: var(--army);">
              <span class="thermo-count">${currentArmy} / ${MAX_ARMY}명</span>
            </div>
          </div>
          <div class="cohort-thermo-num" style="min-width: 40px; color: var(--army);">${armyPct}%</div>
        </div>
      `;

      thermoContainer.innerHTML = thermoHtml;

      // Animate all bars
      setTimeout(() => {
        const totalEl = document.getElementById('thermo-total');
        if (totalEl) totalEl.style.width = `${totalPct}%`;
        
        for (let i = 1; i <= MAX_GEN_DISPLAY; i++) {
          const count = data.cohortCounts[i] || 0;
          const cPct = Math.min(Math.round((count / targetPerCohort) * 100), 100);
          const el = document.getElementById(`thermo-${i}`);
          if (el) el.style.width = `${cPct}%`;
        }
        
        const armyEl = document.getElementById('thermo-army');
        if (armyEl) armyEl.style.width = `${armyPct}%`;
      }, 100);
    }
    
    // Update Dynamic Labels
    const totalCapacityLabel = document.getElementById('totalCapacityLabel');
    if (totalCapacityLabel) totalCapacityLabel.textContent = ` / ${MAX_TOTAL}명 정원`;
    
    const modalTotalLabel = document.getElementById('modalTotalLabel');
    if (modalTotalLabel) modalTotalLabel.textContent = `총 정원 ${MAX_TOTAL}명 (군인 우선 ${MAX_ARMY}명 포함)`;

    // Update Army Modal Progress
    const barArmyModal = document.getElementById('barArmyModal');
    const armyModalLabel = document.getElementById('armyModalLabel');
    if (barArmyModal) setBarW('barArmyModal', Math.round((currentArmy / MAX_ARMY) * 100));
    if (armyModalLabel) armyModalLabel.textContent = `${currentArmy} / ${MAX_ARMY}명`;

    // Update Marquee (Expectations)
    const marqueeTrack = document.getElementById('marqueeTrack');
    const expectationSection = document.getElementById('expectationSection');
    if (marqueeTrack) {
      if (expectations.length === 0) {
        if (expectationSection) expectationSection.style.display = 'none';
        marqueeTrack.innerHTML = '';
      } else {
        if (expectationSection) expectationSection.style.display = 'block';
        // Repeat items enough times to fill the screen and animate smoothly
        const repeatCount = expectations.length < 5 ? 10 : 2; 
        const allExp = [];
        for (let i = 0; i < repeatCount; i++) {
          allExp.push(...expectations);
        }
        
        marqueeTrack.innerHTML = allExp.map(e => `
          <div class="exp-chip">
            ${e.text}
            <div class="exp-author">— ${e.author}</div>
          </div>
        `).join('');
        
        // Dynamic speed based on content length or just restart animation
        marqueeTrack.style.animation = 'none';
        marqueeTrack.offsetHeight; // trigger reflow
        const speed = expectations.length < 3 ? '40s' : '32s';
        marqueeTrack.style.animation = `marquee ${speed} linear infinite`;
        
        // Ensure the loop is seamless for any repeat count
        const halfWidth = 100 / repeatCount * (repeatCount / 2);
        marqueeTrack.style.setProperty('--marquee-end', `-${halfWidth}%`);
      }
    }

    // Update Cohort Table
    updateCohortTable();

    // Global counts for modal
    window.currentCounts = counts;

  } catch (err) {
    console.error('Error updating dashboard:', err);
    if (errorEl) {
      errorEl.style.display = 'flex';
    } else {
      showToast('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }
}

async function updateCohortTable() {
  const tableBody = document.querySelector('#cohortTable tbody');
  if (!tableBody) return;

  try {
    const res = await fetch(`${API_BASE}/Participants`);
    if (!res.ok) throw new Error('Failed to fetch participants');
    const members = await res.json();

    if (members.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text3);">등록된 동문 데이터가 없습니다.</td></tr>';
      return;
    }

    // Sort by Generation then Name
    members.sort((a, b) => a.generation - b.generation || a.name.localeCompare(b.name));

    tableBody.innerHTML = members.map(p => `
      <tr data-cohort-val="${p.generation}">
        <td>${p.generation}기</td>
        <td class="name-cell"><b>${p.name}</b>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error updating cohort table:', err);
  }
}

function setBarW(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transition = 'width .9s cubic-bezier(0.4,0,0.2,1)';
  el.style.width = Math.min(100, pct) + '%';
}

function toggleTransport(btn) {
  const row = btn.closest('.toggle-row');
  row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const isCar = btn.textContent.includes('자차');
  
  const section = btn.closest('.form-section');
  const noteC = section.querySelector('.transport-note-car');
  const noteP = section.querySelector('.transport-note-pub');
  
  if (noteC) noteC.style.display = isCar ? 'block' : 'none';
  if (noteP) noteP.style.display = isCar ? 'none' : 'block';
}

// Attach carpool listener
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('carpool-available')) {
    const numSel = e.target.closest('.carpool-row').querySelector('.carpool-num');
    if (numSel) numSel.style.display = e.target.value === 'yes' ? '' : 'none';
  }
});

// Thermo Color Helper
function thermoColor(pct) {
  if (pct <= 0) return '#EEF4FB';
  if (pct < 30) return '#94bfe2';
  if (pct < 50) return '#76aed9';
  if (pct < 75) return '#b0cfe8';
  return '#2e7ab0';
}

// ===== SUBMIT FORM =====
async function submitApplication(formId) {
  const formSection = document.getElementById(`form-${formId}`);
  const name = document.getElementById(`name${formId}`)?.value;
  const generation = parseInt(document.getElementById(`gen${formId}`)?.value) || 0;

  // Get phone number based on active form section
  const telInp = formSection.querySelector('input[type="tel"]');
  const phoneNumber = telInp ? telInp.value : "";
  
  const studentId = formSection.querySelector('input[placeholder*="2022"]')?.value;
  const participationCount = parseInt(formSection.querySelectorAll('select')[0]?.value) || 0;
  const memory = formSection.querySelector('textarea[placeholder*="자유롭게"]')?.value;
  const expectation = document.getElementById(`exp${formId}`)?.value;
  
  // Schedule, Transport logic
  const isMilitary = formId === 'AR';
  const transportBtn = formSection.querySelector('.toggle-row .toggle-btn.active');
  const transportation = transportBtn ? (transportBtn.textContent.includes('자차') ? 'Car' : 'Walk') : 'Car';
  
  const carpoolAvailable = formSection.querySelector('.carpool-available')?.value === 'yes';
  const carpoolSeats = parseInt(formSection.querySelector('.carpool-num')?.value) || 0;
  
  const passwordInp = document.getElementById(`pw${formId}`);
  const inputPassword = passwordInp ? passwordInp.value : "";
  
  const payload = {
    name: name,
    generation: generation,
    phoneNumber: phoneNumber,
    password: inputPassword || (window.editingPassword ? window.editingPassword : (phoneNumber.length >= 4 ? phoneNumber.slice(-4) : "")), 
    type: getParticipantType(window.curType),
    studentId: studentId,
    participationCount: participationCount,
    memoryOrExpectation: memory,
    oneLineExpectation: expectation,
    isMilitaryPriority: isMilitary,
    participationSchedule: "Full",
    transportation: transportation,
    isCarpoolAvailable: carpoolAvailable,
    carpoolSeats: carpoolSeats,
    departureArea: formSection.querySelector('input[placeholder*="출발 지역"]')?.value,
    allergies: formSection.querySelector('input[placeholder*="알레르기"]')?.value,
    remarks: formSection.querySelector('textarea[placeholder*="운영진에게"]')?.value,
    createdAt: new Date().toISOString()
  };

  if (!name) {
    showToast('이름을 입력해주세요.');
    return;
  }
  if (!generation) {
    showToast('기수를 선택해주세요.');
    return;
  }
  if (!phoneNumber) {
    showToast('연락처를 입력해주세요.');
    return;
  }

  try {
    const url = window.editingParticipantId 
                ? `${API_BASE}/Participants/${window.editingParticipantId}` 
                : `${API_BASE}/Participants`;
    const method = window.editingParticipantId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(window.editingParticipantId ? '✅ 정보가 수정되었습니다!' : '🎉 신청이 완료되었습니다!');
      closeModal('apply');
      window.editingParticipantId = null; // Reset
      window.editingPassword = null;
      updateDashboard();
    } else {
      const errorMsg = await res.text();
      if (res.status === 401) {
        showToast('❌ 비밀번호가 올바르지 않습니다.');
      } else if (res.status === 400) {
        showToast(`⚠️ ${errorMsg}`);
      } else {
        showToast('❌ 서버 오류가 발생했습니다.');
      }
    }
  } catch (err) {
    console.error('Submit error:', err);
    showToast('서버 연결 오류가 발생했습니다.');
  }
}

function getParticipantType(typeStr) {
  const map = { general: 0, army: 1 };
  return map[typeStr] ?? 0;
}

function renderSettings(s) {
  // Update Title
  const titleEl = document.querySelector('.hero h1');
  if (titleEl) {
    const parts = s.title.split(' ');
    const span = parts.pop();
    const main = parts.join(' ');
    titleEl.innerHTML = `${main}<br><span>${span}</span>`;
  }

  // Update Subtitle
  const subEl = document.querySelector('.hero-sub');
  if (subEl) subEl.textContent = s.subtitle;

  // Update Apply Modal Header
  const applyModalTitle = document.querySelector('#modal-apply .modal-title');
  const applyModalSub = document.querySelector('#modal-apply .modal-sub');
  if (applyModalTitle) applyModalTitle.textContent = `✍️ ${s.title} 신청서`;
  if (applyModalSub) applyModalSub.textContent = `${s.title} · ${s.eventDateRange}`;

  // Update Info Chips
  const chips = document.querySelectorAll('.info-chip');
  if (chips.length >= 3) {
    chips[0].textContent = `📅 ${s.eventDateRange}`;
    chips[1].textContent = `📍 ${s.location}`;
    chips[2].textContent = `💳 회비 ${s.registrationFee.toLocaleString()}원`;
  }

  // Update D-Day
  const ddayNumEl = document.getElementById('ddayNum');
  if (ddayNumEl) {
    const target = new Date(s.dDayTargetDate);
    const now = new Date();
    now.setHours(0,0,0,0);
    const diff = Math.ceil((target - now) / 86400000);
    ddayNumEl.textContent = diff > 0 ? diff : (diff === 0 ? '오늘!' : Math.abs(diff));
  }

  // Update Army Specifics
  const armyNoticeText = document.getElementById('armyNoticeText');
  if (armyNoticeText) {
    armyNoticeText.innerHTML = `🫡 군인 우선 예약으로 접수됩니다.<br>우선 배정 자리 ${s.maxMilitaryCapacity}석 중 선착순으로 신청 가능합니다.`;
  }
  const armyBenefitText = document.getElementById('armyBenefitText');
  if (armyBenefitText) {
    armyBenefitText.textContent = `선착순 마감과 관계없이 군인 우선 배정 — 별도 ${s.maxMilitaryCapacity}자리가 먼저 배정됩니다.`;
  }
  
  // Update Schedule
  try {
    const schedule = JSON.parse(s.scheduleDataJson || "[]");
    renderSchedule(schedule);
  } catch (e) {
    console.error('Schedule parse error:', e);
  }
}

function renderSchedule(data) {
  const cardsContainer = document.getElementById('scheduleCards');
  const modalsContainer = document.getElementById('dynamicModals');
  if (!cardsContainer || !modalsContainer) return;

  if (data.length === 0) {
    cardsContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text3); padding:20px;">일정이 아직 등록되지 않았습니다.</p>';
    modalsContainer.innerHTML = '';
    return;
  }

  // Render Cards
  cardsContainer.innerHTML = data.map((d, i) => `
    <div class="schedule-day" onclick="openModal('sched${i+1}')">
      <div class="day-emoji">${d.emoji}</div>
      <div class="day-badge">DAY ${i+1}</div>
      <h4>${d.date}</h4>
      <p>${d.summary}</p>
      <div class="schedule-tap">탭하여 자세히 →</div>
    </div>
  `).join('');

  // Render Modals
  modalsContainer.innerHTML = data.map((d, i) => `
    <div class="modal-overlay" id="modal-sched${i+1}" onclick="closeBg(event,'sched${i+1}')">
      <div class="modal-sheet">
        <div class="modal-handle"></div><button class="modal-close" onclick="closeModal('sched${i+1}')">✕</button>
        <div class="modal-title">${d.emoji} DAY ${i+1} — ${d.date}</div>
        <div class="modal-sub">${d.summary.replace(/<br>/g, ' · ')}</div>
        <div class="timeline-container">
          ${d.timeline.map((t, ti) => `
            <div class="tl-item">
              <div class="tl-time">${t.time}</div>
              <div class="tl-dots">
                <div class="tl-dot"></div>
                ${ti < d.timeline.length - 1 ? '<div class="tl-line"></div>' : ''}
              </div>
              <div class="tl-body">
                <h4>${t.title}</h4>
                <p>${t.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== UTILS =====
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== PARTICIPANT LOGIN & MY PAGE =====
async function doLogin() {
  const name = document.getElementById('login-name').value;
  const phoneNumber = document.getElementById('login-tel').value;
  const password = document.getElementById('login-password').value;

  if (!name || !phoneNumber || !password) {
    showToast('정보를 모두 입력해주세요.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/Participants/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phoneNumber, password })
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('participantToken', data.token);
      localStorage.setItem('participantName', data.name);
      window.editingPassword = password; 
      
      showToast(`${data.name}님, 환영합니다!`);
      closeModal('login');
      updateAuthUI();
      openMyPage();
    } else {
      const msg = await res.text();
      showToast(`❌ 로그인 실패: ${msg}`);
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('서버 연결 오류가 발생했습니다.');
  }
}

function updateAuthUI() {
  const token = localStorage.getItem('participantToken');
  const loginBtn = document.getElementById('btnLoginOpen');
  const mypageBtn = document.getElementById('btnMyPageOpen');
  
  if (token) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (mypageBtn) mypageBtn.style.display = 'block';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (mypageBtn) mypageBtn.style.display = 'none';
  }
}

async function openMyPage() {
  const token = localStorage.getItem('participantToken');
  if (!token) {
    openModal('login');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/Participants/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const p = await res.json();
      window.currentParticipant = p;
      
      const mypageNameGen = document.getElementById('mypage-name-gen');
      if (mypageNameGen) mypageNameGen.textContent = `${p.generation}기 ${p.name}님 안녕하세요!`;
      
      const depositEl = document.getElementById('mypage-deposit-status');
      if (depositEl) {
          if (p.isDepositConfirmed) {
            depositEl.textContent = '✅ 입금 확인 완료';
            depositEl.style.color = '#22C55E';
          } else {
            depositEl.textContent = '⏳ 입금 대기 중';
            depositEl.style.color = '#F5A623';
          }
      }

      renderChecklist(p.checklistJson);
      openModal('mypage');
    } else {
      logout();
      showToast('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  } catch (err) {
    console.error('MyPage error:', err);
  }
}

function renderChecklist(json) {
  const container = document.getElementById('checklist-container');
  if (!container) return;

  const defaultList = [
    { text: '회비 입금하기 (5만원)', done: false },
    { text: '준비물 챙기기 (세면도구 등)', done: false },
    { text: '카풀/이동수단 확정하기', done: false }
  ];
  
  let list = defaultList;
  try {
    if (json) list = JSON.parse(json);
  } catch(e) {}

  container.innerHTML = list.map((item, i) => `
    <div class="card" style="padding:12px; display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="toggleCheck(${i})">
      <div style="width:20px; height:20px; border:2px solid ${item.done ? 'var(--blue)' : 'var(--border)'}; border-radius:4px; display:flex; align-items:center; justify-content:center; background:${item.done ? 'var(--blue)' : 'transparent'}; color:white; font-size:12px;">
        ${item.done ? '✓' : ''}
      </div>
      <span style="font-size:14px; text-decoration:${item.done ? 'line-through' : 'none'}; color:${item.done ? 'var(--text3)' : 'var(--text)'}">${item.text}</span>
    </div>
  `).join('');
  
  window.currentChecklist = list;
}

async function toggleCheck(index) {
  const list = window.currentChecklist;
  list[index].done = !list[index].done;
  renderChecklist(JSON.stringify(list));

  const token = localStorage.getItem('participantToken');
  try {
    await fetch(`${API_BASE}/Participants/me/checklist`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(JSON.stringify(list))
    });
  } catch(e) {}
}

async function openEditFromMyPage() {
    const p = window.currentParticipant;
    const password = window.editingPassword;

    if (!p || !password) {
        showToast('세션 정보가 부족합니다. 다시 로그인해주세요.');
        return;
    }

    window.editingParticipantId = p.id;
    window.editingPassword = password;
    
    closeModal('mypage');
    
    document.getElementById('btnCancelSL').style.display = 'block';
    document.getElementById('btnCancelAR').style.display = 'block';

    openModal('apply');
    
    // Type 0 is General (SL), Type 1 is Military (AR)
    const typeStr = p.type === 0 ? 'general' : 'army';
    const btns = document.querySelectorAll('.type-btn');
    if (btns.length >= 2) {
      const targetBtn = p.type === 0 ? btns[0] : btns[1];
      switchType(targetBtn, typeStr);
    }

    const fId = typeMap[typeStr];
    const formSection = document.getElementById(`form-${fId}`);
    if (formSection) {
      const resDetail = await fetch(`${API_BASE}/Participants/${p.id}`, {
        headers: { 'X-Participant-Password': password }
      });
      const detail = await resDetail.json();

      const nameInp = document.getElementById(`name${fId}`);
      if (nameInp) nameInp.value = detail.name;
      const genSel = document.getElementById(`gen${fId}`);
      if (genSel) genSel.value = detail.generation;
      const telInp = document.getElementById(`tel${fId}`);
      if (telInp) telInp.value = detail.phoneNumber;
      
      const stdIdInp = formSection.querySelector('input[placeholder*="학번"]');
      if (stdIdInp) stdIdInp.value = detail.studentId || "";
      const countSelect = formSection.querySelectorAll('select')[0];
      if (countSelect) countSelect.selectedIndex = detail.participationCount;
      const memoInp = formSection.querySelector('textarea[placeholder*="기억에 남는"]');
      if (memoInp) memoInp.value = detail.memoryOrExpectation || "";
      const expInp = document.getElementById(`exp${fId}`);
      if (expInp) expInp.value = detail.oneLineExpectation || "";
    }
}

function logout() {
  localStorage.removeItem('participantToken');
  localStorage.removeItem('participantName');
  window.editingPassword = null;
  window.currentParticipant = null;
  closeModal('mypage');
  updateAuthUI();
  showToast('로그아웃 되었습니다.');
}

// ===== CANCEL REGISTRATION =====
async function cancelRegistration() {
  if (!window.editingParticipantId || !window.editingPassword) return;
  
  if (!confirm('정말로 신청을 취소하시겠습니까?')) return;

  try {
    const res = await fetch(`${API_BASE}/Participants/${window.editingParticipantId}/cancel`, {
      method: 'POST',
      headers: { 'X-Participant-Password': window.editingPassword }
    });

    if (res.ok) {
      showToast('✅ 신청이 취소되었습니다.');
      closeModal('apply');
      window.editingParticipantId = null;
      window.editingPassword = null;
      updateDashboard();
      logout();
    } else {
      const msg = await res.text();
      showToast(`❌ 취소 실패: ${msg}`);
    }
  } catch (err) {
    console.error('Cancel error:', err);
    showToast('서버 연결 오류가 발생했습니다.');
  }
}

// Attach to global
window.doSubmit = submitApplication;
window.updateDashboard = updateDashboard;
window.doLogin = doLogin;
window.openMyPage = openMyPage;
window.toggleCheck = toggleCheck;
window.openEditFromMyPage = openEditFromMyPage;
window.logout = logout;
window.cancelRegistration = cancelRegistration;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  updateAuthUI();
});
