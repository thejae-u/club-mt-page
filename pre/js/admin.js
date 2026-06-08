const escapeHTML = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[match] || match));
};

function switchTab(tabId) {
    alert('관리자 기능은 정적 미리보기 모드에서 사용할 수 없습니다.');
}

async function doLogin() {
    alert('정적 미리보기 모드에서는 로그인이 필요하지 않으며, 관리자 기능을 사용할 수 없습니다.');
}

function logout() {
    location.href = './';
}

// Global Exports for HTML event handlers
window.switchTab = switchTab;
window.doLogin = doLogin;
window.logout = logout;
window.alert = (msg) => {
    // Custom alert implementation if needed
    console.log("Admin Alert:", msg);
    window.nativeAlert(msg);
};
window.nativeAlert = window.alert;

document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';
    const adminContent = document.getElementById('adminContent');
    if (adminContent) adminContent.style.visibility = 'visible';
});
