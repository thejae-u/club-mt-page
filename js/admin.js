const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://api-mt.thejaeu.com/api';

const escapeHTML = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[match] || match));
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const btn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (btn) btn.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    if (tabId === 'fees') loadFees();
    if (tabId === 'members') loadParticipants();
    if (tabId === 'settings') loadSettings();
    if (tabId === 'manitto') loadManittoTab();
    if (tabId === 'board') loadBoard();
}

async function loadBoard() {
    const tbody = document.getElementById('boardList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Manitto/reports`, { credentials: 'include' });
        if (res.status === 401) return logout(true);
        if (!res.ok) throw new Error();

        const reports = await res.json();
        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">제보가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = reports.map(r => `
            <tr>
                <td style="text-align:left;">${r.id}</td>
                <td style="text-align:left;">
                    <b>${escapeHTML(r.participantName) || '익명'}</b><br>
                    <span style="font-size:10px; color:#999;">${r.participantGeneration ? r.participantGeneration + '기' : ''}</span>
                </td>
                <td style="text-align:left; font-size:13px; line-height:1.4;">${escapeHTML(r.content)}</td>
                <td style="text-align:left; font-size:11px; color:#666;">
                    ${new Date(new Date(r.createdAt).getTime() + (9 * 60 * 60 * 1000)).toLocaleString()}
                </td>
                <td style="text-align:left;">
                    <button onclick="deleteReport(${r.id})" style="padding:5px 10px; background:#E5484D; color:white; font-size:11px; margin-top:0;">삭제</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">데이터 로드 실패</td></tr>';
    }
}

