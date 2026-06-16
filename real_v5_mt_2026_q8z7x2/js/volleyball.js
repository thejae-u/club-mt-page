// --- USER VOLLEYBALL DASHBOARD LOGIC (REFACTORED) ---
let userVolleyballPolling = null;
let currentDisplaySession = 1;

async function openVolleyballModal() {
    const participantName = localStorage.getItem('participantName');
    if (!participantName) {
        await alert("로그인 후 이용 가능합니다.");
        openModal('login');
        return;
    }

    openModal('volleyball');
    await fetchUserVolleyballData();
    
    if (!userVolleyballPolling) {
        userVolleyballPolling = setInterval(async () => {
            const modal = document.getElementById('modal-volleyball');
            if (modal && modal.classList.contains('active')) {
                await fetchUserVolleyballData();
            } else {
                clearInterval(userVolleyballPolling);
                userVolleyballPolling = null;
            }
        }, 5000);
    }
}

async function fetchUserVolleyballData() {
    try {
        const res = await fetch(`${API_BASE}/Volleyball/dashboard`, { 
            headers: { 'X-ClubMT-Source': 'WebApp' }, 
            credentials: 'include' 
        });
        if (!res.ok) return;

        const data = await res.json();
        
        // Priority: Show 1st half if public, else 2nd half if public
        // (Administrator will ensure only one is active at a time via new logic)
        if (data.settings.isFirstHalfPublic) {
            currentDisplaySession = 1;
        } else if (data.settings.isSecondHalfPublic) {
            currentDisplaySession = 2;
        } else {
            showPrivateNotice();
            return;
        }

        hidePrivateNotice();
        const participantName = localStorage.getItem('participantName');

        // Filter data strictly by the public session
        const sessionTeams = data.teams.filter(t => t.session === currentDisplaySession);
        const sessionMatches = data.matches.filter(m => m.session === currentDisplaySession);

        renderMyTeam(sessionTeams, data.members, participantName);
        renderUserRankings(sessionTeams);
        renderUserMatches(sessionMatches, sessionTeams);
        renderUserTeams(sessionTeams, data.members);
    } catch (e) { console.error(e); }
}

function renderMyTeam(teams, members, myName) {
    const section = document.getElementById('myVolleyballTeamSection');
    const display = document.getElementById('myTeamDisplay');
    if (!section || !display) return;

    const myMemberInfo = members.find(m => m.participantName === myName && teams.some(t => t.id === m.teamId));
    if (!myMemberInfo) {
        section.style.display = 'none';
        return;
    }

    const myTeam = teams.find(t => t.id === myMemberInfo.teamId);
    const teamMembers = members.filter(m => m.teamId === myTeam?.id);

    section.style.display = 'block';
    display.innerHTML = `
        <div style="font-size:18px; font-weight:900; margin-bottom:8px;">${myTeam?.name}팀</div>
        <div style="font-size:12px; opacity:0.9; line-height:1.5;">
            <b>팀원:</b> ${teamMembers.map(m => m.participantName).join(', ')}
        </div>
    `;
}

function renderUserRankings(teams) {
    const tbody = document.getElementById('userVolleyballRank');
    if (!tbody) return;
    const sorted = [...teams].sort((a, b) => b.points - a.points || b.wins - a.wins);
    tbody.innerHTML = sorted.map((t, i) => `
        <tr>
            <td style="font-weight:800; color:${i < 3 ? 'var(--blue-deep)' : '#999'}">#${i + 1}</td>
            <td><b>${t.name}팀</b></td>
            <td>${t.wins}</td>
            <td>${t.losses}</td>
            <td><b style="font-size:14px;">${t.points}</b></td>
        </tr>
    `).join('');
}

