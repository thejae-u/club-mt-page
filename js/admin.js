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
    if (tabId === 'modifications') loadModifications();
    if (tabId === 'accounts') loadAdmins();
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

// --- MODIFICATION MANAGEMENT (TODO) ---
async function loadModifications() {
    const tbody = document.getElementById('modificationList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Modification`, { credentials: 'include' });
        if (res.status === 401) return logout(true);
        if (!res.ok) throw new Error();

        const tasks = await res.json();
        if (tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">등록된 수정 요청이 없습니다.</td></tr>';
            return;
        }

        const statusMap = {
            'Pending': { label: '대기중', color: '#999' },
            'InProgress': { label: '진행중', color: '#F5A623' },
            'Completed': { label: '완료', color: '#22C55E' }
        };

        tbody.innerHTML = tasks.map(t => {
            const commentsHtml = (t.comments || []).map(c => `
                <div style="font-size:11px; padding:6px 10px; background:#f0f2f5; border-radius:8px; margin-top:5px; display:flex; justify-content:space-between; align-items:flex-start; group/cmt;">
                    <div style="flex:1;">
                        <span style="font-weight:700; color:var(--blue-deep);">${escapeHTML(c.author)}:</span>
                        <span style="color:#333;">${escapeHTML(c.content)}</span>
                        <span style="font-size:9px; color:#999; margin-left:5px;">${new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    ${c.author === window.currentAdminUser ? `
                        <button onclick="deleteModificationComment(${c.id}, ${t.id})" style="background:none; border:none; color:#E5484D; cursor:pointer; padding:0; margin:0 0 0 8px; font-size:10px; width:auto; box-shadow:none;">삭제</button>
                    ` : ''}
                </div>
            `).join('');

            return `
            <tr style="border-bottom: 2px solid #eee;">
                <td style="vertical-align: top; padding-top: 15px;">
                    <select onchange="updateModificationStatus(${t.id}, this.value)" style="font-size:11px; padding:2px; border-radius:4px; border:1.5px solid ${statusMap[t.status]?.color || '#ddd'};">
                        <option value="Pending" ${t.status === 'Pending' ? 'selected' : ''}>⏳ 대기</option>
                        <option value="InProgress" ${t.status === 'InProgress' ? 'selected' : ''}>⚙️ 진행</option>
                        <option value="Completed" ${t.status === 'Completed' ? 'selected' : ''}>✅ 완료</option>
                    </select>
                </td>
                <td style="text-align:left; vertical-align: top; padding-bottom: 15px;">
                    <div style="font-weight:700; font-size:14px; ${t.status === 'Completed' ? 'text-decoration:line-through; color:#999;' : ''}">${escapeHTML(t.title)}</div>
                    <div style="font-size:12px; color:#666; margin-top:4px; white-space:pre-wrap;">${escapeHTML(t.description)}</div>
                    
                    <!-- Comments Section -->
                    <div id="comments-container-${t.id}" style="margin-top:12px; border-top:1px solid #f0f0f0; padding-top:8px;">
                        <div style="font-size:10px; font-weight:800; color:#999; margin-bottom:5px;">💬 댓글 ${t.comments?.length || 0}</div>
                        ${commentsHtml}
                        <div style="display:flex; gap:5px; margin-top:8px;">
                            <input type="text" id="comment-input-${t.id}" placeholder="의견을 남겨주세요..." style="font-size:11px; padding:6px; height:auto; flex:1;">
                            <button onclick="addModificationComment(${t.id})" style="width:auto; padding:0 12px; background:var(--blue-deep); color:white; font-size:11px; margin:0; border-radius:8px;">등록</button>
                        </div>
                    </div>
                </td>
                <td style="vertical-align: top; padding-top: 15px;"><span style="font-size:12px;">${escapeHTML(t.requestedBy)}</span></td>
                <td style="vertical-align: top; padding-top: 15px;"><span style="font-size:11px; color:#999;">${new Date(t.createdAt).toLocaleDateString()}</span></td>
                <td style="vertical-align: top; padding-top: 15px;">
                    <button onclick="deleteModification(${t.id})" style="padding:4px 8px; background:#ff4d4d; color:white; font-size:11px; margin:0; width:auto;">삭제</button>
                </td>
            </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">데이터 로드 실패</td></tr>';
    }
}

async function addModificationComment(taskId) {
    const input = document.getElementById(`comment-input-${taskId}`);
    const content = input?.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API_BASE}/Modification/${taskId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            loadModifications(); // Reload to show new comment
        } else {
            const err = await res.text();
            await alert(`댓글 등록 실패: ${err}`);
        }
    } catch (e) { await alert('서버 오류'); }
}

async function deleteModificationComment(commentId, taskId) {
    if (!await confirm('댓글을 삭제하시겠습니까?')) return;

    try {
        const res = await fetch(`${API_BASE}/Modification/comments/${commentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.status === 403) return await alert('삭제 권한이 없습니다. (본인만 삭제 가능)');
        if (res.ok) {
            loadModifications();
        } else {
            await alert('댓글 삭제 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function addModification() {
    const title = document.getElementById('mod-title').value;
    const description = document.getElementById('mod-desc').value;

    if (!title.trim()) return await alert('제목을 입력해주세요.');

    try {
        const res = await fetch(`${API_BASE}/Modification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description }),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            document.getElementById('mod-title').value = '';
            document.getElementById('mod-desc').value = '';
            loadModifications();
        } else {
            await alert('등록 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function updateModificationStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/Modification/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(status),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            loadModifications();
        } else {
            await alert('상태 변경 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

async function deleteModification(id) {
    if (!await confirm('이 요청을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Modification/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            loadModifications();
        } else {
            await alert('삭제 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}

// --- ADMIN ACCOUNT MANAGEMENT ---
async function loadAdmins() {
    const tbody = document.getElementById('adminAccountList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Management/admins`, { credentials: 'include' });
        if (res.status === 401) return logout(true);
        if (!res.ok) throw new Error();

        const admins = await res.json();
        tbody.innerHTML = admins.map(a => `
            <tr>
                <td>${a.id}</td>
                <td style="text-align:left;"><b>${escapeHTML(a.username)}</b></td>
                <td><span style="font-size:12px; color:#999;">${new Date(a.createdAt).toLocaleDateString()}</span></td>
                <td>
                    <button onclick="deleteAdminAccount(${a.id}, '${a.username}')" style="padding:4px 8px; background:#ff4d4d; color:white; font-size:11px; margin:0; width:auto;">삭제</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">데이터 로드 실패</td></tr>';
    }
}

async function addAdminAccount() {
    const username = document.getElementById('new-admin-username').value;
    const password = document.getElementById('new-admin-password').value;

    if (!username || !password) return await alert('아이디와 비밀번호를 모두 입력해주세요.');

    try {
        const res = await fetch(`${API_BASE}/Management/admins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            await alert('✅ 새로운 관리자 계정이 생성되었습니다.');
            document.getElementById('new-admin-username').value = '';
            document.getElementById('new-admin-password').value = '';
            loadAdmins();
        } else {
            const err = await res.text();
            await alert(`❌ 생성 실패: ${err}`);
        }
    } catch (e) { await alert('서버 오류'); }
}

async function deleteAdminAccount(id, username) {
    if (!await confirm(`정말 '${username}' 관리자 계정을 삭제하시겠습니까?`)) return;
    try {
        const res = await fetch(`${API_BASE}/Management/admins/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            await alert('✅ 삭제되었습니다.');
            loadAdmins();
        } else {
            const err = await res.text();
            await alert(`❌ 삭제 실패: ${err}`);
        }
    } catch (e) { await alert('서버 오류'); }
}

async function loadManittoTab() {
    await loadMissions();
    await loadAssignments();
    
    // Update Publish Button State
    try {
        const res = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
        if (res.ok) {
            const s = await res.json();
            const btnShow = document.getElementById('btnShowManitto');
            const btnHide = document.getElementById('btnHideManitto');
            if (btnShow && btnHide) {
                // Dim the inactive button
                btnShow.style.opacity = s.isManittoPublic ? '1' : '0.4';
                btnShow.style.boxShadow = s.isManittoPublic ? '0 4px 12px rgba(45,70,141,0.3)' : 'none';
                btnHide.style.opacity = s.isManittoPublic ? '0.4' : '1';
                btnHide.style.boxShadow = s.isManittoPublic ? 'none' : '0 4px 12px rgba(0,0,0,0.1)';
            }
        }
    } catch (e) {}
}

async function setManittoVisibility(shouldBePublic) {
    // Check current state first to avoid redundant calls
    try {
        const resSettings = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
        if (resSettings.ok) {
            const s = await resSettings.json();
            if (s.isManittoPublic === shouldBePublic) {
                await alert(`이미 ${shouldBePublic ? '공개' : '비공개'} 상태입니다.`);
                return;
            }
        }
    } catch (e) {}

    if (!await confirm(`마니또 정보를 ${shouldBePublic ? '공개' : '숨김'} 처리하시겠습니까?`)) return;

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/toggle-visibility`, { 
            method: 'POST', 
            credentials: 'include' 
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            const data = await res.json();
            await alert(data.message);
            loadManittoTab();
        }
    } catch (e) { await alert('서버 오류'); }
}

async function checkAuth() {
    const adminContent = document.getElementById('adminContent');
    const loginOverlay = document.getElementById('loginOverlay');
    
    try {
        const res = await fetch(`${API_BASE}/Auth/status`, { credentials: 'include' });
        if (res.ok) {
        const data = await res.json();
        window.currentAdminUser = data.username; // Save for permission checks
        if (loginOverlay) loginOverlay.style.display = 'none';

            if (adminContent) adminContent.style.visibility = 'visible';
            
            // Show/Hide Account Management tab based on username
            const accountTabBtn = document.querySelector('.tab-btn[onclick*="switchTab(\'accounts\')"]');
            if (accountTabBtn) {
                accountTabBtn.style.display = (data.username === 'admin') ? 'inline-block' : 'none';
            }

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
            <div class="mission-item">
                <div class="mission-content">
                    <input type="checkbox" class="mission-checkbox" data-id="${m.id}">
                    <span class="mission-text">${i + 1}. ${escapeHTML(m.description)}</span>
                </div>
                <button onclick="deleteMission(${m.id})" style="width:auto; padding:6px 12px; background:#ff4d4d; color:white; font-size:11px; margin:0; flex-shrink:0;">삭제</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '데이터를 불러오지 못했습니다.';
    }
}

function toggleSelectAllMissions(checked) {
    document.querySelectorAll('.mission-checkbox').forEach(cb => cb.checked = checked);
}

async function deleteSelectedMissions() {
    const selectedIds = Array.from(document.querySelectorAll('.mission-checkbox:checked'))
        .map(cb => parseInt(cb.getAttribute('data-id')));

    if (selectedIds.length === 0) return await alert('삭제할 미션을 선택해주세요.');

    if (!await confirm(`${selectedIds.length}개의 미션을 삭제하시겠습니까?`)) return;

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions/delete-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedIds),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            await alert('✅ 선택한 미션이 삭제되었습니다.');
            const selectAll = document.getElementById('selectAllMissions');
            if (selectAll) selectAll.checked = false;
            loadMissions();
        } else {
            await alert('삭제 실패');
        }
    } catch (e) { await alert('서버 오류'); }
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
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#999;">신청자가 없거나 매칭 데이터가 없습니 다.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(a => `
            <tr>
                <td><b>${a.name}</b> (${a.generation}기)</td>
                <td>
                    <select onchange="updateManittoAssignmentLocal(${a.id}, 'TargetId', this.value)" style="font-size:11px; padding:4px; width:100%;">
                        <option value="">선택 안함</option>
                        ${list.map(p => `<option value="${p.id}" ${p.id === a.manittoTargetId ? 'selected' : ''}>${p.name} (${p.generation}기)</option>`).join('')}
                    </select>
                </td>
                <td style="text-align:left; font-size:12px;">
                    ${a.missions && a.missions.length > 0 ? a.missions.map((m, idx) => `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #f0f0f0;">
                            <span style="color:${m.isComplete ? '#22C55E' : '#ccc'}; font-size:10px; flex-shrink:0;">●</span>
                            <select onchange="updateManittoAssignmentLocal(${a.id}, 'MissionId', this.value, ${idx})" style="font-size:11px; padding:2px; flex:1; border:none; background:transparent;">
                                ${(window.currentMissions || []).map(mm => `<option value="${mm.id}" ${mm.id === m.missionId ? 'selected' : ''}>${escapeHTML(mm.description)}</option>`).join('')}
                            </select>
                        </div>
                    `).join('') : '<span style="color:#999;">미션 없음</span>'}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function updateManittoAssignmentLocal(participantId, field, value, index = null) {
    const original = window.currentAssignments.find(a => a.id === participantId);
    if (!original) return;

    const payload = {
        targetId: field === 'TargetId' ? (value ? parseInt(value) : null) : original.manittoTargetId,
        missions: original.missions ? JSON.parse(JSON.stringify(original.missions)) : []
    };

    if (index !== null) {
        if (field === 'MissionId') payload.missions[index].missionId = parseInt(value);
        if (field === 'IsComplete') payload.missions[index].isComplete = value;
    }

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/assignments/${participantId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            // Update local state and re-render subtly if needed, or just reload
            const updatedIdx = window.currentAssignments.findIndex(a => a.id === participantId);
            const resData = await fetch(`${API_BASE}/Management/manitto/assignments`, { credentials: 'include' });
            if (resData.ok) {
                window.currentAssignments = await resData.json();
                loadAssignments();
            }
        } else {
            const err = await res.text();
            console.error(`저장 실패: ${err}`);
        }
    } catch (e) { console.error('서버 오류', e); }
}

async function resetManitto() {
    if (!await confirm('정말 마니또 배정 정보만 초기화하시겠습니까?\n참가 신청 내역은 유지됩니다.')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/reset-manitto`, {
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
            await alert('✅ 마니또 배정 정보가 초기화되었습니다.');
            loadAssignments();
        } else {
            await alert('초기화 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}


async function matchManitto() {
    const missionCount = parseInt(document.getElementById('manittoMissionCount')?.value || "3");
    if (!await confirm(`정말 마니또 랜덤 매칭을 실행하시겠습니까?\n인당 ${missionCount}개의 미션이 부여됩니다.\n기존 매칭 정보는 모두 초기화됩니다.`)) return;

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(missionCount),
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
        const mmc = document.getElementById('manittoMissionCount');
        if (mmc) mmc.value = s.manittoMissionCount || 3;

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
        manittoMissionCount: parseInt(document.getElementById('manittoMissionCount')?.value || "3"),
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

async function exportSettings() {
    try {
        const res = await fetch(`${API_BASE}/Settings`, { credentials: 'include' });
        if (!res.ok) {
            if (res.status === 401) return logout(true);
            throw new Error();
        }
        
        const settings = await res.json();
        
        // Remove DB-specific fields if necessary, or keep them for full backup
        delete settings.id; 
        
        const dataStr = JSON.stringify(settings, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `clubmt_settings_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        await alert('설정 내보내기 실패');
    }
}

async function importSettings(input) {
    if (!input.files || !input.files[0]) return;
    
    if (!await confirm('파일의 설정 내용으로 현재 설정을 덮어씌우시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        input.value = '';
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            
            const res = await fetch(`${API_BASE}/Settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
                credentials: 'include'
            });

            if (res.status === 401) return logout(true);
            
            if (res.ok) {
                await alert('✅ 설정을 성공적으로 불러왔습니다.');
                loadSettings(); // UI 갱신
            } else {
                const msg = await res.text();
                await alert(`❌ 불러오기 실패: ${msg || '형식이 올바르지 않습니다.'}`);
            }
        } catch (err) {
            await alert('❌ JSON 파일 파싱 실패: 파일 형식을 확인해주세요.');
        } finally {
            input.value = '';
        }
    };
    
    reader.readAsText(file);
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
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.addDay = addDay;
window.removeDay = removeDay;
window.addMissions = addMissions;
window.deleteMission = deleteMission;
window.toggleSelectAllMissions = toggleSelectAllMissions;
window.deleteSelectedMissions = deleteSelectedMissions;
window.setManittoVisibility = setManittoVisibility;
window.matchManitto = matchManitto;
window.updateManittoAssignmentLocal = updateManittoAssignmentLocal;
window.addModification = addModification;
window.addModificationComment = addModificationComment;
window.deleteModificationComment = deleteModificationComment;
window.deleteModification = deleteModification;
window.updateModificationStatus = updateModificationStatus;
window.addAdminAccount = addAdminAccount;
window.deleteAdminAccount = deleteAdminAccount;
window.addTimeline = addTimeline;
window.removeTimeline = removeTimeline;
window.updateDay = updateDay;
window.updateTimeline = updateTimeline;
window.sortTable = sortTable;
window.resetSettings = resetSettings;
window.resetParticipants = resetParticipants;
window.resetManitto = resetManitto;

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
            if (document.getElementById('manittoAssignmentList')) loadAssignments();
        } else {
            await alert('초기화 실패');
        }
    } catch (e) { await alert('서버 오류'); }
}
window.filterData = filterData;
window.fetchData = fetchData;
