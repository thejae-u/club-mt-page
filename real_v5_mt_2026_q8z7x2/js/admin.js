const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://api-mt.thejaeu.com/api';
const IMAGE_BASE = API_BASE.replace(/\/api$/, '');

// ===== MESSAGE CONSTANTS =====
const MSG = {
    SERVER_ERROR: "서버 오류",
    DELETE_SUCCESS: "✅ 삭제되었습니다.",
    DELETE_FAILED: "삭제 실패",
    SAVE_SUCCESS: "✅ 저장되었습니다.",
    SAVE_FAILED: "저장 실패",
    PERMISSION_DENIED: "삭제 권한이 없습니다. (본인만 삭제 가능)",
    INPUT_REQUIRED: "필수인 항목을 모두 입력해주세요.",
    SESSION_EXPIRED: "세션이 만료되었습니다. 다시 로그인해주세요.",
};

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
    if (tabId === 'cooking') loadCookingTab();
    if (tabId === 'vehicle') loadVehicleTab();
    if (tabId === 'volleyball') loadVolleyballTab();
    if (tabId === 'photo') fetchPhotoSessions();
    if (tabId === 'board') loadBoard();
    if (tabId === 'modifications') loadModifications();
    if (tabId === 'accounts') loadAdmins();
}

async function loadBoard() {
    const tbody = document.getElementById('boardList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Manitto/reports`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
        const res = await fetch(`${API_BASE}/Manitto/reports/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' }, 
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            loadBoard();
        } else {
            await alert(MSG.DELETE_FAILED);
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

// --- MODIFICATION MANAGEMENT (TODO) ---
async function loadModifications() {
    const tbody = document.getElementById('modificationList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Modification`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
                <div style="font-size:11px; padding:6px 10px; background:#f0f2f5; border-radius:8px; margin-top:5px; display:flex; justify-content:space-between; align-items:flex-start;">
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
        const res = await fetch(`${API_BASE}/Modification/${taskId}/comments`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function deleteModificationComment(commentId, taskId) {
    if (!await confirm('댓글을 삭제하시겠습니까?')) return;

    try {
        const res = await fetch(`${API_BASE}/Modification/comments/${commentId}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.status === 403) return await alert(MSG.PERMISSION_DENIED);
        if (res.ok) {
            
            loadModifications();
        } else {
            await alert('댓글 삭제 실패');
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function addModification() {
    const title = document.getElementById('mod-title').value;
    const description = document.getElementById('mod-desc').value;

    if (!title.trim()) return await alert('제목을 입력해주세요.');

    try {
        const res = await fetch(`${API_BASE}/Modification`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function updateModificationStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/Modification/${id}/status`, { method: 'PATCH', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(status),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            loadModifications();
        } else {
            await alert('상태 변경 실패');
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function deleteModification(id) {
    if (!await confirm('이 요청을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Modification/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            loadModifications();
        } else {
            await alert(MSG.DELETE_FAILED);
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

// --- ADMIN ACCOUNT MANAGEMENT ---
async function loadAdmins() {
    const tbody = document.getElementById('adminAccountList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Management/admins`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
        const res = await fetch(`${API_BASE}/Management/admins`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function deleteAdminAccount(id, username) {
    if (!await confirm(`정말 '${username}' 관리자 계정을 삭제하시겠습니까?`)) return;
    try {
        const res = await fetch(`${API_BASE}/Management/admins/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            await alert(MSG.DELETE_SUCCESS);
            loadAdmins();
        } else {
            const err = await res.text();
            await alert(`❌ 삭제 실패: ${err}`);
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function loadManittoTab() {
    await loadMissions();
    await loadAssignments();
    
    // Update Publish Button State
    try {
        const res = await fetch(`${API_BASE}/Settings`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) {
            
            const s = await res.json();
            if (!window.currentSettings) window.currentSettings = {};
            window.currentSettings.isManittoPublic = s.isManittoPublic;
            window.currentSettings.isManittoMissionPublic = s.isManittoMissionPublic;

            const btn = document.getElementById('btnToggleManittoPublic');
            if (btn) {
                if (s.isManittoPublic) {
                    btn.textContent = "✅ 마니또 공개 상태";
                    btn.style.background = "#22C55E";
                } else {
                    btn.textContent = "🔒 마니또 비공개 상태";
                    btn.style.background = "#212529";
                }
            }

            const btnMission = document.getElementById('btnToggleManittoMissionPublic');
            if (btnMission) {
                if (s.isManittoMissionPublic) {
                    btnMission.textContent = "✅ 미션 공개 상태";
                    btnMission.style.background = "#22C55E";
                } else {
                    btnMission.textContent = "🔒 미션 비공개 상태";
                    btnMission.style.background = "#212529";
                }
            }
        }
    } catch (e) {}
}

async function toggleManittoVisibility() {
    try {
        const res = await fetch(`${API_BASE}/Management/manitto/toggle-visibility`, { headers: { 'X-ClubMT-Source': 'WebApp' }, 
            method: 'POST', 
            credentials: 'include' 
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            const data = await res.json();
            await alert(data.message);
            loadManittoTab();
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function toggleManittoMissionVisibility() {
    try {
        const res = await fetch(`${API_BASE}/Management/manitto/toggle-mission-visibility`, { headers: { 'X-ClubMT-Source': 'WebApp' }, 
            method: 'POST', 
            credentials: 'include' 
        });
        if (res.status === 401) return logout(true);
        if (res.status === 400) {
            const err = await res.text();
            let errMsg = err;
            try {
                const errObj = JSON.parse(err);
                if (errObj.message) errMsg = errObj.message;
            } catch(e) {}
            await alert(`❌ ${errMsg}`);
            return;
        }
        if (res.ok) {
            const data = await res.json();
            await alert(data.message);
            loadManittoTab();
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function checkAuth() {
    const adminContent = document.getElementById('adminContent');
    const loginOverlay = document.getElementById('loginOverlay');
    
    try {
        const res = await fetch(`${API_BASE}/Auth/status`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
            headers: { 
                'Content-Type': 'application/json',
                'X-ClubMT-Source': 'WebApp'
            },
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
        await fetch(`${API_BASE}/auth/logout`, { headers: { 'X-ClubMT-Source': 'WebApp' }, method: 'POST', credentials: 'include' });
    } catch (e) {}
    location.href = 'manager-hq';
}

// --- MANITTO MANAGEMENT ---
async function loadMissions() {
    const container = document.getElementById('missionListContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
        const res = await fetch(`${API_BASE}/Management/manitto/missions/delete-batch`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
            await alert(MSG.DELETE_FAILED);
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function addMissions() {
    const text = document.getElementById('new-missions').value;
    if (!text.trim()) return await alert('미션 내용을 입력해주세요.');

    const missionList = text.split('\n').map(m => m.trim()).filter(m => m !== "");
    if (missionList.length === 0) return await alert('유효한 미션이 없습니다.');

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function deleteMission(id) {
    if (!await confirm('미션을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Management/manitto/missions/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadMissions();
    } catch (e) { await alert(MSG.DELETE_FAILED); }
}

async function loadAssignments() {
    const tbody = document.getElementById('manittoAssignmentList');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/assignments`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
        const res = await fetch(`${API_BASE}/Management/manitto/assignments/${participantId}`, { method: 'PUT', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            // Update local state and re-render subtly if needed, or just reload
            const updatedIdx = window.currentAssignments.findIndex(a => a.id === participantId);
            const resData = await fetch(`${API_BASE}/Management/manitto/assignments`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
        const res = await fetch(`${API_BASE}/Management/reset-manitto`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}


async function matchManitto() {
    const missionCount = parseInt(document.getElementById('manittoMissionCount')?.value || "3");
    if (!await confirm(`정말 마니또 랜덤 매칭을 실행하시겠습니까?\n인당 ${missionCount}개의 미션이 부여됩니다.\n기존 매칭 정보는 모두 초기화됩니다.`)) return;

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/Management/manitto/match`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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

// --- COOKING BATTLE MANAGEMENT ---
async function loadCookingTab() {
    await fetchData(); // To get all participants
    const apps = await loadCookingApplications();
    await updateCookingUI();

    // Fetch Cooking Battle Stats
    try {
        const res = await fetch(`${API_BASE}/Management/status`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) {
            
            const data = await res.json();
            const cb = data.cookingBattle;
            if (cb) {
                document.getElementById('stat-black-votes').textContent = `${cb.blackVotes || 0}표`;
                document.getElementById('stat-white-votes').textContent = `${cb.whiteVotes || 0}표`;
                document.getElementById('stat-black-cheers').textContent = `${cb.blackCheers || 0}점`;
                document.getElementById('stat-white-cheers').textContent = `${cb.whiteCheers || 0}점`;
                document.getElementById('stat-comment-count').textContent = `${cb.commentCount || 0}개`;
                document.getElementById('stat-app-count').textContent = `${cb.applicationCount || 0}명`;
                document.getElementById('stat-assign-count').textContent = `${cb.assignmentCount || 0}명`;
            }
        }
    } catch (e) { console.error('Failed to load cooking stats', e); }

    // Fetch Cooking Battle Assignments
    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/assignments`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) {
            
            const assignments = await res.json();
            const blackList = document.getElementById('admin-cooking-black-team');
            const whiteList = document.getElementById('admin-cooking-white-team');
            const spectatorList = document.getElementById('admin-cooking-spectator-team');

            const renderTeam = (teamName, container) => {
                const filtered = assignments.filter(a => a.team === teamName);
                if (filtered.length === 0) {
                    container.innerHTML = '<p style="color: #999;">배정된 인원이 없습니다.</p>';
                    return;
                }
                container.innerHTML = filtered.map(a => `
                    <div style="display:flex; flex-direction:column; background:white; padding:10px; border-radius:8px; border:1px solid #eee; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:700; font-size:14px;">${escapeHTML(a.name)} (${a.generation}기)</span>
                            <button onclick="deleteCookingAssignment(${a.id})" style="background:none; border:none; color:#ff4d4d; padding:0; cursor:pointer; width:auto; font-size:12px; margin:0;">삭제</button>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <select onchange="updateCookingAssignment(${a.id}, this)" data-type="team" style="padding:4px; font-size:11px; border-radius:4px; border:1px solid #ddd;">
                                <option value="Black" ${a.team === 'Black' ? 'selected' : ''}>흑팀</option>
                                <option value="White" ${a.team === 'White' ? 'selected' : ''}>백팀</option>
                                <option value="None" ${a.team === 'None' ? 'selected' : ''}>무소속</option>
                            </select>
                            <select onchange="updateCookingAssignment(${a.id}, this)" data-type="role" style="padding:4px; font-size:11px; border-radius:4px; border:1px solid #ddd;">
                                <option value="OrderChef" ${a.role === 'OrderChef' ? 'selected' : ''}>오더셰프</option>
                                <option value="Avatar" ${a.role === 'Avatar' ? 'selected' : ''}>아바타</option>
                                <option value="Assistant" ${a.role === 'Assistant' ? 'selected' : ''}>어시스턴트</option>
                                <option value="Spectator" ${a.role === 'Spectator' ? 'selected' : ''}>참관인</option>
                            </select>
                        </div>
                    </div>
                `).join('');
            };

            const renderSpectators = (container) => {
                const filtered = assignments.filter(a => a.team === 'None' || a.role === 'Spectator');
                if (filtered.length === 0) {
                    container.innerHTML = '<p style="color: #999; grid-column: span 2;">배정된 참관인이 없습니다.</p>';
                    return;
                }
                container.innerHTML = filtered.map(a => `
                    <div style="display:flex; flex-direction:column; background:white; padding:12px; border-radius:8px; border:1px solid #eee; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:700; font-size:14px;">${escapeHTML(a.name)} (${a.generation}기)</span>
                            <div style="display:flex; gap:8px;">
                                <button onclick="deleteCookingAssignment(${a.id})" style="background:none; border:none; color:#ff4d4d; padding:0; cursor:pointer; width:auto; font-size:11px; margin:0;">삭제</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <select onchange="updateCookingAssignment(${a.id}, this)" data-type="team" style="padding:4px; font-size:11px; border-radius:4px; border:1px solid #ddd;">
                                <option value="None" ${a.team === 'None' ? 'selected' : ''}>무소속</option>
                                <option value="Black" ${a.team === 'Black' ? 'selected' : ''}>흑팀</option>
                                <option value="White" ${a.team === 'White' ? 'selected' : ''}>백팀</option>
                            </select>
                            <select onchange="updateCookingAssignment(${a.id}, this)" data-type="role" style="padding:4px; font-size:11px; border-radius:4px; border:1px solid #ddd;">
                                <option value="Spectator" ${a.role === 'Spectator' ? 'selected' : ''}>참관인</option>
                                <option value="Avatar" ${a.role === 'Avatar' ? 'selected' : ''}>아바타</option>
                                <option value="Assistant" ${a.role === 'Assistant' ? 'selected' : ''}>어시스턴트</option>
                                <option value="OrderChef" ${a.role === 'OrderChef' ? 'selected' : ''}>오더셰프</option>
                            </select>
                        </div>
                        <div style="font-size:11px; color:#666; display:flex; gap:12px; border-top:1px solid #f0f0f0; padding-top:8px;">
                            <span>응원 가능: <b style="color:var(--blue-deep);">${a.remainingCheers}</b></span>
                            <span>투표: <b style="${a.voteTeam ? 'color:#E5484D;' : 'color:#999;'}">${a.voteTeam ? (a.voteTeam === 'Black' ? '⚫ 흑팀' : '⚪ 백팀') : '미완료'}</b></span>
                        </div>
                        <div style="font-size:11px; color:#666;">
                            <div style="font-weight:700; margin-bottom:4px;">💬 한줄평 내역 (${a.comments.length})</div>
                            <div style="max-height:80px; overflow-y:auto; background:#f9f9f9; padding:6px; border-radius:4px; line-height:1.4;">
                                ${a.comments.length > 0 
                                    ? a.comments.map(c => `<div style="margin-bottom:6px; border-bottom:1px dashed #eee; padding-bottom:4px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                                        <div>
                                            <span style="color:${c.team === 'Black' ? '#333' : '#2D468D'}; font-weight:700;">[${c.team === 'Black' ? '흑' : '백'}]</span> ${escapeHTML(c.content)}
                                        </div>
                                        <button onclick="deleteCookingComment(${c.id})" style="background:none; border:none; color:#ff4d4d; padding:0; cursor:pointer; width:auto; font-size:10px; margin:0; flex-shrink:0;">삭제</button>
                                      </div>`).join('') 
                                    : '<span style="color:#ccc;">작성한 평이 없습니다.</span>'}
                            </div>
                        </div>
                    </div>
                `).join('');
            };

            if (blackList) renderTeam('Black', blackList);
            if (whiteList) renderTeam('White', whiteList);
            if (spectatorList) renderSpectators(spectatorList);
        }
    } catch (e) { console.error('Failed to load assignments', e); }
    
    // Fill Chef Selects
    const bSel = document.getElementById('blackChefId');
    const wSel = document.getElementById('whiteChefId');
    const options = apps.map(a => `<option value="${a.participantId}">${a.name} (${a.generation}기)</option>`).join('');
    if (bSel && wSel) {
        const noneOpt = '<option value="0">선택 안함</option>';
        bSel.innerHTML = noneOpt + options;
        wSel.innerHTML = noneOpt + options;

        // Auto-select current chefs
        try {
            const resA = await fetch(`${API_BASE}/Management/cooking-battle/assignments`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
            if (resA.ok) {
                const assignments = await resA.ok ? await resA.json() : [];
                const bChef = assignments.find(a => a.team === 'Black' && a.role === 'OrderChef');
                const wChef = assignments.find(a => a.team === 'White' && a.role === 'OrderChef');
                if (bChef) bSel.value = bChef.participantId;
                if (wChef) wSel.value = wChef.participantId;
            }
        } catch (e) {}
    }

    // Fill Excluded List
    const exList = document.getElementById('cookingExcludedList');
    if (exList) {
        exList.innerHTML = participants.map(p => `
            <label style="display:flex; align-items:center; gap:4px; font-size:11px; background:white; padding:4px 8px; border-radius:4px; border:1px solid #eee;">
                <input type="checkbox" name="cookingExcluded" value="${p.id}"> ${p.name}
            </label>
        `).join('');
    }
}

async function loadCookingApplications() {
    const tbody = document.getElementById('cookingAppList');
    if (!tbody) return [];

    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/applications`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.status === 401) { logout(true); return []; }
        const apps = await res.json();
        
        if (apps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">지원자가 없습니다.</td></tr>';
            return [];
        }

        tbody.innerHTML = apps.map(a => `
            <tr>
                <td>${escapeHTML(a.name)} (${a.generation}기)</td>
                <td style="font-size:12px;">${escapeHTML(a.experience || '')}</td>
                <td style="font-size:12px;">${escapeHTML(a.signatureDish || '')}</td>
                <td style="font-size:11px; color:#999;">${new Date(a.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
        return apps;
    } catch (e) { return []; }
}

async function updateCookingUI() {
    try {
        const res = await fetch(`${API_BASE}/Settings`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) {
            
            const s = await res.json();
            window.currentSettings = s;
            const btnPub = document.getElementById('btnToggleCookingPublic');
            const btnChefPub = document.getElementById('btnToggleCookingChefPublic');
            const btnVote = document.getElementById('btnToggleCookingVote');

            if (btnPub) {
                if (s.isCookingBattlePublic) {
                    btnPub.textContent = "✅ 전체 공개 상태";
                    btnPub.style.background = "#22C55E";
                } else {
                    btnPub.textContent = "🔒 전체 비공개 상태";
                    btnPub.style.background = "#212529";
                }
            }
            if (btnChefPub) {
                if (s.isCookingBattleChefPublic) {
                    btnChefPub.textContent = "✅ 셰프 선공개 중";
                    btnChefPub.style.background = "#22C55E";
                } else {
                    btnChefPub.textContent = "🔒 셰프 명단 비공개";
                    btnChefPub.style.background = "#212529";
                }
            }
            if (btnVote) {
                if (s.isCookingBattleVotingActive) {
                    btnVote.textContent = "🗳️ 투표 진행 중";
                    btnVote.style.background = "#E5484D";
                } else {
                    btnVote.textContent = "⏹️ 투표 종료 상태";
                    btnVote.style.background = "#212529";
                }
            }
        }
    } catch (e) {}
}

async function toggleCookingVisibility() {
    if (!window.currentSettings) return;
    const newStatus = !window.currentSettings.isCookingBattlePublic;
    window.currentSettings.isCookingBattlePublic = newStatus;
    
    // Rule: When turning on full public, ensure chef public is also turned on.
    if (newStatus && !window.currentSettings.isCookingBattleChefPublic) {
        window.currentSettings.isCookingBattleChefPublic = true;
    }

    await saveSettings();
    updateCookingUI();
}

async function toggleCookingChefVisibility() {
    if (!window.currentSettings) return;

    // Rule: If full public is enabled, chef public must remain enabled.
    if (window.currentSettings.isCookingBattlePublic && window.currentSettings.isCookingBattleChefPublic) {
        await alert('전체 공개 상태에서는 셰프 명단을 비공개로 전환할 수 없습니다.');
        return;
    }

    const newStatus = !window.currentSettings.isCookingBattleChefPublic;
    
    const payload = { ...window.currentSettings, isCookingBattleChefPublic: newStatus };
    try {
        const res = await fetch(`${API_BASE}/Settings`, { method: 'PUT', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            window.currentSettings.isCookingBattleChefPublic = newStatus;
            updateCookingUI();
            await alert(newStatus ? '✅ 셰프 명단이 선공개되었습니다.' : '🔒 셰프 명단이 비공개 처리되었습니다.');
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function toggleCookingVoteStatus() {
    if (!window.currentSettings) return;
    window.currentSettings.isCookingBattleVotingActive = !window.currentSettings.isCookingBattleVotingActive;
    await saveSettings();
    updateCookingUI();
}

async function assignCookingTeams() {
    const blackChefId = parseInt(document.getElementById('blackChefId').value);
    const whiteChefId = parseInt(document.getElementById('whiteChefId').value);
    const excludedIds = Array.from(document.querySelectorAll('input[name="cookingExcluded"]:checked')).map(cb => parseInt(cb.value));

    if (!await confirm('팀 배정을 진행하시겠습니까? 기존 배정 정보는 삭제됩니다.')) return;

    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/assign-teams`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ blackChefId, whiteChefId, excludedParticipantIds: excludedIds }),
            credentials: 'include'
        });
        if (res.ok) {
            
            await alert('✅ 팀 배정이 완료되었습니다.');
            loadCookingTab();
        } else {
            alert('배정 실패');
        }
    } catch (e) { alert(MSG.SERVER_ERROR); }
}

async function updateCookingAssignment(id, el) {
    const container = el.closest('div');
    let team = container.querySelector('select[data-type="team"]').value;
    let role = container.querySelector('select[data-type="role"]').value;

    // Logic for transitions
    if (el.dataset.type === 'team') {
        if (team === 'None') {
            role = 'Spectator'; // If team is None, must be Spectator
        } else if (role === 'Spectator') {
            role = 'Assistant'; // If moved to team but role was Spectator, default to Assistant
        }
    } else if (el.dataset.type === 'role') {
        if (role === 'Spectator') {
            team = 'None'; // If role is Spectator, must be None team
        } else if (team === 'None') {
            team = 'Black'; // If changed to active role but team was None, default to Black (or similar)
        }
    }

    const roleMap = { 'OrderChef': 1, 'Avatar': 2, 'Assistant': 3, 'Spectator': 0 };
    const teamMap = { 'None': 0, 'Black': 1, 'White': 2 };

    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/assignments/${id}`, { method: 'PUT', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                team: teamMap[team], 
                role: roleMap[role] 
            }),
            credentials: 'include'
        });
        if (res.ok) {
            
            loadCookingTab();
        }
    } catch (e) { console.error(e); }
}

async function deleteCookingAssignment(id) {
    if (!await confirm('해당 배정을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/assignments/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.ok) {
            
            loadCookingTab();
        }
    } catch (e) { console.error(e); }
}

async function deleteCookingComment(id) {
    if (!await confirm('이 한줄평을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/comments/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.ok) {
            
            loadCookingTab();
        } else {
            const msg = await res.text();
            alert(`삭제 실패: ${msg}`);
        }
    } catch (e) { console.error(e); }
}

window.updateCookingAssignment = updateCookingAssignment;
window.deleteCookingAssignment = deleteCookingAssignment;
window.deleteCookingComment = deleteCookingComment;

async function resetCookingTeams() {
    if (!await confirm('오더 셰프를 제외한 팀 배정 정보를 초기화하시겠습니까?')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/reset-teams`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include' 
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            await alert('✅ 팀 배정 정보가 초기화되었습니다. (오더 셰프 유지)');
            loadCookingTab();
        } else {
            const msg = await res.text();
            await alert(`❌ 초기화 실패: ${msg || '알 수 없는 오류'}`);
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function resetCookingBattle() {
    if (!await confirm('정말 요리 배틀 데이터를 초기화하시겠습니까? (배정, 응원, 투표, 한줄평 모두 삭제)')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/cooking-battle/reset`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include' 
        });
        if (res.status === 401) {
            await alert('비밀번호가 일치하지 않거나 권한이 없습니다.');
            return;
        }
        if (res.ok) {
            
            await alert('✅ 초기화 완료');
            loadCookingTab();
        } else {
            await alert('초기화 실패');
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

// --- FEE MANAGEMENT ---
async function loadFees() {
    try {
        const [resList, resSummary] = await Promise.all([
            fetch(`${API_BASE}/Fee`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' }),
            fetch(`${API_BASE}/Fee/summary`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' })
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
        const res = await fetch(`${API_BASE}/Fee`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
        const res = await fetch(`${API_BASE}/Fee/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadFees();
    } catch (e) { await alert(MSG.DELETE_FAILED); }
}

// --- PARTICIPANT MANAGEMENT ---
const typeLabels = ['재학생', '졸업생', '휴학생', '군인', '기타'];
async function loadParticipants() {
    try {
        const sRes = await fetch(`${API_BASE}/Settings`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        const settings = await sRes.json();
        const MAX_GEN = settings.maxGeneralCapacity || 16;
        const MAX_ARMY = settings.maxMilitaryCapacity || 4;

        const res = await fetch(`${API_BASE}/Participants`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.status === 401) return logout(true);
        const list = await res.json();
        // Sort by SortOrder (Backend already sends it sorted, but this ensures it)
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        const tbody = document.getElementById('participantList');
        if (!tbody) return;
        
        const registered = list.filter(p => p.isRegistered && !p.isCancelRequested);
        const canceledOrRequested = list.filter(p => p.isCancelRequested || !p.isRegistered);

        const confirmedList = registered.filter(p => !p.isWaitlisted);
        const waitlistedList = registered.filter(p => p.isWaitlisted);

        const confirmedArmy = confirmedList.filter(p => p.type === 3).length;
        const confirmedGen = confirmedList.filter(p => p.type !== 3).length;

        // Render Active Participants
        if (registered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 30px; text-align: center; color: #999;">신청자가 없습니다.</td></tr>';
        } else {
            const confirmedHtml = confirmedList.map((p, index) => {
                const isArmy = p.type === 3;
                return `
                <tr>
                    <td style="font-size:12px; color:#999;">#${index + 1}</td>
                    <td><b>${p.name}</b></td>
                    <td>${typeLabels[p.type] || '기타'}</td>
                    <td>${p.generation}기</td>
                    <td style="font-size:12px;">${p.phoneNumber || '-'}</td>
                    <td style="white-space:nowrap;">
                        <div style="display:flex; align-items:center; gap:5px;">
                            <button onclick="toggleDeposit(${p.id})" style="padding: 2px 6px; background: ${p.isDepositConfirmed ? '#22C55E' : '#F5A623'}; color:white; font-size: 10px; margin:0; width:auto;">
                                ${p.isDepositConfirmed ? '입금완료' : '입금대기'}
                            </button>
                            <button onclick="toggleWaitlist(${p.id}, ${p.isDepositConfirmed})" style="width:auto; padding:2px 6px; background:#999; color:white; font-size:10px; margin:0;">
                                대기전환
                            </button>
                        </div>
                    </td>
                    <td style="text-align: center; display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="openEditModal(${p.id})" style="padding: 4px 8px; background: var(--blue-deep); color:white; font-size: 11px; margin:0; width:auto;">수정</button>
                    </td>
                </tr>`;
            }).join('');

            const waitlistedHtml = waitlistedList.map((p, index) => {
                const isArmy = p.type === 3;
                const isFull = isArmy ? (confirmedArmy >= MAX_ARMY) : (confirmedGen >= MAX_GEN);
                return `
                <tr style="background: #FFF0F0;">
                    <td style="font-size:11px; color:#E5484D; font-weight:700;">대기 ${index + 1}</td>
                    <td><b>${p.name} <span style="color:#E5484D; font-size:10px;">(대기)</span></b></td>
                    <td>${typeLabels[p.type] || '기타'}</td>
                    <td>${p.generation}기</td>
                    <td style="font-size:12px;">${p.phoneNumber || '-'}</td>
                    <td style="white-space:nowrap;">
                        <div style="display:flex; align-items:center; gap:5px;">
                             <button onclick="toggleWaitlist(${p.id}, ${p.isDepositConfirmed})" 
                                     title="${isFull ? '정원이 가득 찼습니다. 설정에서 정원을 늘려주세요.' : '확정 인원으로 승인'}"
                                     style="width:auto; padding:2px 6px; background:${isFull ? '#999' : '#E5484D'}; color:white; font-size:10px; margin:0; cursor:pointer;">
                                승인
                             </button>
                        </div>
                    </td>
                    <td style="text-align: center; display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="openEditModal(${p.id})" style="padding: 4px 8px; background: var(--blue-deep); color:white; font-size: 11px; margin:0; width:auto;">수정</button>
                    </td>
                </tr>`;
            }).join('');

            tbody.innerHTML = confirmedHtml + waitlistedHtml;
        }

        // Render Cancelled or Requested Participants
        const cancelTbody = document.getElementById('cancelList');
        if (cancelTbody) {
            if (canceledOrRequested.length === 0) {
                cancelTbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #999;">취소(요청)자가 없습니다.</td></tr>';
            } else {
                cancelTbody.innerHTML = canceledOrRequested.map(p => {
                    return `
                    <tr style="${p.isCancelRequested ? 'background: #FFF9E6;' : 'background: #f8f9fa; opacity: 0.8;'}">
                        <td><b>${p.name}</b> <span style="color:${p.isCancelRequested ? '#F5A623' : '#999'}; font-size:10px;">(${p.isCancelRequested ? '취소요청' : '취소완료'})</span></td>
                        <td>${typeLabels[p.type] || '기타'}</td>
                        <td>${p.generation}기</td>
                        <td style="font-size:12px;">${p.phoneNumber || '-'}</td>
                        <td>
                            <span style="font-size:11px; font-weight:700; color:${p.isCancelRequested ? '#F5A623' : '#999'};">
                                ${p.isCancelRequested ? '요청 대기중' : '완료됨'}
                            </span>
                        </td>
                        <td style="text-align: center; display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            ${p.isCancelRequested ? 
                                `<button onclick="approveCancel(${p.id})" style="padding: 4px 8px; background: #E5484D; color:white; font-size: 11px; margin:0; width:auto; border:1px solid #C0392B;">취소 승인</button>
                                 <button onclick="rejectCancel(${p.id})" style="padding: 4px 8px; background: #F5A623; color:white; font-size: 11px; margin:0; width:auto;">취소 반려</button>`
                                :
                                `<button onclick="deleteParticipant(${p.id})" style="padding: 4px 8px; background: #ff4d4d; color:white; font-size: 11px; margin:0; width:auto;">DB 삭제</button>`
                            }
                        </td>
                    </tr>`;
                }).join('');
            }
        }
    } catch (e) { console.error(e); }
}

async function openEditModal(id) {
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (!res.ok) return;
        const p = await res.json();
        
        document.getElementById('edit-id').value = p.id;
        document.getElementById('edit-name').value = p.name;
        document.getElementById('edit-generation').value = p.generation;
        document.getElementById('edit-type').value = p.type;
        document.getElementById('edit-phone').value = p.phoneNumber;
        document.getElementById('edit-studentId').value = p.studentId || "";
        document.getElementById('edit-participationCount').value = p.participationCount || 0;
        document.getElementById('edit-transportation').value = p.transportation || "Car";
        document.getElementById('edit-carpoolAvailable').value = p.isCarpoolAvailable ? "true" : "false";
        document.getElementById('edit-carpoolSeats').value = p.carpoolSeats || 0;
        document.getElementById('edit-departure').value = p.departureArea || "";
        const midJoin = p.midJoinDetails || p.MidJoinDetails || "";
        const schedule = p.participationSchedule || p.ParticipationSchedule || "Full";
        document.getElementById('edit-participationSchedule').value = schedule;
        document.getElementById('edit-midJoinDetails').value = midJoin;
        document.getElementById('edit-midJoinDetails-row').style.display = (schedule === 'Partial' ? 'block' : 'none');
        document.getElementById('edit-allergies').value = p.allergies || "";
        document.getElementById('edit-memoryOrExpectation').value = p.memoryOrExpectation || "";
        document.getElementById('edit-oneLineExpectation').value = p.oneLineExpectation || "";
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
        participationCount: parseInt(document.getElementById('edit-participationCount').value) || 0,
        transportation: document.getElementById('edit-transportation').value,
        isCarpoolAvailable: document.getElementById('edit-carpoolAvailable').value === "true",
        carpoolSeats: parseInt(document.getElementById('edit-carpoolSeats').value) || 0,
        departureArea: document.getElementById('edit-departure').value,
        participationSchedule: document.getElementById('edit-participationSchedule').value,
        midJoinDetails: document.getElementById('edit-midJoinDetails').value,
        allergies: document.getElementById('edit-allergies').value,
        memoryOrExpectation: document.getElementById('edit-memoryOrExpectation').value,
        oneLineExpectation: document.getElementById('edit-oneLineExpectation').value,
        remarks: document.getElementById('edit-remarks').value,
        hasDriverLicense: document.getElementById('edit-hasDriverLicense').value === "true",
        driverLicenseType: document.getElementById('edit-driverLicenseType').value,
        canDrive: document.getElementById('edit-canDrive').value === "true",
        drivingExperience: document.getElementById('edit-drivingExperience').value
    };

    try {
        const res = await fetch(`${API_BASE}/Participants/${id}`, { method: 'PUT', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (res.ok) {
            closeEditModal();
            loadParticipants();
            await alert('✅ 신청 정보가 수정되었습니다.');
        } else {
            await alert('수정 실패');
        }
    } catch (e) { await alert('서버 연결 오류'); }
}

async function resetPassword() {
    const id = document.getElementById('edit-id').value;
    if (!await confirm('비밀번호를 \'mt + 휴대폰 번호 뒷 4자리 + !!\' 패턴으로 초기화하시겠습니까? (예: mt1234!!)')) return;

    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/reset-password`, { headers: { 'X-ClubMT-Source': 'WebApp' },
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

async function toggleWaitlist(id, isDepositConfirmed) {
    if (isDepositConfirmed) {
        await alert("이미 입금완료된 신청자입니다.\n상태를 변경하려면 먼저 입금 확인을 해제해주세요.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/toggle-waitlist`, { headers: { 'X-ClubMT-Source': 'WebApp' }, 
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
        const res = await fetch(`${API_BASE}/Participants/${id}/toggle-deposit`, { headers: { 'X-ClubMT-Source': 'WebApp' }, 
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
        const res = await fetch(`${API_BASE}/Participants/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' }, 
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        loadParticipants();
    } catch (e) { await alert(MSG.DELETE_FAILED); }
}

async function approveCancel(id) {
    if (!await confirm('해당 참가자의 취소 요청을 승인하시겠습니까? 신청 내역이 초기화됩니다.')) return;
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/cancel`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
             
            await alert('취소가 승인되었습니다.'); 
            if (typeof loadParticipants === 'function' && document.getElementById('participantList')) loadParticipants();
            if (typeof loadRegisteredData === 'function' && document.getElementById('regTableBody')) loadRegisteredData();
        }
        else { await alert('취소 승인 실패'); }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function rejectCancel(id) {
    if (!await confirm('해당 참가자의 취소 요청을 반려하시겠습니까? 정상 신청 상태로 복구됩니다.')) return;
    try {
        const res = await fetch(`${API_BASE}/Participants/${id}/reject-cancel`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
             
            await alert('취소 요청이 반려되었습니다.'); 
            if (typeof loadParticipants === 'function' && document.getElementById('participantList')) loadParticipants();
            if (typeof loadRegisteredData === 'function' && document.getElementById('regTableBody')) loadRegisteredData();
        }
        else { await alert('취소 반려 실패'); }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
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
        const res = await fetch(`${API_BASE}/Management/import-csv`, { headers: { 'X-ClubMT-Source': 'WebApp' },
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
        const res = await fetch(`${API_BASE}/Settings`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (!res.ok) return;
        const s = await res.json();
        window.currentSettings = s;
        
        // Service Opening Settings
        if (s.openingDate) {
            let dateStr = s.openingDate;
            // 만약 서버에서 온 시간에 시간대 정보(Z)가 없다면 붙여줍니다. (UTC 보장)
            if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
                dateStr += 'Z';
            }
            const d = new Date(dateStr);
            const pad = (n) => String(n).padStart(2, '0');
            const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            document.getElementById('openingDate').value = localStr;
        }
        document.getElementById('isServiceOpen').checked = s.isServiceOpen;
        document.getElementById('isRegistrationActive').checked = s.isRegistrationActive;

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
        const mc = document.getElementById('maxCheerPerPerson');
        if (mc) mc.value = s.maxCheerPerPerson || 10;

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
    const openingDateValue = document.getElementById('openingDate').value;
    const openingDateObj = openingDateValue ? new Date(openingDateValue).toISOString() : new Date().toISOString();

    const payload = {
        openingDate: openingDateObj,
        isServiceOpen: document.getElementById('isServiceOpen').checked,
        isRegistrationActive: document.getElementById('isRegistrationActive').checked,
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
        isManittoPublic: window.currentSettings?.isManittoPublic || false,
        isManittoMissionPublic: window.currentSettings?.isManittoMissionPublic || false,
        isCookingBattlePublic: window.currentSettings?.isCookingBattlePublic || false,
        isCookingBattleChefPublic: window.currentSettings?.isCookingBattleChefPublic || false,
        isCookingBattleVotingActive: window.currentSettings?.isCookingBattleVotingActive || false,
        maxCheerPerPerson: parseInt(document.getElementById('maxCheerPerPerson')?.value || "10"),
        commonChecklistJson: JSON.stringify(document.getElementById('commonChecklist').value.split('\n').map(l => l.trim()).filter(l => l !== "")),
        scheduleDataJson: JSON.stringify(currentSchedule)
    };
    try {
        const res = await fetch(`${API_BASE}/Settings`, { method: 'PUT', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
        const res = await fetch(`${API_BASE}/Settings`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
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
            
            const res = await fetch(`${API_BASE}/Settings`, { method: 'PUT', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
let sortConfig = { key: 'createdAt', direction: 'asc' };

async function fetchData() {
    try {
        const [resParticipants, resMembers] = await Promise.all([
            fetch(`${API_BASE}/Participants`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' }),
            fetch(`${API_BASE}/Management/members`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' })
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
            <tr style="${p.isCancelRequested ? 'background: #FFF9E6;' : (p.isWaitlisted ? 'background: #FFF0F0;' : '')}">
                <td style="font-weight:700;">${p.name}${p.isWaitlisted ? ' <span style="color:#E5484D; font-size:10px; font-weight:normal;">(대기)</span>' : ''}${p.isCancelRequested ? ' <span style="color:#F5A623; font-size:10px; font-weight:normal;">(취소요청)</span>' : ''}</td>
                <td>${p.generation}기</td>
                <td><span class="badge" style="background:var(--blue-soft); color:var(--blue-deep);">${typeLabels[p.type] || '기타'}</span></td>
                <td>${formatPhone(p.phoneNumber)}</td>
                <td>${p.studentId || '-'}</td>
                <td>${p.participationCount > 0 ? p.participationCount + '회' : '처음'}</td>
                <td title="${p.midJoinDetails || p.MidJoinDetails || ''}">${(p.participationSchedule === 'Partial' || p.ParticipationSchedule === 'Partial') ? `<span style="color:#E5484D; font-weight:bold;">부분참여</span><br><span style="font-size:11px;color:#666">${p.midJoinDetails || p.MidJoinDetails || ''}</span>` : `<span style="color:#22C55E;">전체참여</span>`}</td>
                <td>${p.type === 3 ? (p.isMilitaryPriority ? `✅ 우선<br><span style="font-size:10px;color:#999">${p.militaryStatus || ''}</span>` : `일반<br><span style="font-size:10px;color:#999">${p.militaryStatus || ''}</span>`) : '-'}</td>
                <td style="color: ${p.isDepositConfirmed ? '#22C55E' : '#F5A623'}; font-weight:bold;">${p.isDepositConfirmed ? '완료' : '대기'}</td>
                <td>${p.transportation === 'Car' ? '🚗 자차' : '🚌 대중교통'}</td>
                <td>${p.isCarpoolAvailable ? `✅ ${p.carpoolSeats}석` : '-'}</td>
                <td>${p.departureArea || '-'}</td>
                <td>${p.hasDriverLicense ? `✅ (${p.driverLicenseType || '?'})` : '❌'}</td>
                <td>${p.canDrive ? '✅ 가능' : '❌ 불가능'}</td>
                <td>${p.drivingExperience || '-'}</td>
                <td style="color: #E8392D;">${p.allergies || '-'}</td>
                <td title="${p.memoryOrExpectation || ''}">${p.memoryOrExpectation || '-'}</td>
                <td title="${p.oneLineExpectation || ''}">${p.oneLineExpectation || '-'}</td>
                <td title="${p.remarks || ''}">${p.remarks || '-'}</td>
                <td style="font-size: 11px; color: #999;">${new Date(p.createdAt).toLocaleDateString()}</td>
                <td style="text-align: center; display: flex; gap: 4px; justify-content: center; align-items: center; height: 100%;">
                    ${p.isCancelRequested ? 
                        `<button onclick="approveCancel(${p.id})" style="padding: 4px 8px; background: #E5484D; color:white; font-size: 11px; margin:0; width:auto;">취소 승인</button>
                         <button onclick="rejectCancel(${p.id})" style="padding: 4px 8px; background: #F5A623; color:white; font-size: 11px; margin:0; width:auto;">반려</button>`
                        :
                        `<button onclick="deleteParticipant(${p.id})" style="padding: 4px 8px; background: #ff4d4d; color:white; font-size: 11px; margin:0; width:auto;">삭제</button>`
                    }
                </td>
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
window.toggleManittoVisibility = toggleManittoVisibility;
window.toggleManittoMissionVisibility = toggleManittoMissionVisibility;
window.matchManitto = matchManitto;
window.updateManittoAssignmentLocal = updateManittoAssignmentLocal;
window.addModification = addModification;
window.addModificationComment = addModificationComment;
window.deleteModificationComment = deleteModificationComment;
window.deleteModification = deleteModification;
window.updateModificationStatus = updateModificationStatus;
window.addAdminAccount = addAdminAccount;
window.deleteAdminAccount = deleteAdminAccount;
window.approveCancel = approveCancel;
window.rejectCancel = rejectCancel;
window.addTimeline = addTimeline;
window.removeTimeline = removeTimeline;
window.updateDay = updateDay;
window.updateTimeline = updateTimeline;
window.sortTable = sortTable;
window.resetSettings = resetSettings;
window.resetParticipants = resetParticipants;
window.resetManitto = resetManitto;
window.toggleCookingVisibility = toggleCookingVisibility;
window.toggleCookingChefVisibility = toggleCookingChefVisibility;
window.toggleCookingVoteStatus = toggleCookingVoteStatus;
window.assignCookingTeams = assignCookingTeams;
window.resetCookingTeams = resetCookingTeams;
window.resetCookingBattle = resetCookingBattle;

// --- DANGER ZONE ---
async function resetSettings() {
    if (!await confirm('정말 웹사이트 설정을 모두 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/reset-settings`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function resetParticipants() {
    if (!await confirm('정말 모든 참가 신청 정보와 마니또 기록을 삭제하시겠습니까?\n(동문 명단과 회비 내역은 유지됩니다)')) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Management/reset-participants`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
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
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}
window.filterData = filterData;
window.fetchData = fetchData;

// --- VEHICLE ASSIGNMENT MANAGEMENT ---
async function loadVehicleTab() {
    await fetchData(); // Populate global 'participants'

    // Load current assignments
    fetchAdminVehicleList();
    
    // Load current public status from settings
    try {
        const res = await fetch(`${API_BASE}/Settings`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) {
            
            const settings = await res.json();
            updateVehiclePublicUI(settings.isVehicleAssignmentPublic);
        }
    } catch (e) { console.error(e); }

    // Initialize OwnCar inputs if empty
    const container = document.getElementById('ownCarConfigContainer');
    if (container.children.length === 0) {
        addOwnCarInput(); // Add at least one
    }
}

function addOwnCarInput() {
    const container = document.getElementById('ownCarConfigContainer');
    const div = document.createElement('div');
    div.style = "display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: end;";
    
    // Driver Select
    const driverSelect = document.createElement('select');
    driverSelect.className = "own-car-driver";
    driverSelect.innerHTML = '<option value="">차장 선택 (없음)</option>' + 
        participants
            .filter(p => p.isRegistered && !p.isWaitlisted)
            .map(p => `<option value="${p.id}">${p.name} (${p.generation}기)</option>`).join('');
    
    // Capacity Input
    const capInput = document.createElement('input');
    capInput.type = "number";
    capInput.value = "4";
    capInput.min = "1";
    capInput.className = "own-car-capacity";
    capInput.placeholder = "정원";

    // Remove Btn
    const removeBtn = document.createElement('button');
    removeBtn.textContent = "✕";
    removeBtn.style = "width: auto; padding: 6px 10px; background: #999; color: white; margin: 0; cursor: pointer; border: none; border-radius: 4px;";
    removeBtn.onclick = () => div.remove();

    const formGroupDriver = document.createElement('div');
    formGroupDriver.className = "form-group";
    formGroupDriver.style.marginBottom = "0";
    formGroupDriver.innerHTML = '<label style="font-size:11px;">차장</label>';
    formGroupDriver.appendChild(driverSelect);

    const formGroupCap = document.createElement('div');
    formGroupCap.className = "form-group";
    formGroupCap.style.marginBottom = "0";
    formGroupCap.innerHTML = '<label style="font-size:11px;">정원</label>';
    formGroupCap.appendChild(capInput);

    div.appendChild(formGroupDriver);
    div.appendChild(formGroupCap);
    div.appendChild(removeBtn);
    container.appendChild(div);
}

async function generateVehicleAssignments() {
    if (!await confirm("랜덤 배정을 실행하시겠습니까? 기존 배정 데이터는 초기화됩니다.")) return;

    const vehicles = Array.from(document.querySelectorAll('#ownCarConfigContainer > div')).map(div => ({
        driverId: div.querySelector('.own-car-driver').value ? parseInt(div.querySelector('.own-car-driver').value) : null,
        capacity: parseInt(div.querySelector('.own-car-capacity').value) || 4
    }));

    try {
        const res = await fetch(`${API_BASE}/Vehicle/admin/generate`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicles }),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            await alert('✅ 랜덤 배정이 완료되었습니다.');
            fetchAdminVehicleList();
        } else {
            await alert('❌ 배정 실패');
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function fetchAdminVehicleList() {
    const container = document.getElementById('adminVehicleList');
    if (!container) return;

    try {
        if (participants.length === 0) await fetchData();

        const res = await fetch(`${API_BASE}/Vehicle/all`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.status === 401) return logout(true);
        if (!res.ok) throw new Error('Failed to fetch vehicles');

        const data = await res.json();
        const vehicles = data.vehicles;

        // Get list of all assigned participant IDs to filter the dropdown
        const allAssignedIds = new Set();
        vehicles.forEach(v => {
            if (v.driver) allAssignedIds.add(v.driver.id.toString());
            v.passengers.forEach(p => allAssignedIds.add(p.id.toString()));
        });

        if (!vehicles || vehicles.length === 0) {
            container.innerHTML = '<p id="empty-vehicle-msg" style="text-align:center; color:#999; padding: 20px;">배정된 차량이 없습니다.</p>';
            return;
        }

        container.innerHTML = vehicles.map(v => renderVehicleCard(v, allAssignedIds)).join('');
    } catch (e) {
        console.error('Error in fetchAdminVehicleList:', e);
        container.innerHTML = '<p style="text-align:center; color:red; padding: 20px;">데이터 로드 중 오류가 발생했습니다.</p>';
    }
}

function renderVehicleCard(v, allAssignedIds) {
    // v can be a partial object for new vehicles
    const vehicleNumber = v.vehicleNumber || 0;
    const type = v.type || 'Taxi';
    const id = v.id || 0;
    const status = v.status || 0;
    const driver = v.driver || null;
    const passengers = v.passengers || [];

    return `
        <div class="card vehicle-admin-card" data-vehicle-number="${vehicleNumber}" data-type="${type}" data-id="${id}" style="padding: 15px; background: #f8f9fa; border: 1px solid #eee; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="vehicle-num-label" style="font-weight: 800; font-size: 15px;">${vehicleNumber}호차</div>
                    <button onclick="removeVehicleUI(this)" style="background: none; border: 1px solid #ff4d4d; color: #ff4d4d; font-size: 10px; padding: 2px 6px; border-radius: 4px; cursor: pointer; width: auto; margin: 0;">차량 삭제</button>
                </div>
                <select class="admin-vehicle-status" onchange="silentSaveVehicleAssignments()" style="width: auto; padding: 4px 8px; font-size: 12px; border-radius: 6px; border: 1px solid #ddd;">
                    <option value="0" ${status === 0 || status === 'None' ? 'selected' : ''}>⏳ 대기 중</option>
                    <option value="1" ${status === 1 || status === 'Called' ? 'selected' : ''}>📞 호출 완료</option>
                    <option value="2" ${status === 2 || status === 'Moving' ? 'selected' : ''}>🚚 이동중</option>
                    <option value="3" ${status === 3 || status === 'Arrived' ? 'selected' : ''}>✅ 도착</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="font-size: 11px; font-weight: 700; color: #666; display: block; margin-bottom: 4px;">차장 (ID)</label>
                <select class="admin-vehicle-driver" onchange="handleDriverChange(${id}, this)" style="padding: 8px; border-radius: 8px; border: 1px solid #ddd; width: 100%; font-size: 13px;">
                    <option value="">없음</option>
                    ${participants.map(p => `<option value="${p.id}" ${driver && driver.id === p.id ? 'selected' : ''}>${p.name} (${p.generation}기)</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: #666;">탑승자 명단</label>
                    <select onchange="addPassengerToVehicleBySelect(${id}, this)" class="admin-vehicle-passenger-add-select" style="width: auto; padding: 2px 6px; background: #eee; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; cursor: pointer; max-width: 120px;">
                        <option value="">+ 탑승자 추가</option>
                        ${participants
                            .filter(p => !allAssignedIds.has(p.id.toString()))
                            .map(p => `<option value="${p.id}">${p.name} (${p.generation}기)</option>`).join('')}
                    </select>
                </div>
                <div class="admin-vehicle-passengers" style="font-size: 12px; min-height: 44px; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
                    ${passengers.length > 0 
                        ? passengers.map(p => `
                            <span data-id="${p.id}" style="background: #f1f3f5; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #495057; border: 1px solid #e9ecef; display: flex; align-items: center; gap: 4px;">
                                ${p.name} 
                                <button onclick="removePassengerFromVehicle(${id}, ${p.id})" style="background:none; border:none; color:#ff4d4d; padding:0; cursor:pointer; font-weight:800; width:auto; margin:0;">×</button>
                            </span>`).join('')
                        : '<span style="color: #adb5bd;">탑승자 없음</span>'}
                </div>
            </div>
            <!-- Hidden inputs for saving -->
            <input type="hidden" class="admin-vehicle-passenger-ids" value="${passengers.map(p => p.id).join(',')}">
        </div>
    `;
}

function addManualVehicle() {
    const container = document.getElementById('adminVehicleList');
    if (!container) return;

    // Remove empty message if exists
    const emptyMsg = document.getElementById('empty-vehicle-msg');
    if (emptyMsg) emptyMsg.remove();

    // Determine next vehicle number
    const cards = document.querySelectorAll('.vehicle-admin-card');
    let maxNum = 0;
    cards.forEach(c => {
        const num = parseInt(c.dataset.vehicleNumber);
        if (num > maxNum) maxNum = num;
    });
    const nextNum = maxNum + 1;

    // Get currently assigned IDs
    const allAssignedIds = new Set();
    document.querySelectorAll('.admin-vehicle-driver').forEach(s => { if(s.value) allAssignedIds.add(s.value); });
    document.querySelectorAll('.admin-vehicle-passenger-ids').forEach(i => {
        if(i.value) i.value.split(',').forEach(id => allAssignedIds.add(id.trim()));
    });

    const v = {
        vehicleNumber: nextNum,
        type: 'Taxi',
        id: Date.now(), // Temp ID for UI mapping
        status: 0,
        driver: null,
        passengers: []
    };

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderVehicleCard(v, allAssignedIds);
    container.appendChild(tempDiv.firstElementChild);

    silentSaveVehicleAssignments();
}

async function removeVehicleUI(btn) {
    if (!await confirm("이 차량을 삭제하시겠습니까? (저장 시 반영)")) return;
    const card = btn.closest('.vehicle-admin-card');
    if (card) {
        card.remove();
        recalculateVehicleNumbers();
        silentSaveVehicleAssignments();
        updateAllPassengerDropdowns();
    }
}

function recalculateVehicleNumbers() {
    const cards = document.querySelectorAll('.vehicle-admin-card');
    cards.forEach((card, index) => {
        const newNum = index + 1;
        card.dataset.vehicleNumber = newNum;
        const label = card.querySelector('.vehicle-num-label');
        if (label) label.textContent = `${newNum}호차`;
    });
}

async function saveVehicleAssignments() {
    await silentSaveVehicleAssignments(true);
}

async function silentSaveVehicleAssignments(showSuccess = false) {
    const cards = document.querySelectorAll('.vehicle-admin-card');
    const updates = Array.from(cards).map(card => {
        const passengerIds = card.querySelector('.admin-vehicle-passenger-ids').value 
            ? card.querySelector('.admin-vehicle-passenger-ids').value.split(',').map(id => parseInt(id))
            : [];
        
        return {
            vehicleNumber: parseInt(card.dataset.vehicleNumber),
            type: card.dataset.type === 'OwnCar' ? 0 : 1, // OwnCar=0, Taxi=1
            driverId: card.querySelector('.admin-vehicle-driver').value ? parseInt(card.querySelector('.admin-vehicle-driver').value) : null,
            status: parseInt(card.querySelector('.admin-vehicle-status').value),
            passengerIds: passengerIds
        };
    });

    try {
        const res = await fetch(`${API_BASE}/Vehicle/admin/update`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
            credentials: 'include'
        });

        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            if (showSuccess) await alert('✅ 차량 배정 정보가 저장되었습니다.');
            // Only fetch again if NOT silent to avoid dropdown reset during editing
            if (showSuccess) fetchAdminVehicleList();
        } else {
            console.error('Silent save failed');
        }
    } catch (e) { console.error('Server error during silent save', e); }
}

async function resetVehicleAssignments() {
    if (!await confirm("정말로 모든 차량 배정 데이터를 초기화하시겠습니까?")) return;
    const password = await window.prompt('관리자 비밀번호를 입력해주세요:');
    if (!password) return;

    try {
        const res = await fetch(`${API_BASE}/Vehicle/admin/reset`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            credentials: 'include'
        });
        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            if (data.message === "비밀번호가 일치하지 않습니다.") {
                await alert('❌ 비밀번호가 일치하지 않습니다.');
                return;
            }
            return logout(true);
        }
        if (res.ok) {
            
            await alert('✅ 초기화 완료');
            fetchAdminVehicleList();
        } else {
            const msg = await res.text();
            await alert(`❌ 초기화 실패: ${msg || '알 수 없는 오류'}`);
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

async function toggleVehiclePublic() {
    try {
        const res = await fetch(`${API_BASE}/Vehicle/admin/toggle-public`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'POST',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            const data = await res.json();
            updateVehiclePublicUI(data.isPublic);
            await alert(data.isPublic ? "✅ 차량 배정표가 공개되었습니다." : "🔒 차량 배정표가 비공개 처리되었습니다.");
        }
    } catch (e) { await alert(MSG.SERVER_ERROR); }
}

function updateVehiclePublicUI(isPublic) {
    const btn = document.getElementById('btnVehicleTogglePublic');
    if (!btn) return;
    if (isPublic) {
        btn.textContent = "✅ 공개 상태";
        btn.style.background = "#22C55E";
    } else {
        btn.textContent = "🔒 비공개 상태";
        btn.style.background = "#212529";
    }
}

// Attach vehicle functions to window
window.loadVehicleTab = loadVehicleTab;
window.addOwnCarInput = addOwnCarInput;
window.generateVehicleAssignments = generateVehicleAssignments;
window.fetchAdminVehicleList = fetchAdminVehicleList;
window.saveVehicleAssignments = saveVehicleAssignments;
window.resetVehicleAssignments = resetVehicleAssignments;
window.toggleVehiclePublic = toggleVehiclePublic;
window.addManualVehicle = addManualVehicle;
window.removeVehicleUI = removeVehicleUI;

function addPassengerToVehicleBySelect(vehicleId, selectEl) {
    const pId = selectEl.value;
    if (!pId) return;
    
    const card = document.querySelector(`.vehicle-admin-card[data-id="${vehicleId}"]`);
    if (!card) return;
    
    const input = card.querySelector('.admin-vehicle-passenger-ids');
    let ids = input.value ? input.value.split(',').map(id => id.trim()) : [];
    
    if (ids.includes(pId)) {
        alert("이미 등록된 탑승자입니다.");
        selectEl.value = "";
        return;
    }
    
    ids.push(pId);
    input.value = ids.join(',');
    
    // Refresh UI tag list
    const p = participants.find(pp => pp.id == pId);
    const tagContainer = card.querySelector('.admin-vehicle-passengers');
    if (tagContainer.innerHTML.includes('탑승자 없음')) tagContainer.innerHTML = '';
    
    const tag = document.createElement('span');
    tag.style = "background: #f1f3f5; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #495057; border: 1px solid #e9ecef; display: flex; align-items: center; gap: 4px;";
    tag.dataset.id = pId;
    tag.innerHTML = `${p ? p.name : 'ID:'+pId} <button onclick="removePassengerFromVehicle(${vehicleId}, ${pId})" style="background:none; border:none; color:#ff4d4d; padding:0; cursor:pointer; font-weight:800; width:auto; margin:0;">×</button>`;
    tagContainer.appendChild(tag);

    // Reset select
    selectEl.value = "";

    // Auto save
    silentSaveVehicleAssignments();

    // Update other dropdowns
    updateAllPassengerDropdowns();
}

function removePassengerFromVehicle(vehicleId, pId) {
    const card = document.querySelector(`.vehicle-admin-card[data-id="${vehicleId}"]`);
    if (!card) return;
    
    const input = card.querySelector('.admin-vehicle-passenger-ids');
    let ids = input.value ? input.value.split(',').map(id => id.trim()) : [];
    
    ids = ids.filter(id => id != pId);
    input.value = ids.join(',');
    
    const tag = card.querySelector(`.admin-vehicle-passengers span[data-id="${pId}"]`);
    if (tag) tag.remove();
    
    const tagContainer = card.querySelector('.admin-vehicle-passengers');
    if (tagContainer.children.length === 0) {
        tagContainer.innerHTML = '<span style="color: #adb5bd;">탑승자 없음</span>';
    }

    // Auto save
    silentSaveVehicleAssignments();

    // Update other dropdowns
    updateAllPassengerDropdowns();
}

window.addPassengerToVehicleBySelect = addPassengerToVehicleBySelect;
window.removePassengerFromVehicle = removePassengerFromVehicle;

function handleDriverChange(vehicleId, selectEl) {
    const pId = selectEl.value;
    const card = document.querySelector(`.vehicle-admin-card[data-id="${vehicleId}"]`);
    if (card) {
        card.dataset.type = pId ? 'OwnCar' : 'Taxi';
    }

    if (!pId) {
        // If driver cleared, still save the change
        silentSaveVehicleAssignments();
        updateAllPassengerDropdowns();
        return;
    }

    const input = card.querySelector('.admin-vehicle-passenger-ids');
    let ids = input.value ? input.value.split(',').map(id => id.trim()) : [];

    // If new driver is not in passenger list, add them
    if (!ids.includes(pId)) {
        ids.push(pId);
        input.value = ids.join(',');

        // Refresh UI tag list for passengers
        const p = participants.find(pp => pp.id == pId);
        const tagContainer = card.querySelector('.admin-vehicle-passengers');
        if (tagContainer.innerHTML.includes('탑승자 없음')) tagContainer.innerHTML = '';

        const tag = document.createElement('span');
        tag.style = "background: #f1f3f5; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #495057; border: 1px solid #e9ecef; display: flex; align-items: center; gap: 4px;";
        tag.dataset.id = pId;
        tag.innerHTML = `${p ? p.name : 'ID:'+pId} <button onclick="removePassengerFromVehicle(${vehicleId}, ${pId})" style="background:none; border:none; color:#ff4d4d; padding:0; cursor:pointer; font-weight:800; width:auto; margin:0;">×</button>`;
        tagContainer.appendChild(tag);
    }

    // Auto save
    silentSaveVehicleAssignments();

    // Update other dropdowns
    updateAllPassengerDropdowns();
}

window.handleDriverChange = handleDriverChange;

function updateAllPassengerDropdowns() {
    // 1. Collect ALL currently assigned IDs from the UI
    const allAssignedIds = new Set();
    
    // Check drivers
    document.querySelectorAll('.admin-vehicle-driver').forEach(select => {
        if (select.value) allAssignedIds.add(select.value.toString());
    });
    
    // Check passenger hidden inputs
    document.querySelectorAll('.admin-vehicle-passenger-ids').forEach(input => {
        if (input.value) {
            input.value.split(',').forEach(id => allAssignedIds.add(id.trim()));
        }
    });

    // 2. Update EVERY passenger dropdown with filtered unassigned participants
    document.querySelectorAll('.admin-vehicle-passenger-add-select').forEach(select => {
        const currentVal = select.value;
        const unassigned = participants.filter(p => !allAssignedIds.has(p.id.toString()));
        
        let html = '<option value="">+ 탑승자 추가</option>';
        html += unassigned.map(p => `<option value="${p.id}">${p.name} (${p.generation}기)</option>`).join('');
        
        select.innerHTML = html;
        select.value = currentVal; // Restore if it was selected (usually empty)
    });
}

window.updateAllPassengerDropdowns = updateAllPassengerDropdowns;

// --- PHOTO STUDIO MANAGEMENT ---
async function fetchPhotoSessions() {
    const list = document.getElementById('admin-photo-session-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_BASE}/Photo/sessions`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.status === 401) return logout(true);
        if (!res.ok) throw new Error();
        const sessions = await res.json();

        if (sessions.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">등록된 회차가 없습니다.</p>';
            return;
        }

        list.innerHTML = sessions.map(s => `
            <div class="card photo-session-card" data-id="${s.id}" style="border: 1px solid #ddd;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="drag-handle" style="cursor: grab; padding: 4px 8px; background: #f0f0f0; border-radius: 4px; color: #999; font-size: 18px;">☰</div>
                        <span style="font-weight: 800; font-size: 16px;">${escapeHTML(s.title)}</span>
                    </div>
                    <button onclick="deletePhotoSession(${s.id})" style="width: auto; padding: 4px 10px; background: #ff4d4d; color: white; font-size: 11px; margin: 0;">회차 삭제</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    ${(s.photos || s.Photos || []).map(p => { const url = p.url || p.Url; const pid = p.id || p.Id; return `
                        <div style="position: relative; aspect-ratio: 1/1; border-radius: 8px; overflow: hidden; background: #eee;">
                            <img src="${IMAGE_BASE}${url}" style="width: 100%; height: 100%; object-fit: cover;">
                            <button onclick="deletePhoto(${pid})" style="position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; border-radius: 50%; background: rgba(255,0,0,0.7); color: white; border: none; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;">✕</button>
                        </div>
                    `; }).join('')}
                </div>

                <div style="background: #f4f6fb; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 11px; font-weight: 700; color: #666; margin-bottom: 8px;">📸 사진 추가 (PNG, JPG, HEIC 지원 / 최대 50MB / 여러 장 선택 가능)</div>
                    <div style="display: flex; gap: 8px;">
                        <input type="file" id="new-photo-file-${s.id}" accept="image/png, image/jpeg, image/heic, image/heif" multiple style="flex: 2; font-size: 12px; margin-bottom: 0; padding: 4px; background: white; border: 1px solid #ddd; border-radius: 4px;">
                        <input type="text" id="new-photo-desc-${s.id}" placeholder="설명(선택)" style="flex: 1; font-size: 12px; margin-bottom: 0;">
                        <button onclick="addPhotoToSession(${s.id})" style="width: auto; padding: 0 15px; background: #2D468D; color: white; font-size: 12px; margin: 0; border-radius: 8px;">업로드</button>
                    </div>
                    <div style="font-size: 10px; color: #999; margin-top: 6px;">* 여러 장을 선택하여 한 번에 올릴 수 있습니다. (설명은 공통 적용)</div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="text-align:center; color:red;">데이터 로드 실패</p>';
    }

    // Initialize Sortable
    if (window.photoSortable) window.photoSortable.destroy();
    window.photoSortable = new Sortable(list, {
        animation: 150,
        handle: '.drag-handle', // Only allow dragging via the handle
        ghostClass: 'sortable-ghost',
        delay: 100, // 100ms delay for touch
        delayOnTouchOnly: true, // only delay if touch is used
        touchStartThreshold: 5, // ignore small movements
        onEnd: async () => {
            const cards = list.querySelectorAll('.photo-session-card');
            const updates = Array.from(cards).map((card, index) => ({
                id: parseInt(card.dataset.id),
                order: index
            }));
            
            try {
                const res = await fetch(`${API_BASE}/Photo/sessions/reorder`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates),
                    credentials: 'include'
                });
                if (res.status === 401) return logout(true);
                if (!res.ok) alert('순서 저장 실패');
            } catch (e) { console.error('Reorder error:', e); }
        }
    });
}

async function addPhotoSession() {
    const titleInp = document.getElementById('new-photo-session-title');
    const title = titleInp.value.trim();

    if (!title) return alert('회차 제목을 입력해주세요.');

    try {
        const res = await fetch(`${API_BASE}/Photo/sessions`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, order: 999 }), // Set a high default order
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            
            titleInp.value = '';
            fetchPhotoSessions();
        } else {
            alert('회차 추가 실패');
        }
    } catch (e) { alert(MSG.SERVER_ERROR); }
}

async function deletePhotoSession(id) {
    if (!await confirm('이 회차와 포함된 모든 사진을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Photo/sessions/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) fetchPhotoSessions();
        else alert(MSG.DELETE_FAILED);
    } catch (e) { alert(MSG.SERVER_ERROR); }
}

async function addPhotoToSession(sessionId) {
    const fileInp = document.getElementById(`new-photo-file-${sessionId}`);
    const descInp = document.getElementById(`new-photo-desc-${sessionId}`);
    const files = fileInp.files;
    const description = descInp.value.trim();

    if (!files || files.length === 0) return alert('업로드할 파일을 선택해주세요.');

    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    if (description) formData.append('description', description);

    try {
        const res = await fetch(`${API_BASE}/Photo/sessions/${sessionId}/upload`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) {
            fileInp.value = '';
            descInp.value = '';
            fetchPhotoSessions();
        } else {
            const msg = await res.text();
            alert(`업로드 실패: ${msg}`);
        }
    } catch (e) {
        alert(MSG.SERVER_ERROR);
    } finally {
        if (overlay) overlay.style.display = 'none';
    }
}

async function deletePhoto(id) {
    if (!await confirm('이 사진을 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`${API_BASE}/Photo/photos/${id}`, { headers: { 'X-ClubMT-Source': 'WebApp' },
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.status === 401) return logout(true);
        if (res.ok) fetchPhotoSessions();
        else alert(MSG.DELETE_FAILED);
    } catch (e) { alert(MSG.SERVER_ERROR); }
}

window.fetchPhotoSessions = fetchPhotoSessions;
window.addPhotoSession = addPhotoSession;
window.deletePhotoSession = deletePhotoSession;
window.addPhotoToSession = addPhotoToSession;
window.deletePhoto = deletePhoto;


// --- VOLLEYBALL LEAGUE MANAGEMENT (MANUAL MATCHES) ---
let currentVballSession = 1; 
let allParticipantsCached = [];

async function loadVolleyballTab() {
    try {
        const pRes = await fetch(`${API_BASE}/Participants`, { headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        allParticipantsCached = await pRes.json();
    } catch(e) { console.error("Participant fetch failed", e); }
    await fetchVolleyballData();
}

async function switchVballSession(session) {
    currentVballSession = session;
    const t1 = document.getElementById('vball-tab-1');
    const t2 = document.getElementById('vball-tab-2');
    if (t1) t1.classList.toggle('active', session === 1);
    if (t2) t2.classList.toggle('active', session === 2);
    await fetchVolleyballData();
}

async function fetchVolleyballData() {
    try {
        const res = await fetch(`${API_BASE}/Volleyball/dashboard`, { 
            headers: { 'X-ClubMT-Source': 'WebApp' }, 
            credentials: 'include' 
        });
        if (res.status === 401) return logout(true);
        if (!res.ok) return;
        const data = await res.json();

        const btn1 = document.getElementById('btnVballPublic1');
        const btn2 = document.getElementById('btnVballPublic2');
        if (btn1) {
            btn1.innerHTML = data.settings.isFirstHalfPublic ? '🔓 1부 공개 중' : '🔒 1부 비공개';
            btn1.style.background = data.settings.isFirstHalfPublic ? '#22C55E' : '#212529';
        }
        if (btn2) {
            btn2.innerHTML = data.settings.isSecondHalfPublic ? '🔓 2부 공개 중' : '🔒 2부 비공개';
            btn2.style.background = data.settings.isSecondHalfPublic ? '#22C55E' : '#212529';
        }

        const sessionTeams = data.teams.filter(t => t.session === currentVballSession);
        const sessionMatches = data.matches.filter(m => m.session === currentVballSession);
        
        updateMatchDropdowns(sessionTeams);
        renderVolleyballRankings(sessionTeams);
        renderVolleyballMatches(sessionMatches, sessionTeams);
        renderVolleyballTeamsManual(sessionTeams, data.members);
        initVolleyballDragAndDrop();
    } catch (e) { console.error(e); }
}

function updateMatchDropdowns(teams) {
    const s1 = document.getElementById('matchTeam1');
    const s2 = document.getElementById('matchTeam2');
    if (!s1 || !s2) return;
    const html = `<option value="">팀 선택...</option>` + teams.map(t => `<option value="${t.id}">${t.name}팀</option>`).join('');
    s1.innerHTML = html;
    s2.innerHTML = html;
}

function renderVolleyballRankings(teams) {
    const tbody = document.getElementById('volleyballRankList');
    if (!tbody) return;
    const sorted = [...teams].sort((a, b) => b.points - a.points || b.wins - a.wins);
    tbody.innerHTML = sorted.map((t, i) => `
        <tr>
            <td>#${i+1}</td>
            <td><b>${t.name}팀</b></td>
            <td>${t.wins}승 / ${t.losses}패</td>
            <td>${t.miniGamePoints}</td>
            <td><b style="color:var(--blue-deep)">${t.points}</b></td>
        </tr>
    `).join('');
}

function renderVolleyballMatches(matches, teams) {
    const tbody = document.getElementById('volleyballMatchList');
    if (!tbody) return;
    if (matches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">매칭이 없습니다. 위에서 팀을 선택해 경기를 추가하세요.</td></tr>';
        return;
    }
    tbody.innerHTML = matches.map(m => {
        const t1 = teams.find(t => t.id === m.team1Id);
        const t2 = teams.find(t => t.id === m.team2Id);
        const statusText = m.status === 0 ? '<span style="color:#999;">대기</span>' : 
                          m.status === 1 ? '<span style="color:var(--blue-deep); font-weight:800;">진행중</span>' : 
                          '<span style="color:#22C55E;">완료</span>';
        return `
            <tr>
                <td>#${m.matchOrder}</td>
                <td><b>${t1?.name || '?'}</b> vs <b>${t2?.name || '?'}</b></td>
                <td>${statusText}</td>
                <td>
                    <div style="display:flex; gap:5px; justify-content:center;">
                    ${m.status === 2 ? 
                        `<b>${teams.find(t => t.id === m.winnerTeamId)?.name} 승</b>` : 
                        m.status === 1 ?
                        `<div class="volleyball-match-actions">
                            <button onclick="setVolleyballMatchResult(${m.id}, ${m.team1Id})" style="padding:4px 8px; font-size:10px; background:#2D468D; color:white; margin:0; width:auto; cursor:pointer; border:none; border-radius:4px;">${t1?.name} 승</button>
                            <button onclick="setVolleyballMatchResult(${m.id}, ${m.team2Id})" style="padding:4px 8px; font-size:10px; background:#E5484D; color:white; margin:0; width:auto; cursor:pointer; border:none; border-radius:4px;">${t2?.name} 승</button>
                        </div>` :
                        `<button onclick="startVolleyballMatch(${m.id})" style="padding:4px 10px; font-size:10px; background:var(--blue-deep); color:white; margin:0; width:auto;">시작</button>
                         <button onclick="deleteVolleyballMatch(${m.id})" style="padding:4px 10px; font-size:10px; background:#eee; color:#999; margin:0; width:auto;">삭제</button>`
                    }
                    </div>
                </td>
            </tr>
        `;
    }).reverse().join(''); 
}

function renderVolleyballTeamsManual(teams, allMembers) {
    const grid = document.getElementById('volleyballTeamGrid');
    if (!grid) return;
    const assignedIds = allMembers.filter(m => teams.some(t => t.id === m.teamId)).map(m => m.participantId);
    const available = allParticipantsCached.filter(p => p.isRegistered && !assignedIds.includes(p.id));

    grid.innerHTML = teams.map(t => {
        const teamMembers = allMembers.filter(m => m.teamId === t.id);
        const selectId = `add-member-to-${t.id}`;
        return `
            <div class="card" style="padding:15px; border:1.5px solid #eee; background:#fff;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                    <h4 style="font-size:16px; margin:0;">${t.name}팀 (${teamMembers.length}명)</h4>
                    <button onclick="deleteVolleyballTeam(${t.id})" style="padding:2px 6px; background:#eee; color:#999; font-size:10px; width:auto; margin:0; border:none; cursor:pointer;">삭제</button>
                </div>
                <div style="display:flex; gap:5px; margin-bottom:15px;">
                    <select id="${selectId}" style="flex:1; padding:5px; font-size:12px; border-radius:6px; border:1px solid #ddd;">
                        <option value="">인원 추가...</option>
                        ${available.map(p => `<option value="${p.id}">${p.name} (${p.generation}기)</option>`).join('')}
                    </select>
                    <button onclick="addTeamMember(${t.id}, '${selectId}')" style="width:auto; padding:5px 10px; background:var(--blue-deep); color:white; font-size:12px; margin:0; border:none; border-radius:4px; cursor:pointer;">+</button>
                </div>
                <ul class="volleyball-member-list" data-team-id="${t.id}" style="list-style:none; padding:0; min-height:40px; border:1px dashed #eee; border-radius:8px; padding:5px; cursor:grab;">
                    ${teamMembers.map(m => `
                        <li data-id="${m.participantId}" style="padding:8px 10px; background:#f8f9fa; margin-bottom:5px; border-radius:6px; font-size:13px; border:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                            <span>☰ ${m.participantName}</span>
                            <span onclick="removeTeamMember(${m.id})" style="cursor:pointer; color:#ccc; font-size:14px; font-weight:900;">&times;</span>
                        </li>
                    `).join('')}
                </ul>
                <div style="margin-top:15px; padding-top:10px; border-top:1px solid #eee;">
                    <div style="font-size:11px; font-weight:800; color:#666; margin-bottom:8px;">🎯 미니게임: ${t.miniGamePoints}점</div>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:4px; margin-bottom:4px;">
                        <button onclick="addMiniScore(${t.id}, 1)" style="padding:5px; font-size:10px; background:#f1f3f5; border:1px solid #ddd; border-radius:4px; cursor:pointer;">+1</button>
                        <button onclick="addMiniScore(${t.id}, 2)" style="padding:5px; font-size:10px; background:#f1f3f5; border:1px solid #ddd; border-radius:4px; cursor:pointer;">+2</button>
                        <button onclick="addMiniScore(${t.id}, 3)" style="padding:5px; font-size:10px; background:#f1f3f5; border:1px solid #ddd; border-radius:4px; cursor:pointer;">+3</button>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:4px;">
                        <button onclick="addMiniScore(${t.id}, -1)" style="padding:5px; font-size:10px; background:#fff; border:1px solid #eee; border-radius:4px; color:#ccc; cursor:pointer;">-1</button>
                        <button onclick="addMiniScore(${t.id}, -2)" style="padding:5px; font-size:10px; background:#fff; border:1px solid #eee; border-radius:4px; color:#ccc; cursor:pointer;">-2</button>
                        <button onclick="addMiniScore(${t.id}, -3)" style="padding:5px; font-size:10px; background:#fff; border:1px solid #eee; border-radius:4px; color:#ccc; cursor:pointer;">-3</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initVolleyballDragAndDrop() {
    if (typeof Sortable === 'undefined') return;
    document.querySelectorAll('.volleyball-member-list').forEach(el => {
        if (el.dataset.sortableActive) return;
        el.dataset.sortableActive = "true";
        Sortable.create(el, {
            group: 'volleyball-members',
            animation: 150,
            onEnd: async (evt) => {
                const participantId = evt.item.dataset.id;
                const newTeamId = evt.to.dataset.teamId;
                if (evt.from === evt.to) return;
                try {
                    await fetch(`${API_BASE}/Volleyball/update-members-batch`, {
                        method: 'POST',
                        headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
                        body: JSON.stringify([{ participantId: parseInt(participantId), teamId: parseInt(newTeamId) }]),
                        credentials: 'include'
                    });
                    await fetchVolleyballData();
                } catch (e) { console.error(e); }
            }
        });
    });
}

async function createVolleyballTeam() {
    try {
        const res = await fetch(`${API_BASE}/Volleyball/teams`, {
            method: 'POST',
            headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(currentVballSession),
            credentials: 'include'
        });
        if (res.ok) await fetchVolleyballData();
        else await alert(await res.text());
    } catch (e) { console.error(e); }
}

async function deleteVolleyballTeam(id) {
    if (!await confirm("팀을 삭제하시겠습니까?")) return;
    try {
        await fetch(`${API_BASE}/Volleyball/teams/${id}`, { method: 'DELETE', headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function addTeamMember(teamId, dropdownId) {
    const pId = document.getElementById(dropdownId).value;
    if (!pId) return;
    try {
        const res = await fetch(`${API_BASE}/Volleyball/teams/${teamId}/members`, {
            method: 'POST',
            headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(parseInt(pId)),
            credentials: 'include'
        });
        if (res.ok) await fetchVolleyballData();
        else await alert(await res.text());
    } catch (e) { console.error(e); }
}

async function removeTeamMember(memberId) {
    try {
        await fetch(`${API_BASE}/Volleyball/members/${memberId}`, { method: 'DELETE', headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function addMiniScore(teamId, pts) {
    try {
        await fetch(`${API_BASE}/Volleyball/teams/${teamId}/score-mini`, {
            method: 'POST',
            headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(pts),
            credentials: 'include'
        });
        await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function toggleVballPublic(session) {
    try {
        await fetch(`${API_BASE}/Volleyball/toggle-public`, {
            method: 'POST',
            headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
            credentials: 'include'
        });
        await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function createManualMatch() {
    const t1Id = document.getElementById('matchTeam1').value;
    const t2Id = document.getElementById('matchTeam2').value;
    if (!t1Id || !t2Id) return await alert("두 팀을 모두 선택해주세요.");
    if (t1Id === t2Id) return await alert("서로 다른 팀을 선택해주세요.");
    try {
        const res = await fetch(`${API_BASE}/Volleyball/matches`, {
            method: 'POST',
            headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify({ team1Id: parseInt(t1Id), team2Id: parseInt(t2Id), session: currentVballSession }),
            credentials: 'include'
        });
        if (res.ok) await fetchVolleyballData();
        else await alert(await res.text());
    } catch (e) { console.error(e); }
}

async function deleteVolleyballMatch(id) {
    if (!await confirm("경기를 삭제하시겠습니까?")) return;
    try {
        const res = await fetch(`${API_BASE}/Volleyball/matches/${id}`, { method: 'DELETE', headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) await fetchVolleyballData();
        else await alert(await res.text());
    } catch (e) { console.error(e); }
}

async function resetVballMatches() {
    if (!await confirm("모든 경기 기록을 초기화하시겠습니까?")) return;
    try {
        await fetch(`${API_BASE}/Volleyball/sessions/${currentVballSession}/reset-matches`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function resetVolleyballData() {
    if (!await confirm("⚠️ 배구 데이터를 전체 삭제하시겠습니까? (팀/멤버/경기 포함)")) return;
    try {
        const res = await fetch(`${API_BASE}/Volleyball/reset`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function startVolleyballMatch(matchId) {
    try {
        const res = await fetch(`${API_BASE}/Volleyball/matches/${matchId}/start`, { method: 'POST', headers: { 'X-ClubMT-Source': 'WebApp' }, credentials: 'include' });
        if (res.ok) await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

async function setVolleyballMatchResult(matchId, winnerId) {
    if (!await confirm("승자를 기록하시겠습니까?")) return;
    try {
        const res = await fetch(`${API_BASE}/Volleyball/matches/${matchId}/result`, {
            method: 'POST',
            headers: { 'X-ClubMT-Source': 'WebApp', 'Content-Type': 'application/json' },
            body: JSON.stringify(winnerId),
            credentials: 'include'
        });
        if (res.ok) await fetchVolleyballData();
    } catch (e) { console.error(e); }
}

// Attach to window for global access
window.loadVolleyballTab = loadVolleyballTab;
window.switchVballSession = switchVballSession;
window.createVolleyballTeam = createVolleyballTeam;
window.deleteVolleyballTeam = deleteVolleyballTeam;
window.addTeamMember = addTeamMember;
window.removeTeamMember = removeTeamMember;
window.addMiniScore = addMiniScore;
window.toggleVballPublic = toggleVballPublic;
window.createManualMatch = createManualMatch;
window.deleteVolleyballMatch = deleteVolleyballMatch;
window.resetVballMatches = resetVballMatches;
window.resetVolleyballData = resetVolleyballData;
window.startVolleyballMatch = startVolleyballMatch;
window.setVolleyballMatchResult = setVolleyballMatchResult;
window.fetchVolleyballData = fetchVolleyballData;
