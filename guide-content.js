// ===== MT SERVICE GUIDE CONTENT =====
const GUIDE_DATA = {
    title: "📖 MT 서비스 이용 가이드",
    subtitle: "사이트의 주요 기능과 이용 방법을 확인해보세요",
    sections: [
        {
            icon: "🌟",
            title: "참가 신청 안내",
            content: "메인 화면의 '신청하기' 버튼을 통해 MT 참가를 신청할 수 있습니다. 본인의 정보에 맞는 유형을 선택하여 정보를 입력해주세요."
        },
        {
            icon: "📍",
            title: "장소 및 위치 안내",
            content: "메인 화면 상단의 위치 버튼을 클릭하면 MT 장소의 이름과 상세 설명을 확인할 수 있습니다. '네이버 지도에서 보기' 버튼을 통해 정확한 위치와 길찾기 정보를 확인하세요."
        },
        {
            icon: "💳",
            title: "회비 및 회비 입금 확인",
            content: "회비 버튼을 클릭하면 회비 입급 여부 및 회비 사용 내역을 확인하실 수 있습니다. 입금 후 운영진이 확인을 완료하면 '입금 확인' 상태로 변경됩니다."
        },
        {
            icon: "👤",
            title: "마이페이지 & 정보 수정",
            content: "로그인 후 우측 상단의 이름을 클릭하여 마이페이지에 진입할 수 있습니다. 본인의 신청 정보 수정 및 취소, 비밀번호 변경, 개인 체크리스트 관리가 가능합니다."
        },
        {
            icon: "🕵️",
            title: "마니또 & 제보하기",
            content: "나의 마니또와 미션을 확인하고, 정체가 의심되는 인원이 있다면 익명으로 제보해보세요! 제보 내용은 마니또 탭에서 실시간으로 공유됩니다."
        },
        {
            icon: "🔄",
            title: "강력 새로고침",
            content: "사이트의 기능이 정상 작동하지 않을 때는 사이트 최하단 '데이터 새로고침' 기능을 이용해 주세요. 이후에도 문제가 있다면 운영진에게 문의해 주세요."
        }
    ],
    footer: "💡 기타 궁금한 사항은 운영진에게 직접 문의해주시기 바랍니다. 즐거운 MT 되세요!"
};

/**
 * Renders the guide content into the modal
 */
function renderGuide() {
    const titleEl = document.querySelector('#modal-guide .modal-title');
    const subEl = document.querySelector('#modal-guide .modal-sub');
    const contentEl = document.querySelector('#modal-guide .guide-content');

    if (!titleEl || !contentEl) return;

    titleEl.textContent = GUIDE_DATA.title;
    subEl.textContent = GUIDE_DATA.subtitle;

    let html = '<div class="guide-grid">';
    GUIDE_DATA.sections.forEach(section => {
        html += `
            <section class="guide-section">
                <h3>${section.icon} ${section.title}</h3>
                <p>${section.content}</p>
            </section>
        `;
    });
    html += '</div>';

    html += `
        <div style="margin: 30px auto 0; padding: 20px; background: var(--bg2); border-radius: 16px; font-size: 13px; color: var(--text3); line-height: 1.6; text-align: center; max-width: 600px; width: 100%;">
            ${GUIDE_DATA.footer}
        </div>
    `;

    contentEl.innerHTML = html;
}

// Initial render attempt (if modal exists)
document.addEventListener('DOMContentLoaded', renderGuide);
