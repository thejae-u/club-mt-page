const escapeHTML = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[match] || match));
};

// ===== DYNAMIC SURVEY CONFIGURATION (Kept for UI compatibility) =====
const SURVEY_CONFIG = [];

// ===== GLOBAL STATE =====
window.siteSettings = {
  "title": "제 5회 빅이큐 총동문 MT",
  "subtitle": "개꿀잼 보장 빅이큐 mt ~.~",
  "eventDateRange": "2026.07.24.금 ~ 2026.07.26.일",
  "dDayTargetDate": "2026-07-24T00:00:00",
  "registrationDeadline": "2026-06-23T00:00:00",
  "location": "청평다온펜션",
  "locationDetail": "경기 가평군 청평면 청평역로 17",
  "mapLink": "https://naver.me/5r9zFvs0 ",
  "registrationFee": 120000,
  "maxGeneralCapacity": 21,
  "maxMilitaryCapacity": 4,
  // 미리보기용 인원 설정 (직접 수정 가능)
  "currentCounts": {
    "general": 0,
    "military": 0
  },
  "scheduleDataJson": "[{\"day\":1,\"emoji\":\"☀️\",\"date\":\"7월 24일 금요일\",\"summary\":\"일정\",\"timeline\":[{\"time\":\"14:40\",\"title\":\"집합\",\"desc\":\"\"},{\"time\":\"15:00\",\"title\":\"일정 안내 및 자기소개\",\"desc\":\"\"},{\"time\":\"16:00\",\"title\":\"물놀이\",\"desc\":\"\"},{\"time\":\"18:40\",\"title\":\"요리 배틀\",\"desc\":\"\"},{\"time\":\"20:00\",\"title\":\"저녁 식사 및 술파티\",\"desc\":\"\"}]},{\"day\":2,\"emoji\":\"🌕\",\"date\":\"7월 25일 토요일\",\"summary\":\"일정\",\"timeline\":[{\"time\":\"~12:10\",\"title\":\"점심 식사\",\"desc\":\"\"},{\"time\":\"13:00\",\"title\":\"배구 경기\",\"desc\":\"\"},{\"time\":\"19:30\",\"title\":\"바베큐\",\"desc\":\"\"},{\"time\":\"21:30\",\"title\":\"마니또 발표 및 술파티\",\"desc\":\"\"}]},{\"day\":3,\"emoji\":\"🫧\",\"date\":\"7월 26일 일요일\",\"summary\":\"일정\",\"timeline\":[{\"time\":\"10:00\",\"title\":\"점심 식사\",\"desc\":\"\"},{\"time\":\"11:00\",\"title\":\"퇴실 및 단체사진 촬영\",\"desc\":\"\"},{\"time\":\"~\",\"title\":\"해산\",\"desc\":\"\"}]}]"
};

// ===== DASHBOARD & UI =====
function updateDashboard() {
    const s = window.siteSettings;
    renderSettings(s);
    renderExpectations([]);
    
    // Static Counts
    const counts = s.currentCounts || { general: 0, military: 0 };
    const totalCount = counts.general + counts.military;
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) totalCountEl.textContent = `${totalCount}명`;
    
    const MAX_T = (s.maxGeneralCapacity || 21) + (s.maxMilitaryCapacity || 4);
    const totalCapEl = document.getElementById('totalCapacityLabel');
    if (totalCapEl) totalCapEl.textContent = ` / ${MAX_T}명 정원`;

    const genLabelEl = document.getElementById('genLabel');
    if (genLabelEl) genLabelEl.textContent = `${counts.general}명 / ${s.maxGeneralCapacity || 21}명`;
    const armyLabelEl = document.getElementById('armyLabel');
    if (armyLabelEl) armyLabelEl.textContent = `${counts.military}명 / ${s.maxMilitaryCapacity || 4}명`;
    
    setBarW('barGen', Math.round((counts.general / (s.maxGeneralCapacity || 21)) * 100));
    setBarW('barArmy', Math.round((counts.military / (s.maxMilitaryCapacity || 4)) * 100));
}