function renderUserMatches(matches, teams) {
    const container = document.getElementById('userVolleyballMatches');
    const activeSection = document.getElementById('activeMatchSection');
    const activeDisplay = document.getElementById('activeMatchDisplay');
    if (!container) return;

    const activeMatch = matches.find(m => m.status === 1);
    if (activeMatch && activeSection && activeDisplay) {
        const t1 = teams.find(t => t.id === activeMatch.team1Id);
        const t2 = teams.find(t => t.id === activeMatch.team2Id);
        activeSection.style.display = 'block';
        activeDisplay.innerHTML = `
            <div style="display:flex; justify-content:space-around; align-items:center; text-align:center;">
                <div>
                    <div style="font-size:11px; color:#666; margin-bottom:4px;">TEAM 1</div>
                    <div style="font-size:18px; font-weight:900; color:var(--blue-deep);">${t1?.name}팀</div>
                </div>
                <div style="font-size:20px; font-weight:900; color:#E5484D; font-style:italic;">VS</div>
                <div>
                    <div style="font-size:11px; color:#666; margin-bottom:4px;">TEAM 2</div>
                    <div style="font-size:18px; font-weight:900; color:var(--blue-deep);">${t2?.name}팀</div>
                </div>
            </div>
        `;
    } else if (activeSection) {
        activeSection.style.display = 'none';
    }

    if (matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">진행 중인 경기가 없습니다.</p>';
        return;
    }

    const sortedMatches = [...matches].sort((a, b) => b.matchOrder - a.matchOrder);
    container.innerHTML = sortedMatches.map(m => {
        const t1 = teams.find(t => t.id === m.team1Id);
        const t2 = teams.find(t => t.id === m.team2Id);
        let badge = '';
        let classList = 'match-item';
        if (m.status === 0) badge = '<span class="match-status-badge" style="background:#f1f3f5; color:#868e96;">대기</span>';
        else if (m.status === 1) badge = '<span class="match-status-badge" style="background:#E5484D; color:white;">진행 중</span>';
        else {
            const winner = teams.find(t => t.id === m.winnerTeamId);
            badge = `<span class="match-status-badge" style="background:var(--blue-pale); color:#007AFF;">${winner?.name}팀 승리</span>`;
            classList += ' completed';
        }
        return `
            <div class="${classList}">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <div style="font-size:10px; color:#999; font-weight:800;">MATCH #${m.matchOrder}</div>
                    <div style="font-weight:700; font-size:14px;">${t1?.name}팀 vs ${t2?.name}팀</div>
                </div>
                ${badge}
            </div>
        `;
    }).join('');
}

function renderUserTeams(teams, members) {
    const container = document.getElementById('userVolleyballTeams');
    if (!container) return;
    container.innerHTML = teams.map(t => {
        const teamMembers = members.filter(m => m.teamId === t.id);
        return `
            <div class="team-mini-card">
                <div style="font-weight:800; font-size:12px; margin-bottom:6px; color:var(--blue-deep); display:flex; justify-content:space-between;">
                    <span>${t.name}팀</span>
                    <span style="font-weight:600; opacity:0.5;">${teamMembers.length}명</span>
                </div>
                <div style="font-size:11px; color:#666; line-height:1.4;">
                    ${teamMembers.map(m => m.participantName).join(', ')}
                </div>
            </div>
        `;
    }).join('');
}

function showPrivateNotice() {
    const modalSheet = document.querySelector('#modal-volleyball .modal-sheet');
    if (!modalSheet) return;
    Array.from(modalSheet.children).forEach(child => {
        if (!child.classList.contains('modal-handle') && !child.classList.contains('modal-close') && !child.classList.contains('modal-title')) {
            child.style.display = 'none';
        }
    });
    let privateMsg = document.getElementById('volleyball-private-notice');
    if (!privateMsg) {
        privateMsg = document.createElement('div');
        privateMsg.id = 'volleyball-private-notice';
        modalSheet.appendChild(privateMsg);
    }
    privateMsg.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color:var(--text3);">
            <div style="font-size:48px; margin-bottom:20px;">🔒</div>
            <h3 style="color:var(--text2); margin-bottom:10px;">배구 대진표 준비 중</h3>
            <p style="font-size:13px; line-height:1.6;">현재 팀 편성 및 대진표를 정리하고 있습니다.<br>잠시 후 다시 확인해주세요!</p>
        </div>
    `;
    privateMsg.style.display = 'block';
}

function hidePrivateNotice() {
    const privateMsg = document.getElementById('volleyball-private-notice');
    if (privateMsg) privateMsg.style.display = 'none';
    const modalSheet = document.querySelector('#modal-volleyball .modal-sheet');
    if (modalSheet) {
        Array.from(modalSheet.children).forEach(child => {
            if (child.id !== 'volleyball-private-notice') child.style.display = '';
        });
    }
}
