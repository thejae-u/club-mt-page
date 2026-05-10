// When hosting separately, you MUST use an absolute URL pointing to your backend.
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://api-mt.thejaeu.com/api';

// ===== FETCH DATA & UPDATE UI =====
async function updateDashboard() {
  const errorEl = document.getElementById('globalError');
  try {
    // 1. Fetch Site Settings
    const settingsRes = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
    if (!settingsRes.ok) throw new Error('Settings fetch failed');
    const settings = await settingsRes.json();
    window.siteSettings = settings;
    renderSettings(settings);

    // 2. Fetch Status
    const res = await fetch(`${API_BASE}/Management/status`, { credentials: 'include' });
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
    const MAX_GEN = (s.maxGeneralCapacity !== undefined) ? s.maxGeneralCapacity : 16;
    const MAX_ARMY = (s.maxMilitaryCapacity !== undefined) ? s.maxMilitaryCapacity : 4;
    const MAX_TOTAL = MAX_GEN + MAX_ARMY;

    // Backend returns confirmed counts for these specific properties
    const confirmedGen = (counts.student || 0) + (counts.alumni || 0) + (counts.leave || 0) + (counts.other || 0);
    const confirmedArmy = counts.military || 0;
    const confirmedTotal = confirmedGen + confirmedArmy;

    const currentWaitlisted = counts.waitlisted || 0;
    const totalRegistered = counts.total || 0; // confirmed + waitlisted

    if (totalCountEl) {
        totalCountEl.textContent = `${totalRegistered}명`;
        if (currentWaitlisted > 0) {
            totalCountEl.innerHTML += ` <span style="font-size:12px; color:#E5484D; font-weight:600;">(대기 ${currentWaitlisted}명)</span>`;
        }
    }
    
    if (remainCountEl) {
        const waitlistedGen = counts.waitlistedGeneral || 0;
        const waitlistedArmy = counts.waitlistedMilitary || 0;
        
        if (waitlistedGen > 0 || waitlistedArmy > 0) {
            remainCountEl.textContent = `0명 (대기 발생)`;
        } else {
            const remaining = Math.max(0, MAX_TOTAL - confirmedTotal);
            remainCountEl.textContent = `${remaining}명`;
        }
    }

    if (genLabelEl) genLabelEl.textContent = `${confirmedGen}명 / ${MAX_GEN}명`;
    if (armyLabelEl) armyLabelEl.textContent = `${confirmedArmy}명 / ${MAX_ARMY}명`;
    if (armyMainLabelEl) armyMainLabelEl.textContent = `${confirmedArmy}명 / ${MAX_ARMY}명`;
    
    // Update Progress Bars - Cap at 100%
    setBarW('barGen', Math.min(100, Math.round((confirmedGen / (MAX_GEN || 1)) * 100)));
    setBarW('barArmy', Math.min(100, Math.round((confirmedArmy / (MAX_ARMY || 1)) * 100)));
    setBarW('barArmyMain', Math.min(100, Math.round((confirmedArmy / (MAX_ARMY || 1)) * 100)));

    // Update Status Modal
    const thermoContainer = document.getElementById('thermoRows');
    if (thermoContainer) {
      const MAX_GEN_DISPLAY = 7;
      const targetPerCohort = 4;
      
      const MAX_GEN_VAL = (s.maxGeneralCapacity !== undefined) ? s.maxGeneralCapacity : 16;
      const MAX_ARMY_VAL = (s.maxMilitaryCapacity !== undefined) ? s.maxMilitaryCapacity : 4;
      const MAX_TOTAL_VAL = MAX_GEN_VAL + MAX_ARMY_VAL;

      // 1. Total Row
      const totalPct = MAX_TOTAL_VAL > 0 ? Math.min(100, Math.round((confirmedTotal / MAX_TOTAL_VAL) * 100)) : 0;
      let thermoHtml = `
        <div class="cohort-thermo-row" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
          <div class="cohort-thermo-label" style="min-width: 40px; font-weight: 800; color: var(--blue-deep);">전체</div>
          <div class="thermo-track" style="height: 26px;">
            <div class="thermo-fill" id="thermo-total" style="width:0%; background: var(--blue);">
              <span class="thermo-count" style="font-size: 12px;">${confirmedTotal} / ${MAX_TOTAL_VAL}명</span>
            </div>
          </div>
          <div class="cohort-thermo-num" style="min-width: 40px; font-weight: 800; color: var(--blue-deep);">${totalPct}%</div>
        </div>
      `;

      // 2. Cohort Rows
      for (let i = 1; i <= MAX_GEN_DISPLAY; i++) {
        const count = data.cohortCounts[i] || 0;
        const cPct = Math.min(100, Math.round((count / targetPerCohort) * 100));
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
      const armyPct = MAX_ARMY_VAL > 0 ? Math.min(100, Math.round((confirmedArmy / MAX_ARMY_VAL) * 100)) : 0;
      thermoHtml += `
        <div class="cohort-thermo-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border);">
          <div class="cohort-thermo-label" style="min-width: 40px; color: var(--army);">군인</div>
          <div class="thermo-track">
            <div class="thermo-fill" id="thermo-army" style="width:0%; background: var(--army);">
              <span class="thermo-count">${confirmedArmy} / ${MAX_ARMY_VAL}명</span>
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
    if (barArmyModal) setBarW('barArmyModal', Math.round((confirmedArmy / MAX_ARMY) * 100));
    if (armyModalLabel) armyModalLabel.textContent = `${confirmedArmy} / ${MAX_ARMY}명`;

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
    // updateCohortTable(); // DEFERRED: Now called only when user clicks "Check Peer/Generation"

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

  // Caching: If data already exists, don't fetch again
  if (window.cachedMembers && window.cachedMembers.length > 0) {
    renderMembers(window.cachedMembers);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/Management/members`, { credentials: 'include' });
    if (!res.ok) {
        if (res.status === 401) {
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 20px; color: var(--text3);">로그인이 필요한 서비스입니다.</td></tr>';
        }
        return;
    }
    const members = await res.json();
    window.cachedMembers = members;
    renderMembers(members);
  } catch (err) {
    console.error('Error updating cohort table:', err);
  }
}

function renderMembers(members) {
  const tableBody = document.querySelector('#cohortTable tbody');
  if (!tableBody) return;

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
}

async function updateFeeTable() {
  const tableBody = document.querySelector('#feeTable tbody');
  const expenseEl = document.getElementById('fee-expense');
  if (!tableBody) return;

  try {
    const [resList, resSummary] = await Promise.all([
      fetch(`${API_BASE}/Fee`, { credentials: 'include' }),
      fetch(`${API_BASE}/Fee/summary`, { credentials: 'include' })
    ]);

    if (resList.ok) {
      const fees = await resList.json();
      if (fees.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 20px; color: var(--text3);">등록된 지출 내역이 없습니다.</td></tr>';
      } else {
        tableBody.innerHTML = fees.map(f => `
          <tr>
            <td>
              <div style="font-weight:600;">${f.description}</div>
              <div style="font-size:10px; color:var(--text3);">${f.category}</div>
            </td>
            <td style="text-align:right; font-weight:700; color:#E5484D">
              ${Math.abs(f.amount).toLocaleString()}원
            </td>
          </tr>
        `).join('');
      }
    }

    if (resSummary.ok) {
      const summary = await resSummary.json();
      if (expenseEl) expenseEl.textContent = `${summary.totalExpense.toLocaleString()}원`;
    }
  } catch (err) {
    console.error('Error updating fee table:', err);
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

function toggleLicense(btn, fId) {
  const row = btn.closest('.toggle-row');
  row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const hasLicense = btn.textContent.includes('소지') && !btn.textContent.includes('미소지');
  const sub = document.getElementById(`license-detail-${fId}`);
  if (sub) sub.classList.toggle('show', hasLicense);
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
  
  // Driving Logic
  const licenseBtn = formSection.querySelector('button[onclick*="toggleLicense"].active');
  const hasDriverLicense = licenseBtn ? licenseBtn.textContent.includes('소지') && !licenseBtn.textContent.includes('미소지') : false;
  const driverLicenseType = formSection.querySelector('.license-type')?.value;
  const canDrive = formSection.querySelector('.can-drive')?.value === 'yes';
  const drivingExperience = formSection.querySelector('.driving-exp')?.value;

  // Military Priority and Status
  const priorityVal = document.getElementById('priorityAR')?.value;
  const statusVal = document.getElementById('statusAR')?.value;

  const passwordInp = document.getElementById(`pw${formId}`);
  const currentPasswordInp = document.getElementById(`pwCurrent${formId}`);
  const newPasswordInp = document.getElementById(`pwNew${formId}`);
  
  let finalPassword = "";
  let currentPassword = "";
  
  if (window.editingParticipantId) {
    currentPassword = currentPasswordInp ? currentPasswordInp.value : "";
    finalPassword = (newPasswordInp && newPasswordInp.value) ? newPasswordInp.value : "";
  } else {
    finalPassword = passwordInp ? passwordInp.value : "";
  }
  
  const payload = {
    name: name,
    generation: generation,
    phoneNumber: phoneNumber,
    password: finalPassword || (window.editingPassword && !window.editingParticipantId ? window.editingPassword : ""), 
    currentPassword: currentPassword,
    type: getParticipantType(window.curType),
    studentId: studentId,
    participationCount: participationCount,
    memoryOrExpectation: memory,
    oneLineExpectation: expectation,
    hasDriverLicense: hasDriverLicense,
    driverLicenseType: driverLicenseType,
    canDrive: canDrive,
    drivingExperience: drivingExperience,
    isMilitaryPriority: priorityVal === 'yes',
    militaryStatus: statusVal,
    participationSchedule: "Full",
    transportation: transportation,
    isCarpoolAvailable: carpoolAvailable,
    carpoolSeats: carpoolSeats,
    departureArea: formSection.querySelector('input[placeholder*="출발 지역"]')?.value,
    allergies: formSection.querySelector('input[placeholder*="알레르기"]')?.value,
    remarks: formSection.querySelector('textarea[placeholder*="운영진에게"]')?.value,
    createdAt: new Date().toISOString(),
    isRegistered: true // Ensure it's true when applying/editing
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
  
  if (window.editingParticipantId && !currentPassword) {
    showToast('본인 확인을 위해 기존 비밀번호를 입력해주세요.');
    return;
  }

  // Validate Student ID only if visible
  const isStdIdRequired = (window.curType === 'student' || window.curType === 'leave' || window.curType === 'army');
  if (isStdIdRequired && !studentId) {
    showToast('학번을 입력해주세요.');
    return;
  }
  
  if (isMilitary) {
    if (!priorityVal) {
      showToast('군인 우대 신청 여부를 선택해주세요.');
      return;
    }
    if (!statusVal) {
      showToast('현재 상태(휴가 등)를 선택해주세요.');
      return;
    }
  }

  try {
    const url = window.editingParticipantId 
                ? `${API_BASE}/Participants/${window.editingParticipantId}` 
                : `${API_BASE}/Participants`;
    const method = window.editingParticipantId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    if (res.ok) {
      if (method === 'PUT') {
        const result = await res.json().catch(() => ({}));
        if (result.passwordChanged) {
          showToast('✅ 비밀번호가 변경되었습니다. 다시 로그인해주세요.');
          logout();
          return;
        }
      }
      showToast(window.editingParticipantId ? '✅ 정보가 수정되었습니다!' : '🎉 신청이 완료되었습니다!');
      closeModal('apply');
      
      // Only clear if NOT editing (new application)
      if (!window.editingParticipantId) {
        window.editingPassword = null; 
      }
      window.editingParticipantId = null; // Reset the "current edit" target after closing
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
  const map = { student: 0, grad: 1, leave: 2, army: 3, etc: 4 };
  return map[typeStr] ?? 0;
}

function renderSettings(s) {
  // Update Title (Highlight "총동문 MT")
  const titleEl = document.querySelector('.hero h1');
  if (titleEl) {
    const fullTitle = s.title || "제 0회 빅이큐 총동문 MT";
    // Find the split point: keep everything before "총동문" as main, highlight from "총동문" onwards
    if (fullTitle.includes("총동문")) {
        const parts = fullTitle.split("총동문");
        const main = parts[0].trim();
        const highlight = "총동문 " + (parts[1] || "").trim();
        titleEl.innerHTML = `${main}<br><span>${highlight}</span>`;
    } else {
        // Fallback for different title structures
        const parts = fullTitle.split(' ');
        const span = parts.pop();
        const main = parts.join(' ');
        titleEl.innerHTML = `${main}<br><span>${span}</span>`;
    }
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
    
    // Update Location chip
    chips[1].innerHTML = `📍 ${s.location} <span style="font-size:10px; opacity:0.7; margin-left:2px;">▶</span>`;
    chips[1].style.cursor = 'pointer';
    chips[1].onclick = () => { if (window.openLocationModal) window.openLocationModal(); };
    chips[1].title = "클릭하여 장소 상세 보기";

    // Make the Fee chip act as a button
    chips[2].innerHTML = `💳 회비 ${s.registrationFee.toLocaleString()}원 <span style="font-size:10px; opacity:0.7; margin-left:2px;">▶</span>`;
    chips[2].style.cursor = 'pointer';
    chips[2].onclick = () => {
      if (window.openFeeModal) window.openFeeModal();
    };
    chips[2].title = "클릭하여 회비 지출 내역 보기";
  }

  // Update MT D-Day
  const mtDDayBlock = document.getElementById('mtDDayBlock');
  const ddayNumEl = document.getElementById('ddayNum');
  if (mtDDayBlock && ddayNumEl) {
    if (s.dDayTargetDate && s.dDayTargetDate !== "0001-01-01T00:00:00") {
      const target = new Date(s.dDayTargetDate);
      const now = new Date();
      now.setHours(0,0,0,0);
      const diff = Math.ceil((target - now) / 86400000);
      
      if (diff >= 0) {
        ddayNumEl.textContent = diff === 0 ? '오늘!' : diff;
        mtDDayBlock.style.display = 'inline-flex';
      } else {
        mtDDayBlock.style.display = 'none';
      }
    } else {
      mtDDayBlock.style.display = 'none';
    }
  }

  // Update Deadline D-Day
  const deadlineBlock = document.getElementById('deadlineBlock');
  const ddayDeadlineEl = document.getElementById('ddayDeadline');
  let isDeadlinePassed = false;

  if (deadlineBlock && ddayDeadlineEl) {
    if (s.registrationDeadline && s.registrationDeadline !== "0001-01-01T00:00:00") {
      const target = new Date(s.registrationDeadline);
      const now = new Date();
      now.setHours(0,0,0,0);
      const diff = Math.ceil((target - now) / 86400000);
      
      if (diff >= 0) {
        ddayDeadlineEl.textContent = diff === 0 ? '오늘!' : diff;
        deadlineBlock.style.display = 'inline-flex';
      } else {
        deadlineBlock.style.display = 'none';
        isDeadlinePassed = true;
      }
    } else {
      deadlineBlock.style.display = 'none';
    }
  }

  // Disable Registration/Editing if deadline passed
  const btnApply = document.getElementById('btnApply');
  const btnEditInfo = document.getElementById('btnEditInfo');
  const btnMyPageEdit = document.getElementById('btnMyPageEdit');

  if (isDeadlinePassed) {
    if (btnApply) {
      btnApply.onclick = null;
      btnApply.textContent = '❌ 신청 마감';
      btnApply.style.background = 'var(--border)';
      btnApply.style.color = 'var(--text3)';
      btnApply.style.cursor = 'not-allowed';
      btnApply.style.boxShadow = 'none';
    }
    if (btnEditInfo) {
      btnEditInfo.onclick = null;
      btnEditInfo.textContent = '🔒 수정 불가';
      btnEditInfo.style.background = 'var(--border)';
      btnEditInfo.style.color = 'var(--text3)';
      btnEditInfo.style.cursor = 'not-allowed';
      btnEditInfo.style.boxShadow = 'none';
    }
    if (btnMyPageEdit) {
      btnMyPageEdit.onclick = null;
      btnMyPageEdit.textContent = '🔒 수정 불가 (마감)';
      btnMyPageEdit.style.background = 'var(--border)';
      btnMyPageEdit.style.color = 'var(--text3)';
      btnMyPageEdit.style.cursor = 'not-allowed';
    }
  }

  const MAX_ARMY = (s.maxMilitaryCapacity !== undefined) ? s.maxMilitaryCapacity : 4;

  // Update Army Specifics
  const armyNoticeText = document.getElementById('armyNoticeText');
  if (armyNoticeText) {
    armyNoticeText.innerHTML = `🫡 군인 우선 예약으로 접수됩니다.<br>우선 배정 자리 ${MAX_ARMY}석 중 선착순으로 신청 가능합니다.`;
  }
  const armyBenefitText = document.getElementById('armyBenefitText');
  if (armyBenefitText) {
    armyBenefitText.textContent = `선착순 마감과 관계없이 군인 우선 배정 — 별도 ${MAX_ARMY}자리가 먼저 배정됩니다.`;
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
  const password = document.getElementById('login-password').value;

  if (!name || !password) {
    showToast('정보를 모두 입력해주세요.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/Participants/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
      credentials: 'include'
    });

    if (res.ok) {
      const data = await res.json();
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
  const name = localStorage.getItem('participantName');
  const loginBtn = document.getElementById('btnLoginOpen');
  const mypageBtn = document.getElementById('btnMyPageOpen');
  const applyBtn = document.getElementById('btnApply');
  const editInfoBtn = document.getElementById('btnEditInfo');
  
  if (name) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (mypageBtn) mypageBtn.style.display = 'block';
    if (applyBtn) applyBtn.style.display = 'none';
    if (editInfoBtn) editInfoBtn.style.display = 'inline-flex';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (mypageBtn) mypageBtn.style.display = 'none';
    if (applyBtn) applyBtn.style.display = 'inline-flex';
    if (editInfoBtn) editInfoBtn.style.display = 'none';
  }
}

async function openMyPage() {
  try {
    const res = await fetch(`${API_BASE}/Participants/me`, { credentials: 'include' });

    if (res.ok) {
      const p = await res.json();
      window.currentParticipant = p;
      
      const mypageNameGen = document.getElementById('mypage-name-gen');
      if (mypageNameGen) mypageNameGen.textContent = `${p.generation}기 ${p.name}님 안녕하세요!`;
      
      const depositEl = document.getElementById('mypage-deposit-status');
      const depositCard = depositEl ? depositEl.closest('.card') : null;
      const btnEdit = document.getElementById('btnMyPageEdit');
      const btnCancel = document.getElementById('btnMyPageCancel');
      const checklistTitle = document.querySelector('#modal-mypage .section-title');
      const checklistContainer = document.getElementById('checklist-container');

      if (depositEl) {
          if (p.isWaitlisted) {
            // WAITLISTED MODE
            depositEl.innerHTML = '⏳ 신청 대기 중';
            depositEl.style.color = '#E5484D';
            if (depositCard) {
              depositCard.style.borderLeftColor = '#E5484D';
              // Keep only the status text, hide '입금 확인 상태' label for waitlist
              const label = depositCard.querySelector('div[style*="font-size:12px"]');
              if (label) label.textContent = '현재 상태';
            }
            
            // Hide Checklist for waitlisted
            if (checklistTitle) checklistTitle.style.display = 'none';
            if (checklistContainer) checklistContainer.style.display = 'none';

            // Hide Edit, Show Cancel only
            if (btnEdit) btnEdit.style.display = 'none';
            if (btnCancel) btnCancel.style.display = 'block';
          } else {
            // CONFIRMED MODE (Registered)
            if (checklistTitle) checklistTitle.style.display = 'block';
            if (checklistContainer) checklistContainer.style.display = 'flex';

            if (btnEdit) btnEdit.style.display = 'block';
            if (btnCancel) btnCancel.style.display = 'none';

            if (p.isDepositConfirmed) {
              depositEl.textContent = '✅ 입금 확인 완료';
              depositEl.style.color = '#22C55E';
              if (depositCard) depositCard.style.borderLeftColor = '#22C55E';
            } else {
              depositEl.textContent = '⏳ 입금 대기 중';
              depositEl.style.color = '#F5A623';
              if (depositCard) depositCard.style.borderLeftColor = '#F5A623';
            }
            // Restore label
            const label = depositCard ? depositCard.querySelector('div') : null;
            if (label && label.textContent === '현재 상태') label.textContent = '입금 확인 상태';
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

  let list = [];
  try {
    if (json) list = JSON.parse(json);
  } catch(e) {}

  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text3); font-size:13px;">체크리스트가 비어있습니다.</div>';
    window.currentChecklist = [];
    return;
  }

  container.innerHTML = list.map((item, i) => `
    <div class="card" style="padding:12px; display:flex; align-items:center; gap:12px; cursor:pointer; transition: transform 0.1s;">
      <div onclick="toggleCheck(${i})" style="width:20px; height:20px; border:2px solid ${item.done ? 'var(--blue)' : 'var(--border)'}; border-radius:4px; display:flex; align-items:center; justify-content:center; background:${item.done ? 'var(--blue)' : 'transparent'}; color:white; font-size:12px; flex-shrink:0;">
        ${item.done ? '✓' : ''}
      </div>
      <span onclick="toggleCheck(${i})" style="flex:1; font-size:14px; text-decoration:${item.done ? 'line-through' : 'none'}; color:${item.done ? 'var(--text3)' : 'var(--text)'}">${item.text}</span>
      <button onclick="removeChecklistItem(${i})" style="background:var(--bg3); border:none; color:#E5484D; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition: background 0.2s;" title="삭제">✕</button>
    </div>
  `).join('');
  
  window.currentChecklist = list;
}

async function saveChecklist(list) {
  try {
    await fetch(`${API_BASE}/Participants/me/checklist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(list)),
      credentials: 'include'
    });
  } catch(e) {
    console.error('Checklist save error:', e);
  }
}

async function addChecklistItem() {
  const input = document.getElementById('checklist-input');
  const text = input.value.trim();
  if (!text) return;

  const list = window.currentChecklist || [];
  list.push({ text, done: false });
  input.value = '';
  renderChecklist(JSON.stringify(list));
  await saveChecklist(list);
}

async function removeChecklistItem(index) {
  const list = window.currentChecklist;
  if (!list) return;
  list.splice(index, 1);
  renderChecklist(JSON.stringify(list));
  await saveChecklist(list);
}

async function toggleCheck(index) {
  const list = window.currentChecklist;
  if (!list) return;
  list[index].done = !list[index].done;
  renderChecklist(JSON.stringify(list));
  await saveChecklist(list);
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
    
    // Show personalized header and hide type selection
    const editHeader = document.getElementById('editHeader');
    const editHeaderInfo = document.getElementById('editHeaderInfo');
    const typeSelectionArea = document.getElementById('typeSelectionArea');
    
    if (editHeader && editHeaderInfo && typeSelectionArea) {
      const typeLabels = ['재학생', '졸업생', '휴학생', '군인', '기타'];
      const typeLabel = typeLabels[p.type] || '회원';
      editHeaderInfo.textContent = `[${typeLabel}] ${p.name} (${p.generation}기)`;
      editHeader.style.display = 'flex';
      typeSelectionArea.style.display = 'none';
    }

    // Toggle Password Fields for Edit Mode
    ['SL', 'AR'].forEach(fId => {
      const pwEdit = document.getElementById(`pwEditFields${fId}`);
      const pwNormal = document.getElementById(`pw${fId}`);
      const pwLabel = document.getElementById(`pwLabel${fId}`);
      if (pwEdit) pwEdit.style.display = 'flex';
      if (pwNormal) pwNormal.style.display = 'none';
      if (pwLabel) pwLabel.textContent = '비밀번호 변경 및 확인 🔒';
    });

    openModal('apply');
    
    // Type 3 is Military (AR) in the new order: Student(0), Alumni(1), Leave(2), Military(3), Other(4)
    const isMilitary = p.type === 3;
    const typeStr = isMilitary ? 'army' : 
                   (p.type === 0 ? 'student' : 
                   (p.type === 1 ? 'grad' : 
                   (p.type === 2 ? 'leave' : 'etc')));
                   
    const btns = document.querySelectorAll('.type-btns .type-btn');
    const btnIndexMap = { student: 0, grad: 1, leave: 2, army: 3, etc: 4 };
    const targetBtn = btns[btnIndexMap[typeStr]];
    if (targetBtn) {
      // Need to call the global switchType defined in index.html
      if (window.switchType) window.switchType(targetBtn, typeStr);
      else {
        // Fallback if not on window
        btns.forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        window.curType = typeStr;
      }
    }

    const fId = typeMap[typeStr];
    const formSection = document.getElementById(`form-${fId}`);
    if (formSection) {
      const resDetail = await fetch(`${API_BASE}/Participants/${p.id}`, { credentials: 'include' });
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

      // Populate Driving Specifics
      const licenseBtns = formSection.querySelectorAll('button[onclick*="toggleLicense"]');
      if (licenseBtns.length >= 2) {
        const hasLicense = detail.hasDriverLicense;
        licenseBtns[0].classList.toggle('active', hasLicense);
        licenseBtns[1].classList.toggle('active', !hasLicense);
        const sub = document.getElementById(`license-detail-${fId}`);
        if (sub) sub.classList.toggle('show', hasLicense);
      }
      const typeSel = formSection.querySelector('.license-type');
      if (typeSel) typeSel.value = detail.driverLicenseType || "";
      const canDriveSel = formSection.querySelector('.can-drive');
      if (canDriveSel) canDriveSel.value = detail.canDrive ? "yes" : "no";
      const expInpDrive = formSection.querySelector('.driving-exp');
      if (expInpDrive) expInpDrive.value = detail.drivingExperience || "";

      // Populate Military Specifics
      if (fId === 'AR') {
        const prioritySel = document.getElementById('priorityAR');
        if (prioritySel) prioritySel.value = detail.isMilitaryPriority ? 'yes' : 'no';
        const statusSel = document.getElementById('statusAR');
        if (statusSel) statusSel.value = detail.militaryStatus || "";
      }
    }
}

function logout() {
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(e => {});

  localStorage.removeItem('participantName');
  window.editingPassword = null;
  window.currentParticipant = null;
  window.editingParticipantId = null; // Clear edit ID
  
  resetApplyForm(); // Clear all form fields
  
  closeModal('mypage');
  updateAuthUI();
  showToast('로그아웃 되었습니다.');
}

function resetApplyForm() {
  const modal = document.getElementById('modal-apply');
  if (!modal) return;
  
  // Clear all inputs, textareas, and selects
  modal.querySelectorAll('input').forEach(i => {
    if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
    else i.value = '';
  });
  modal.querySelectorAll('textarea').forEach(t => t.value = '');
  modal.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  
  // Reset toggles (Schedule, Transport) to defaults
  modal.querySelectorAll('.toggle-btn').forEach(btn => {
    const isDefault = btn.textContent.includes('전일정') || btn.textContent.includes('자차');
    btn.classList.toggle('active', isDefault);
  });
  
  // Hide sub-inputs
  const slJoin = document.getElementById('sl-join');
  if (slJoin) slJoin.classList.remove('show');
  const arJoin = document.getElementById('ar-join');
  if (arJoin) arJoin.classList.remove('show');
  
  // Reset transport notes visibility
  const carNotes = modal.querySelectorAll('.transport-note-car');
  const pubNotes = modal.querySelectorAll('.transport-note-pub');
  carNotes.forEach(n => n.style.display = 'block');
  pubNotes.forEach(n => n.style.display = 'none');
  
  // Ensure default form type is shown (Student)
  const btns = document.querySelectorAll('.type-btns .type-btn');
  if (btns.length > 0) switchType(btns[0], 'student');

  // Reset License Toggles
  modal.querySelectorAll('button[onclick*="toggleLicense"]').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes('미소지'));
  });
  const slLicenseDetail = document.getElementById('license-detail-SL');
  if (slLicenseDetail) slLicenseDetail.classList.remove('show');
  const arLicenseDetail = document.getElementById('license-detail-AR');
  if (arLicenseDetail) arLicenseDetail.classList.remove('show');

  // Reset Password Fields to Apply State
  ['SL', 'AR'].forEach(fId => {
    const pwEdit = document.getElementById(`pwEditFields${fId}`);
    const pwNormal = document.getElementById(`pw${fId}`);
    const pwLabel = document.getElementById(`pwLabel${fId}`);
    if (pwEdit) pwEdit.style.display = 'none';
    if (pwNormal) pwNormal.style.display = 'block';
    if (pwLabel) pwLabel.textContent = '비밀번호 (수정/취소 시 필요 🔒)';
    
    // Clear sub-fields explicitly
    const curPw = document.getElementById(`pwCurrent${fId}`);
    const newPw = document.getElementById(`pwNew${fId}`);
    if (curPw) curPw.value = '';
    if (newPw) newPw.value = '';
  });
}

// ===== CANCEL REGISTRATION =====
async function cancelRegistration() {
  if (!window.editingParticipantId) return;
  
  // Try to get password from the active edit form
  let password = "";
  ['SL', 'AR'].forEach(fId => {
    const inp = document.getElementById(`pwCurrent${fId}`);
    if (inp && inp.value) password = inp.value;
  });

  if (!password) {
    showToast('본인 확인을 위해 기존 비밀번호를 입력해주세요.');
    return;
  }

  if (!confirm('정말로 신청을 취소하시겠습니까?')) return;

  try {
    const res = await fetch(`${API_BASE}/Participants/${window.editingParticipantId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
      credentials: 'include'
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

async function updateLocationModal() {
  const s = window.siteSettings;
  if (!s) return;

  const nameEl = document.getElementById('location-name');
  const detailEl = document.getElementById('location-detail');
  const btnMap = document.getElementById('btnOpenMap');

  if (nameEl) nameEl.textContent = s.location;
  if (detailEl) detailEl.textContent = s.locationDetail || "상세 정보가 아직 등록되지 않았습니다.";
  
  if (btnMap) {
    if (s.mapLink) {
      btnMap.href = s.mapLink;
      btnMap.style.display = 'block';
    } else {
      btnMap.style.display = 'none';
    }
  }
}

// ===== MANITTO FUNCTIONS =====
async function openManittoModal() {
  try {
    const res = await fetch(`${API_BASE}/Manitto/me`, { credentials: 'include' });
    if (!res.ok) {
        showToast('로그인이 필요하거나 신청 데이터가 없습니다.');
        return;
    }
    
    const data = await res.json();
    if (data.message) {
        alert(data.message); // "아직 마니또가 배정되지 않았습니다." 등
        return;
    }

    // Update UI with manitto data
    document.getElementById('manitto-target-name').textContent = data.targetName;
    document.getElementById('manitto-target-gen').textContent = `${data.targetGeneration}기`;
    document.getElementById('manitto-mission-desc').textContent = data.missionDescription;

    const btnComplete = document.getElementById('btnCompleteMission');
    const badgeComplete = document.getElementById('mission-complete-badge');
    if (data.isComplete) {
        if (btnComplete) btnComplete.style.display = 'none';
        if (badgeComplete) badgeComplete.style.display = 'block';
    } else {
        if (btnComplete) btnComplete.style.display = 'block';
        if (badgeComplete) badgeComplete.style.display = 'none';
    }

    openModal('manitto');
    switchManittoTab('target');
  } catch (err) {
    console.error('Manitto load error:', err);
    showToast('데이터를 불러오지 못했습니다.');
  }
}

function switchManittoTab(tabId) {
    const modal = document.getElementById('modal-manitto');
    if (!modal) return;

    // Toggle Tab Buttons
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        const isMatch = btn.getAttribute('onclick').includes(`'${tabId}'`);
        btn.classList.toggle('active', isMatch);
        btn.style.background = isMatch ? '#212529' : 'transparent';
        btn.style.color = isMatch ? 'white' : '#666';
    });

    // Toggle Contents
    modal.querySelectorAll('.manitto-tab-content').forEach(content => {
        content.style.display = content.id === `manitto-${tabId}` ? 'block' : 'none';
    });

    if (tabId === 'report') loadReports();
}

async function completeMission() {
    if (!confirm('미션을 완료하셨습니까?\n한 번 완료하면 취소할 수 없습니다.')) return;

    try {
        const res = await fetch(`${API_BASE}/Manitto/me/complete-mission`, {
            method: 'POST',
            credentials: 'include'
        });

        if (res.ok) {
            showToast('✅ 미션 완료! 고생하셨습니다.');
            document.getElementById('btnCompleteMission').style.display = 'none';
            document.getElementById('mission-complete-badge').style.display = 'block';
        } else {
            showToast('완료 처리 실패');
        }
    } catch (e) { showToast('서버 연결 오류'); }
}

async function loadReports() {
    const container = document.getElementById('report-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/Manitto/reports`);
        if (!res.ok) return;
        const list = await res.json();

        if (list.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:13px;">아직 올라온 제보가 없습니다.</div>';
            return;
        }

        container.innerHTML = list.map(r => `
            <div class="card" style="padding:12px; background:#fff; border:1px solid #eee;">
                <div style="font-size:14px; line-height:1.5;">${r.content}</div>
                <div style="font-size:10px; color:#999; margin-top:8px;">${new Date(r.createdAt).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function postReport() {
    const input = document.getElementById('report-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API_BASE}/Manitto/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content),
            credentials: 'include'
        });

        if (res.ok) {
            input.value = '';
            loadReports();
            showToast('🚀 제보가 완료되었습니다!');
        } else {
            showToast('제보 실패');
        }
    } catch (e) { showToast('서버 오류'); }
}

// Attach to window
window.doSubmit = submitApplication;
window.updateDashboard = updateDashboard;
window.doLogin = doLogin;
window.openMyPage = openMyPage;
window.toggleCheck = toggleCheck;
window.addChecklistItem = addChecklistItem;
window.removeChecklistItem = removeChecklistItem;
window.openEditFromMyPage = openEditFromMyPage;
window.toggleLicense = toggleLicense;
window.logout = logout;
window.cancelRegistration = cancelRegistration;
window.updateCohortTable = updateCohortTable;
window.updateFeeTable = updateFeeTable;
window.updateLocationModal = updateLocationModal;
window.resetApplyForm = resetApplyForm;
window.openManittoModal = openManittoModal;
window.switchManittoTab = switchManittoTab;
window.completeMission = completeMission;
window.postReport = postReport;
window.loadReports = loadReports;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  updateAuthUI();

  // Add Enter key listener for checklist input
  const checklistInput = document.getElementById('checklist-input');
  if (checklistInput) {
    checklistInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addChecklistItem();
      }
    });
  }

  // ===== THEME =====
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      const d = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = d ? 'light' : 'dark';
      this.textContent = d ? '🌙' : '☀️';
    });
  }

  // ===== ESCAPE KEY FOR MODALS =====
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      activeModals.forEach(m => {
        const id = m.id.replace('modal-', '');
        closeModal(id);
      });
    }
  });
});

// ===== MODAL LOGIC =====
function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (!el) return;

  // Reset Edit Mode UI when opening apply modal normally
  if (id === 'apply' && !window.editingParticipantId) {
    if (window.resetApplyForm) window.resetApplyForm();
    const editHeader = document.getElementById('editHeader');
    const typeSelectionArea = document.getElementById('typeSelectionArea');
    if (editHeader) editHeader.style.display = 'none';
    if (typeSelectionArea) typeSelectionArea.style.display = 'block';
  }

  el.classList.add('active');
  document.body.classList.add('no-scroll');
}

function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.remove('active');

  // Only remove no-scroll if no other modals are open
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('no-scroll');
  }
}

function closeBg(e, id) {
  if (e.target === document.getElementById('modal-' + id)) closeModal(id);
}

// ===== APPLY TYPE =====
const typeMap = { student: 'SL', grad: 'SL', leave: 'SL', army: 'AR', etc: 'SL' };
window.curType = 'student';

function switchType(btn, type) {
  window.curType = type;
  btn.closest('.type-btns').querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  const formEl = document.getElementById('form-' + typeMap[type]);
  if (formEl) formEl.classList.add('active');

  // Toggle Student ID visibility for non-army form
  const stdIdGroup = document.getElementById('groupStdIdSL');
  if (stdIdGroup) {
    const isStudentOrLeave = (type === 'student' || type === 'leave');
    stdIdGroup.style.display = isStudentOrLeave ? 'block' : 'none';
  }
}

function openApplyArmy() {
  openModal('apply');
  const btns = document.querySelectorAll('.type-btn');
  // First button is General, second is Army
  if (btns.length >= 2) switchType(btns[1], 'army');
}

function openFeeModal() {
  openModal('fee');
  if (window.updateFeeTable) window.updateFeeTable();
}

function openLocationModal() {
  openModal('location');
  if (window.updateLocationModal) window.updateLocationModal();
}

function openCohortModal() {
  const name = localStorage.getItem('participantName');
  if (!name) {
    alert('동기/기수 확인은 신청 및 로그인 후에 이용 가능합니다. ✍️');
    openModal('login');
    return;
  }
  openModal('cohort');
  if (window.updateCohortTable) window.updateCohortTable();
}

function toggleSchedule(btn, subId) {
  const row = btn.closest('.toggle-row');
  row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const isJoin = btn.textContent.includes('합류');
  const sub = document.getElementById(subId);
  if (sub) sub.classList.toggle('show', isJoin);
}

// ===== COHORT SEARCH =====
function applyCohortFilter() {
  const gen = document.getElementById('cohortGenFilter').value;
  const name = document.getElementById('cohortNameFilter').value.toLowerCase();

  document.querySelectorAll('#cohortTable tbody tr').forEach(r => {
    const rGen = r.getAttribute('data-cohort-val');
    const rName = r.querySelector('.name-cell').textContent.toLowerCase();

    const genMatch = (gen === 'all' || rGen === gen);
    const nameMatch = rName.includes(name);

    r.style.display = (genMatch && nameMatch) ? '' : 'none';
  });
}

function openEditFromHome() {
  const name = localStorage.getItem('participantName');
  if (name && window.openEditFromMyPage) {
    window.openEditFromMyPage();
  } else {
    openModal('login');
  }
}

// Attach to window for global access (from HTML inline event handlers)
window.openModal = openModal;
window.closeModal = closeModal;
window.closeBg = closeBg;
window.switchType = switchType;
window.openApplyArmy = openApplyArmy;
window.openFeeModal = openFeeModal;
window.openLocationModal = openLocationModal;
window.openCohortModal = openCohortModal;
window.toggleSchedule = toggleSchedule;
window.applyCohortFilter = applyCohortFilter;
window.openEditFromHome = openEditFromHome;