function renderExpectations(expectations) {
    const expectationSection = document.getElementById('expectationSection');
    if (expectationSection) expectationSection.style.display = 'none';
}

function renderSettings(s) {
  const titleEl = document.querySelector('.hero h1');
  if (titleEl) {
    const ft = s.title;
    if (ft.includes("총동문")) { const p = ft.split("총동문"); titleEl.innerHTML = `${p[0].trim()}<br><span>총동문 ${p[1].trim()}</span>`; }
    else { const p = ft.split(' '); const sVal = p.pop(); titleEl.innerHTML = `${p.join(' ')}<br><span>${sVal}</span>`; }
  }
  const subEl = document.querySelector('.hero-sub'); if (subEl) subEl.textContent = s.subtitle;
  
  const chips = document.querySelectorAll('.info-chip');
  if (chips.length >= 3) {
    chips[0].textContent = `📅 ${s.eventDateRange}`;
    chips[1].innerHTML = `📍 ${s.location} <span style="font-size:10px; opacity:0.7; margin-left:2px;">▶</span>`;
    chips[2].innerHTML = `💳 회비 ${s.registrationFee.toLocaleString()}원 <span style="font-size:10px; opacity:0.7; margin-left:2px;">▶</span>`;
  }

  const mtD = document.getElementById('mtDDayBlock'); const mtDN = document.getElementById('ddayNum');
  if (mtD && mtDN) {
    const diff = Math.ceil((new Date(s.dDayTargetDate) - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff >= 0) { mtDN.textContent = diff === 0 ? '오늘!' : diff; mtD.style.display = 'inline-flex'; } else mtD.style.display = 'none';
  }
  
  const dlB = document.getElementById('deadlineBlock'); const dlN = document.getElementById('ddayDeadline');
  if (dlB && dlN) {
    const diff = Math.ceil((new Date(s.registrationDeadline) - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff >= 0) { dlN.textContent = diff === 0 ? '오늘!' : diff; dlB.style.display = 'inline-flex'; } else { dlB.style.display = 'none'; }
  }

  try { renderSchedule(JSON.parse(s.scheduleDataJson || "[]")); } catch (e) {}
}

function renderSchedule(data) {
  const cardsC = document.getElementById('scheduleCards'); const modalsC = document.getElementById('dynamicModals'); if (!cardsC || !modalsC) return;
  
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
          ${d.timeline.map((t, ti) => `
              <div class="tl-item">
                <div class="tl-time">${t.time}</div>
                <div class="tl-dots"><div class="tl-dot"></div>${ti < d.timeline.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
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

function setBarW(id, pct) { const el = document.getElementById(id); if (el) { el.style.transition = 'width .9s cubic-bezier(0.4,0,0.2,1)'; el.style.width = Math.min(100, pct) + '%'; } }

// ===== MODAL LOGIC =====
function openModal(id) {
  const el = document.getElementById('modal-' + id); if (!el) return;
  el.classList.add('active'); document.body.classList.add('no-scroll');
}
function closeModal(id) { 
  const el = document.getElementById('modal-' + id); 
  if (el) el.classList.remove('active'); 
  if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('no-scroll'); 
}

let modalMouseDownTarget = null;
document.addEventListener('mousedown', e => { modalMouseDownTarget = e.target; });

function closeBg(e, id) { 
  const overlay = document.getElementById('modal-' + id);
  if (e.target === overlay && modalMouseDownTarget === overlay) { closeModal(id); }
}

function openLocationModal() {
  const s = window.siteSettings;
  const nEl = document.getElementById('location-name'); const dEl = document.getElementById('location-detail'); const btnM = document.getElementById('btnOpenMap');
  if (nEl) nEl.textContent = s.location; if (dEl) dEl.textContent = s.locationDetail;
  if (btnM) { if (s.mapLink) { btnM.href = s.mapLink; btnM.style.display = 'block'; } else btnM.style.display = 'none'; }
  openModal('location');
}

function openFeeModal() {
    alert('회비 지출 내역은 추후 공개됩니다.');
}

// ===== V-MBTI LOGIC (Local Only) =====
const MBTI_QUESTIONS = [
  { q: "경기 시작 전, 모르는 사람들과 팀이 되었을 때 나는?", a: "먼저 말을 걸며 파이팅을 외친다", b: "조용히 몸을 풀며 내 역할에 집중한다" },
  { q: "공격 찬스가 왔을 때 내가 더 선호하는 득점 방식은?", a: "블로킹 위에서 찍어 누르는 강력한 스파이크", b: "상대 수비가 없는 곳을 찌르는 정교한 연타나 페인트" },
  { q: "우리 팀 세터의 토스가 오늘따라 불안정하다면?", a: "공이 올라오는 궤적과 높이를 분석해 맞춤형으로 뜬다", b: "\"괜찮아!\"라고 외치며 일단 어떻게든 처리해주려 노력한다" },
  { q: "랠리 상황에서 수비 위치를 잡을 때 나는?", a: "미리 약속된 수비 포메이션 위치를 철저히 지킨다", b: "공이 날아가라 방향을 보고 본능적으로 몸을 던진다" },
  { q: "경기가 끝나고 다 같이 회식을 갔을 때 나의 모습은?", a: "게임 주도! 텐션 폭발! 분위기 메이커", b: "구석에서 소소하게 딥토크 하는 상담가" }
];

let mbtiAnswers = [];
let currentMbtiIdx = 0;
let currentMbtiResultCode = "";

function openMBTIModal() {
  currentMbtiIdx = 0; mbtiAnswers = [];
  document.getElementById('mbti-start').style.display = 'block';
  document.getElementById('mbti-quiz').style.display = 'none';
  document.getElementById('mbti-result').style.display = 'none';
  openModal('mbti');
}

function startMBTI() {
  currentMbtiIdx = 0; mbtiAnswers = [];
  const btnSave = document.getElementById('btnSaveMbti'); if (btnSave) btnSave.style.display = 'none';
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
  if (currentMbtiIdx < MBTI_QUESTIONS.length - 1) { currentMbtiIdx++; renderMBTIQuestion(); }
  else { showMBTIResult(); }
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
  "APLS": { "title": "💣 전술적 폭격기형", "desc": "빅이큐의 인간 활력소이자 훈련 부장 스타일. 득점하면 체육관이 떠나가라 소리를 지르며 부원들 등을 불이 나게 두들겨 줍니다.", "mt": "고기 굽기부터 게임 진행까지 도맡는 과대표 스타일" },
  // ... (Other results can be added if needed, but for preview we can keep a few or all)
};

// Simplified result code
function showMBTIResultByCode(code) {
  const result = MBTI_RESULTS[code] || MBTI_RESULTS["APLS"];
  document.getElementById('mbti-progress').style.width = '100%';
  document.getElementById('mbti-start').style.display = 'none';
  document.getElementById('mbti-quiz').style.display = 'none';
  document.getElementById('mbti-result').style.display = 'block';
  document.getElementById('res-mbti-code').textContent = code;
  document.getElementById('res-title').textContent = result.title;
  document.getElementById('res-desc').textContent = result.desc;
  document.getElementById('res-mt').textContent = result.mt;
}

// Global Exports
window.openModal = openModal; window.closeModal = closeModal; window.closeBg = closeBg;
window.openLocationModal = openLocationModal; window.openFeeModal = openFeeModal;
window.openMBTIModal = openMBTIModal; window.startMBTI = startMBTI; window.selectMBTIAnswer = selectMBTIAnswer;

function showPreviewNotice() {
    alert('공지 된 신청일 부터 공개되는 기능입니다.');
}
window.showPreviewNotice = showPreviewNotice;

window.alert = (msg) => {
    const m = document.getElementById('modal-alert');
    if (!m) { window.nativeAlert(msg); return; }
    document.getElementById('alert-title').textContent = '알림';
    document.getElementById('alert-message').textContent = msg;
    document.getElementById('btn-alert-confirm').onclick = () => closeModal('alert');
    openModal('alert');
};
window.nativeAlert = window.alert;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  const tb = document.getElementById('themeBtn'); if (tb) tb.addEventListener('click', function() { const d = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = d ? 'light' : 'dark'; this.textContent = d ? '🌙' : '☀️'; });
});