async function deleteReport(id) {
    if (!await confirm('이 제보를 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Manitto/reports/${id}`, { 
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            loadBoard();
        } else {
            await alert('삭제 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function loadManittoTab() {
    await loadMissions();
    await loadAssignments();
}

async function checkAuth() {
    const adminContent = document.getElementById('adminContent');
    const loginOverlay = document.getElementById('loginOverlay');
    
    try {
        const res = await fetch(`${API_BASE}/Auth/status`, { credentials: 'include' });
        if (res.ok) {
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (adminContent) adminContent.style.visibility = 'visible';
            
            if (document.getElementById('tab-settings')) loadSettings();
            if (window.fetchData) fetchData(); // For admin-detail
        } else {
            if (loginOverlay) {
                loginOverlay.style.display = 'flex';
                if (adminContent) adminContent.style.visibility = 'visible';
            } else if (window.location.pathname.includes('manager-detail')) {
                await alert('로그인이 필요하거나 세션이 만료되었습니다.');
                window.location.href = 'manager-hq';
            } else {
                if (adminContent) adminContent.style.visibility = 'visible';
            }
        }
    } catch (e) {
        console.error('Auth check error:', e);
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (adminContent) adminContent.style.visibility = 'visible';
    }
}

async function doLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (res.ok) {
            location.reload();
        } else {
            await alert('로그인 실패: 비밀번호가 올바르지 않습니다.');
        }
    } catch (e) {
        await alert('서버 연결 오류');
    }
}

async function logout(isAuto = false) {
    if (isAuto) {
        await alert('세션 정보가 만료되어 재로그인이 필요합니다.');
    } else {
        if (!await confirm('로그아웃 하시겠습니까?')) return;
    }
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    location.href = 'manager-hq';
}

// --- MANITTO MANAGEMENT ---
async function loadMissions() {
    const container = document.getElementById('missionListContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions`, { credentials: 'include' });
        if (res.status === 401) return logout(true);
        if (!res.ok) throw new Error();

        const missions = await res.json();
        window.currentMissions = missions; // Store globally for select boxes
        if (missions.length === 0) {
            container.innerHTML = '<p style="color:#999; text-align:center; padding:10px;">등록된 미션이 없습니다.</p>';
            return;
        }

        container.innerHTML = missions.map((m, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 10px; border-bottom:1px solid #eee;">
                <span>${i + 1}. ${m.description}</span>
                <button onclick="deleteMission(${m.id})" style="width:auto; padding:5px 10px; background:#ff4d4d; color:white; font-size:10px; margin:0;">삭제</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '데이터를 불러오지 못했습니다.';
    }
}

async function addMissions() {
    const text = document.getElementById('new-missions').value;
    if (!text.trim()) return await alert('미션 내용을 입력해주세요.');

    const missionList = text.split('\n').map(m => m.trim()).filter(m => m !== "");
    if (missionList.length === 0) return await alert('유효한 미션이 없습니다.');

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(missionList),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            await alert('✅ 미션이 성공적으로 등록되었습니다.');
            document.getElementById('new-missions').value = '';
            loadMissions();
        } else {
            await alert('등록 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function deleteMission(id) {
    if (!await confirm('미션을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadMissions();
    } catch (e) { await alert('삭제 실패'); }
}

async function loadAssignments() {
    const tbody = document.getElementById('manittoAssignmentList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/assignments`, { credentials: 'include' });
        if (res.status === 401) return logout(true);
        const list = await res.json();
        
        window.currentAssignments = list; // Store for reference

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">신청자가 없거나 매칭 데이터가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(a => `
            <tr>
                <td><b>${a.name}</b> (${a.generation}기)</td>
                <td>
                    <select onchange="updateManittoAssignmentLocal(${a.id}, 'TargetId', this.value)" style="font-size:11px; padding:4px;">
                        <option value="">선택 안함</option>
                        ${list.map(p => `<option value="${p.id}" ${p.id === a.manittoTargetId ? 'selected' : ''}>${p.name} (${p.generation}기)</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select onchange="updateManittoAssignmentLocal(${a.id}, 'MissionId', this.value)" style="font-size:11px; padding:4px; max-width:150px;">
                        <option value="">미션 없음</option>
                        ${(window.currentMissions || []).map(m => `<option value="${m.id}" ${m.id === a.manittoMissionId ? 'selected' : ''}>${m.description}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <span class="badge" onclick="toggleMissionStatus(${a.id}, ${a.isManittoMissionComplete})" style="background:${a.isManittoMissionComplete ? '#22C55E' : '#F5A623'}; color:white; cursor:pointer; user-select:none;" title="클릭하여 상태 변경">
                        ${a.isManittoMissionComplete ? '성공' : '진행중'}
                    </span>
                </td>
                <td style="text-align:center;">
                    <button onclick="saveSingleAssignment(${a.id})" style="width:auto; padding:4px 8px; background:var(--blue-deep); color:white; font-size:11px; margin:0;">저장</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function toggleMissionStatus(id, currentStatus) {
    try {
        const res = await fetch(`${API_BASE}/Management/manitto/assignments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isComplete: !currentStatus }),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            loadAssignments();
        } else {
            await alert('상태 변경 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

// Helper to store changes locally before saving
window.assignmentChanges = {};

function updateManittoAssignmentLocal(participantId, field, value) {
    if (!window.assignmentChanges[participantId]) {
        const original = window.currentAssignments.find(a => a.id === participantId);
        window.assignmentChanges[participantId] = {
            targetId: original.manittoTargetId,
            isTargetCleared: false,
            missionId: original.manittoMissionId,
            isMissionCleared: false
        };
    }
    
    if (field === 'TargetId') {
        const val = value ? parseInt(value) : null;
        window.assignmentChanges[participantId].targetId = val;
        window.assignmentChanges[participantId].isTargetCleared = (val === null);
    }
    if (field === 'MissionId') {
        const val = value ? parseInt(value) : null;
        window.assignmentChanges[participantId].missionId = val;
        window.assignmentChanges[participantId].isMissionCleared = (val === null);
    }
}

async function saveSingleAssignment(id) {
    const changes = window.assignmentChanges[id];
    if (!changes) return await alert('변경사항이 없습니다.');

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/assignments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            await alert('✅ 저장되었습니다.');
            delete window.assignmentChanges[id];
            loadAssignments();
        } else {
            await alert('저장 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function matchManitto() {
    if (!await confirm('정말 마니또 랜덤 매칭을 실행하시겠습니까?\n기존 매칭 정보는 모두 초기화됩니다.')) return;

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/match`, {
            method: 'POST',
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            const result = await res.json();
            await alert(`🎉 성공: ${result.message}`);
            loadAssignments();
        } else {
            const err = await res.text();
            await alert(`❌ 매칭 실패: ${err}`);
        }
    } catch (e) { await alert('서버 연결 오류'); }
    finally { if (loadingOverlay) loadingOverlay.style.display = 'none'; }
}

// --- FEE MANAGEMENT ---
async function loadFees() {
    try {
        const [resList, resSummary] = await Promise.all([
            fetch(`${API_BASE}/Fee`, { credentials: 'include' }),
            fetch(`${API_BASE}/Fee/summary`, { credentials: 'include' })
        ]);
        
        if (!resList.ok || !resSummary.ok) {
            if (resList.status === 401) return logout(true);
            return;
        }

        const list = await resList.json();
        const summary = await resSummary.json();
        
        const summaryEl = document.getElementById('fee-summary-text');
        if (summaryEl) summaryEl.textContent = `총 지출 합계: ${summary.totalExpense.toLocaleString()}원`;

        const tbody = document.getElementById('adminFeeList');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #999;">등록된 지출 내역이 없습니다.</td></tr>';
            return;
        }

        const catMap = { 'Food': '음식/장보기', 'Rent': '숙소/대관', 'Transport': '교통/유류비', 'General': '기타 지출' };
        tbody.innerHTML = list.map(f => `
            <tr>
                <td><b>${f.description}</b></td>
                <td><span class="badge badge-expense">${catMap[f.category] || f.category}</span></td>
                <td style="text-align: right; color: #E5484D; font-weight:700;">
                    ${Math.abs(f.amount).toLocaleString()}
                </td>
                <td style="text-align: center;">
                    <button onclick="deleteFee(${f.id})" style="width:auto; padding:4px 8px; background:#ff4d4d; color:white; font-size:11px; margin:0;">삭제</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function addFee() {
    const description = document.getElementById('fee-desc').value;
    const rawAmount = parseInt(document.getElementById('fee-amt').value);
    const category = document.getElementById('fee-cat').value;

    if (!description || isNaN(rawAmount)) return await alert('항목과 금액을 입력해주세요.');

    const amount = -Math.abs(rawAmount);

    try {
        const res = await fetch(`${API_BASE}/Fee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, amount, category }),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            document.getElementById('fee-desc').value = '';
            document.getElementById('fee-amt').value = '';
            loadFees();
        }
    } catch (e) { await alert('지출 내역 추가 실패'); }
}

async function deleteFee(id) {
    if (!await confirm('정말 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Fee/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadFees();
    } catch (e) { await alert('삭제 실패'); }
}

// --- PARTICIPANT MANAGEMENT ---
const typeLabels = ['재학생', '졸업생', '휴학생', '군인', '기타'];
async function loadParticipants() {
    try {
        const sRes = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
        const settings = await sRes.json();
        const MAX_GEN = settings.maxGeneralCapacity || 16;
        const MAX_ARMY = settings.maxMilitaryCapacity || 4;

        const res = await fetch(`${API_BASE}/Participants`, { credentials: 'include' });
        if (res.status === 401) return logout(true);
        const list = await res.json();
        const tbody = document.getElementById('participantList');
        if (!tbody) return;
        
        const registered = list.filter(p => p.isRegistered);
        if (registered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #999;">신청자가 없습니다.</td></tr>';
            return;
        }

        const confirmedArmy = registered.filter(p => p.type === 3 && !p.isWaitlisted).length;
        const confirmedGen = registered.filter(p => p.type !== 3 && !p.isWaitlisted).length;

        tbody.innerHTML = registered.map(p => {
            const isWait = p.isWaitlisted;
            const isArmy = p.type === 3;
            const isFull = isArmy ? (confirmedArmy >= MAX_ARMY) : (confirmedGen >= MAX_GEN);
            
            return `
            <tr style="${isWait ? 'background: #FFF0F0;' : ''}">
                <td><b>${p.name}${isWait ? ' <span style="color:#E5484D; font-size:10px;">(대기)</span>' : ''}</b></td>
                <td>${typeLabels[p.type] || '기타'}</td>
                <td>${p.generation}기</td>
                <td style="font-size:12px;">${p.phoneNumber || '-'}</td>
                <td>
                    ${isWait ? 
                        `<div style="display:flex; align-items:center; gap:5px;">
                            <span style="color:#E5484D; font-weight:700; font-size:11px;">대기자</span>
                            <button onclick="toggleWaitlist(${p.id})" ${isFull ? 'disabled' : ''} style="width:auto; padding:2px 6px; background:${isFull ? '#ccc' : '#E5484D'}; color:white; font-size:10px; margin:0; cursor:${isFull ? 'not-allowed' : 'pointer'};">
                                신청 전환
                            </button>
                        </div>` : 
                        `<button onclick="toggleDeposit(${p.id})" style="padding: 4px 8px; background: ${p.isDepositConfirmed ? '#22C55E' : '#F5A623'}; color:white; font-size: 11px; margin:0; width:auto;">
                            ${p.isDepositConfirmed ? '입금완료' : '입금대기'}
                        </button>`
                    }
                </td>
                <td style="text-align: center; display: flex; gap: 4px; justify-content: center;">
                    <button onclick="openEditModal(${p.id})" style="padding: 4px 8px; background: var(--blue-deep); color:white; font-size: 11px; margin:0; width:auto;">수정</button>
                    <button onclick="deleteParticipant(${p.id})" style="padding: 4px 8px; background: #ff4d4d; color:white; font-size: 11px; margin:0; width:auto;">삭제</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function openEditModal(id) {
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}`, { credentials: 'include' });
        if (!res.ok) return;
        const p = await res.json();
        
        document.getElementById('edit-id').value = p.id;
        document.getElementById('edit-name').value = p.name;
        document.getElementById('edit-generation').value = p.generation;
        document.getElementById('edit-type').value = p.type;
        document.getElementById('edit-phone').value = p.phoneNumber;
        document.getElementById('edit-studentId').value = p.studentId || "";
        document.getElementById('edit-transportation').value = p.transportation || "Car";
        document.getElementById('edit-carpoolAvailable').value = p.isCarpoolAvailable ? "true" : "false";
        document.getElementById('edit-carpoolSeats').value = p.carpoolSeats || 0;
        document.getElementById('edit-departure').value = p.departureArea || "";
        document.getElementById('edit-remarks').value = p.remarks || "";
        
        document.getElementById('edit-hasDriverLicense').value = p.hasDriverLicense ? "true" : "false";
        document.getElementById('edit-driverLicenseType').value = p.driverLicenseType || "";
        document.getElementById('edit-canDrive').value = p.canDrive ? "true" : "false";
        document.getElementById('edit-drivingExperience').value = p.drivingExperience || "";

        const seatRow = document.getElementById('edit-carpool-seats-row');
        if (seatRow) seatRow.style.display = p.isCarpoolAvailable ? 'block' : 'none';
        
        const editModal = document.getElementById('editModal');
        if (editModal) editModal.style.display = 'flex';
        window.editingParticipantRaw = p;
    } catch (e) { console.error(e); }
}

function closeEditModal() {
    const editModal = document.getElementById('editModal');
    if (editModal) editModal.style.display = 'none';
}

async function saveParticipantEdit() {
    const id = document.getElementById('edit-id').value;
    const payload = {
        ...window.editingParticipantRaw,
        name: document.getElementById('edit-name').value,
        generation: parseInt(document.getElementById('edit-generation').value),
        type: parseInt(document.getElementById('edit-type').value),
        phoneNumber: document.getElementById('edit-phone').value,
        studentId: document.getElementById('edit-studentId').value,
        transportation: document.getElementById('edit-transportation').value,
        isCarpoolAvailable: document.getElementById('edit-carpoolAvailable').value === "true",
        carpoolSeats: parseInt(document.getElementById('edit-carpoolSeats').value) || 0,
        departureArea: document.getElementById('edit-departure').value,
        remarks: document.getElementById('edit-remarks').value,
        hasDriverLicense: document.getElementById('edit-hasDriverLicense').value === "true",
        driverLicenseType: document.getElementById('edit-driverLicenseType').value,
        canDrive: document.getElementById('edit-canDrive').value === "true",
        drivingExperience: document.getElementById('edit-drivingExperience').value
    };

    try {
        const res = await fetch(`${API_BASE}/Participants/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (res.ok) {
            closeEditModal();
            loadParticipants();
        } else {
            await alert('수정 실패');
        }
    } catch (e) { await alert('서버 연결 오류'); }
}

async function resetPassword() {
    const id = document.getElementById('edit-id').value;
    if (!await confirm('비밀번호를 휴대폰 번호 뒷 4자리로 초기화하시겠습니까?')) return;

    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/reset-password`, {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
            const result = await res.json();
            await alert(result.message);
        } else {
            await alert('초기화 실패');
        }
    } catch (e) { await alert('서버 연결 오류'); }
}

async function toggleWaitlist(id) {
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/toggle-waitlist`, { 
            method: 'POST',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            loadParticipants();
        } else {
            const msg = await res.text();
            await alert(msg);
        }
    } catch (e) { await alert('업데이트 실패'); }
}

async function toggleDeposit(id) {
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/toggle-deposit`, { 
            method: 'POST',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadParticipants();
    } catch (e) { await alert('업데이트 실패'); }
}

async function deleteParticipant(id) {
    if (!await confirm('정말 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}`, { 
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadParticipants();
    } catch (e) { await alert('삭제 실패'); }
}

async function uploadCsv() {
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files || !fileInput.files.length) return await alert('파일을 선택해주세요.');

    if (!await confirm('정말 명단을 교체하시겠습니까?')) return;

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/Management/import-csv`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            const result = await res.json();
            await alert(`✅ 성공: ${result.message}`);
            switchTab('members');
        } else {
            const err = await res.text();
            await alert(`❌ 업로드 실패: ${err}`);
        }
    } catch (e) { await alert('서버 연결 오류'); }
    finally { if (loadingOverlay) loadingOverlay.style.display = 'none'; }
}

// --- SETTINGS MANAGEMENT ---
async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
        if (!res.ok) return;
        const s = await res.json();
        document.getElementById('title').value = s.title;
        document.getElementById('subtitle').value = s.subtitle;
        document.getElementById('eventDateRange').value = s.eventDateRange;
        document.getElementById('dDayTargetDate').value = s.dDayTargetDate ? s.dDayTargetDate.split('T')[0] : "";
        document.getElementById('registrationDeadline').value = s.registrationDeadline ? s.registrationDeadline.split('T')[0] : "";
        document.getElementById('location').value = s.location;
        document.getElementById('locationDetail').value = s.locationDetail || "";
        document.getElementById('mapLink').value = s.mapLink || "";
        document.getElementById('registrationFee').value = s.registrationFee;
        document.getElementById('maxGeneralCapacity').value = s.maxGeneralCapacity;
        document.getElementById('maxMilitaryCapacity').value = s.maxMilitaryCapacity;

        let commonItems = [];
        try { commonItems = JSON.parse(s.commonChecklistJson || "[]"); } catch(e) {}
        document.getElementById('commonChecklist').value = commonItems.join('\n');
        
        let schedule = [];
        try { schedule = JSON.parse(s.scheduleDataJson || "[]"); } catch(e) {}
        renderScheduleEditor(schedule);
        syncRawJson();
    } catch (e) { console.error(e); }
}

let currentSchedule = [];
function renderScheduleEditor(data) {
    currentSchedule = data;
    const container = document.getElementById('scheduleEditor');
    if (!container) return;
    if (data.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:#999; text-align:center;">등록된 일정이 없습니다.</p>';
        return;
    }
    container.innerHTML = data.map((day, dIdx) => `
        <div style="background:white; padding:15px; border-radius:10px; margin-bottom:15px; border:1px solid #eee;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-weight:800; color:#2D468D;">DAY ${dIdx+1}</span>
                <button onclick="removeDay(${dIdx})" style="width:auto; padding:4px 8px; background:#ff4d4d; color:white; font-size:11px; margin:0;">삭제</button>
            </div>
            <div style="display:grid; grid-template-columns: 50px 1fr; gap:10px; margin-bottom:10px;">
                <input type="text" value="${day.emoji}" onchange="updateDay(${dIdx}, 'emoji', this.value)" placeholder="emoji">
                <input type="text" value="${day.date}" onchange="updateDay(${dIdx}, 'date', this.value)" placeholder="날짜">
            </div>
            <input type="text" value="${day.summary}" onchange="updateDay(${dIdx}, 'summary', this.value)" placeholder="요약" style="margin-bottom:10px;">
            <div style="margin-left:15px; border-left:2px solid #f0f0f0; padding-left:10px;">
                ${day.timeline.map((t, tIdx) => `
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="text" value="${t.time}" onchange="updateTimeline(${dIdx}, ${tIdx}, 'time', this.value)" style="width:70px; font-size:12px;">
                        <input type="text" value="${t.title}" onchange="updateTimeline(${dIdx}, ${tIdx}, 'title', this.value)" style="flex:1; font-size:12px;">
                        <button onclick="removeTimeline(${dIdx}, ${tIdx})" style="width:auto; padding:0 8px; background:#999; color:white; font-size:10px; margin:0;">✕</button>
                    </div>
                `).join('')}
                <button onclick="addTimeline(${dIdx})" style="background:#8BA0CE; color:white; font-size:11px; padding:6px 10px; margin-top:5px; width:auto;">+ 타임라인 추가</button>
            </div>
        </div>
    `).join('');
}

function updateDay(dIdx, field, val) { currentSchedule[dIdx][field] = val; syncRawJson(); }
function updateTimeline(dIdx, tIdx, field, val) { currentSchedule[dIdx].timeline[tIdx][field] = val; syncRawJson(); }
function addDay() { currentSchedule.push({ day: currentSchedule.length + 1, emoji: "📅", date: "새 날짜", summary: "요약", timeline: [{ time: "09:00", title: "시작", desc: "" }] }); renderScheduleEditor(currentSchedule); syncRawJson(); }
async function removeDay(idx) { if(!await confirm('삭제하시겠습니까?')) return; currentSchedule.splice(idx, 1); renderScheduleEditor(currentSchedule); syncRawJson(); }
function addTimeline(dIdx) { currentSchedule[dIdx].timeline.push({ time: "12:00", title: "활동", desc: "" }); renderScheduleEditor(currentSchedule); syncRawJson(); }
function removeTimeline(dIdx, tIdx) { currentSchedule[dIdx].timeline.splice(tIdx, 1); renderScheduleEditor(currentSchedule); syncRawJson(); }
function syncRawJson() { const jsonEl = document.getElementById('scheduleDataJson'); if (jsonEl) jsonEl.value = JSON.stringify(currentSchedule, null, 2); }

async function saveSettings() {
    const payload = {
        title: document.getElementById('title').value,
        subtitle: document.getElementById('subtitle').value,
        eventDateRange: document.getElementById('eventDateRange').value,
        dDayTargetDate: document.getElementById('dDayTargetDate').value || null,
        registrationDeadline: document.getElementById('registrationDeadline').value || null,
        location: document.getElementById('location').value,
        locationDetail: document.getElementById('locationDetail').value,
        mapLink: document.getElementById('mapLink').value,
        registrationFee: parseInt(document.getElementById('registrationFee').value),
        maxGeneralCapacity: parseInt(document.getElementById('maxGeneralCapacity').value),
        maxMilitaryCapacity: parseInt(document.getElementById('maxMilitaryCapacity').value),
        commonChecklistJson: JSON.stringify(document.getElementById('commonChecklist').value.split('\n').map(l => l.trim()).filter(l => l !== "")),
        scheduleDataJson: JSON.stringify(currentSchedule)
    };
    try {
        const res = await fetch(`${API_BASE}/Settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            await alert('✅ 저장되었습니다!');
        } else {
            const msg = await res.text();
            await alert(`❌ 저장 실패: ${msg || '알 수 없는 오류'}`);
        }
    } catch (e) { await alert('저장 중 연결 오류가 발생했습니다.'); }
}

// --- ADMIN DETAIL FUNCTIONS ---
function formatPhone(num) {
    if (!num) return '-';
    const clean = num.replace(/\D/g, '');
    if (clean.length === 11) {
        return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (clean.length === 10) {
        return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return num;
}

// Global state for detail page
let participants = [];
let masterMembers = [];
let sortConfig = { key: 'name', direction: 'asc' };

async function fetchData() {
    try {
        const [resParticipants, resMembers] = await Promise.all([
            fetch(`${API_BASE}/Participants`, { credentials: 'include' }),
            fetch(`${API_BASE}/Management/members`, { credentials: 'include' })
        ]);

        if (resParticipants.status === 401) return logout(true);

        participants = await resParticipants.json();
        masterMembers = await resMembers.json();

        updateSummary();
        renderTables();
    } catch (e) {
        console.error(e);
        // Silently fail if not on detail page
        if (document.getElementById('regTableBody')) await alert('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

function renderTables() {
    const searchInp = document.getElementById('searchInput');
    if (!searchInp) return;
    const term = searchInp.value.toLowerCase();
    
    // Filter and Sort Participants
    const filteredReg = participants.filter(p => p.isRegistered && (
        p.name.toLowerCase().includes(term) ||
        p.generation.toString().includes(term) ||
        (p.phoneNumber && p.phoneNumber.includes(term)) ||
        (p.remarks && p.remarks.toLowerCase().includes(term))
    ));
    const sortedReg = sortData(filteredReg, sortConfig.key, sortConfig.direction);

    // Calculate Unregistered
    const unregParticipants = masterMembers.filter(m => 
        !participants.some(p => p.isRegistered && p.name === m.name && p.generation === m.generation)
    ).filter(m => 
        m.name.toLowerCase().includes(term) ||
        m.generation.toString().includes(term)
    );
    const sortedUnreg = sortData(unregParticipants, sortConfig.key, sortConfig.direction);

    // Render Registered
    const regTbody = document.getElementById('regTableBody');
    if (regTbody) {
        regTbody.innerHTML = sortedReg.map(p => `
            <tr style="${p.isWaitlisted ? 'background: #FFF0F0;' : ''}">
                <td style="font-weight:700;">${p.name}${p.isWaitlisted ? ' <span style="color:#E5484D; font-size:10px; font-weight:normal;">(대기)</span>' : ''}</td>
                <td>${p.generation}기</td>
                <td><span class="badge" style="background:var(--blue-soft); color:var(--blue-deep);">${typeLabels[p.type] || '기타'}</span></td>
                <td>${formatPhone(p.phoneNumber)}</td>
                <td>${p.studentId || '-'}</td>
                <td style="color: ${p.isDepositConfirmed ? '#22C55E' : '#F5A623'}; font-weight:bold;">${p.isDepositConfirmed ? '완료' : '대기'}</td>
                <td>${p.transportation === 'Car' ? '🚗 자차' : '🚌 대중교통'}</td>
                <td>${p.isCarpoolAvailable ? `✅ ${p.carpoolSeats}석` : '-'}</td>
                <td>${p.departureArea || '-'}</td>
                <td>${p.hasDriverLicense ? `✅ (${p.driverLicenseType || '?'})` : '❌'}</td>
                <td>${p.canDrive ? '✅ 가능' : '❌ 불가능'}</td>
                <td>${p.drivingExperience || '-'}</td>
                <td style="color: #E8392D;">${p.allergies || '-'}</td>
                <td title="${p.remarks || ''}">${p.remarks || '-'}</td>
                <td style="font-size: 11px; color: #999;">${new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    // Render Unregistered
    const unregTbody = document.getElementById('unregTableBody');
    if (unregTbody) {
        unregTbody.innerHTML = sortedUnreg.map(m => `
            <tr>
                <td>${m.generation}기</td>
                <td><b>${m.name}</b></td>
            </tr>
        `).join('');
    }

    // Update sort icons
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('onclick')?.includes(`'${sortConfig.key}'`)) {
            th.classList.add(sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function sortData(data, key, direction) {
    return [...data].sort((a, b) => {
        let vA = a[key];
        let vB = b[key];
        if (vA === null || vA === undefined) vA = '';
        if (vB === null || vB === undefined) vB = '';
        if (vA < vB) return direction === 'asc' ? -1 : 1;
        if (vA > vB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function sortTable(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }
    renderTables();
}

function filterData() {
    renderTables();
}

function updateSummary() {
    const regCount = participants.filter(p => p.isRegistered).length;
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) totalCountEl.textContent = masterMembers.length;
    const regCountEl = document.getElementById('regCount');
    if (regCountEl) regCountEl.textContent = regCount;
    const depositCountEl = document.getElementById('depositCount');
    if (depositCountEl) depositCountEl.textContent = participants.filter(p => p.isDepositConfirmed).length;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Carpool seats row visibility listener
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'edit-carpoolAvailable') {
            const row = document.getElementById('edit-carpool-seats-row');
            if (row) row.style.display = e.target.value === 'true' ? 'block' : 'none';
        }
    });
});

// Attach globals for HTML handlers
window.switchTab = switchTab;
window.doLogin = doLogin;
window.logout = logout;
window.addFee = addFee;
window.deleteFee = deleteFee;
window.toggleWaitlist = toggleWaitlist;
window.toggleDeposit = toggleDeposit;
window.deleteParticipant = deleteParticipant;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveParticipantEdit = saveParticipantEdit;
window.resetPassword = resetPassword;
window.uploadCsv = uploadCsv;
window.saveSettings = saveSettings;
window.addDay = addDay;
window.removeDay = removeDay;
window.addMissions = addMissions;
window.deleteMission = deleteMission;
window.matchManitto = matchManitto;
window.updateManittoAssignmentLocal = updateManittoAssignmentLocal;
window.saveSingleAssignment = saveSingleAssignment;
window.addTimeline = addTimeline;
window.removeTimeline = removeTimeline;
window.updateDay = updateDay;
window.updateTimeline = updateTimeline;
window.sortTable = sortTable;
window.resetSettings = resetSettings;
window.resetParticipants = resetParticipants;

// --- DANGER ZONE ---
async function resetSettings() {
    if (!await confirm('정말 웹사이트 설정을 모두 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/reset-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include'
        });
        if (res.status === 401) {
            await alert('비밀번호가 일치하지 않거나 권한이 없습니다.');
            return;
        }
        if (res.ok) {
            await alert('✅ 설정이 안전하게 초기화되었습니다.');
            loadSettings();
        } else {
            await alert('초기화 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function resetParticipants() {
    if (!await confirm('정말 모든 참가 신청 정보와 마니또 기록을 삭제하시겠습니까?\n(동문 명단과 회비 내역은 유지됩니다)')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/reset-participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include'
        });
        if (res.status === 401) {
            await alert('비밀번호가 일치하지 않거나 권한이 없습니다.');
            return;
        }
        if (res.ok) {
            await alert('✅ 모든 참가 정보가 안전하게 초기화되었습니다.');
            loadParticipants();
        } else {
            await alert('초기화 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}
window.filterData = filterData;
window.fetchData = fetchData;
