async function loadModule(btnElement, moduleName) {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        document.getElementById('sidebar')?.classList.remove('sidebar-mobile-open');
        document.getElementById('mobile-overlay')?.classList.add('opacity-0', 'pointer-events-none');
    }
    const contentArea = document.getElementById('app-content');

    // Đổi nút active
    document.querySelectorAll('.menu-btn').forEach(el => el.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Lưu lại module đang mở để phục hồi sau này
    localStorage.setItem('activeModule', moduleName);

    try {
        const response = await fetch(`views/${moduleName}.html`);
        const html = await response.text();
        contentArea.innerHTML = html;

        // Kích hoạt logic tương ứng
        if (moduleName === 'dashboard') initDashboard();
        if (moduleName === 'profile') initProfile();
        if (moduleName === 'youtube') initYouTube();
        if (moduleName === 'threads') initThreads(); // Hàm này sẽ tự động chạy loadThreadsData()
        if (moduleName === 'toeic') initToeic();
        if (moduleName === 'todolist') initTodoList();
        if (moduleName === 'notes') initNotes();
        if (moduleName === 'reminders') initReminders();
        if (moduleName === 'omniloader') initOmniloader();
        if (moduleName === 'focus') initFocus();

    } catch (error) {
        contentArea.innerHTML = "Lỗi tải dữ liệu.";
        showToast("Lỗi tải giao diện module", "error");
    }
}

// --- UTILITIES ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');

    let colorClass = 'bg-blue-500';
    if (type === 'error') colorClass = 'bg-red-500';
    if (type === 'success') colorClass = 'bg-green-500';
    if (type === 'warning') colorClass = 'bg-yellow-500';

    toast.className = `flex items-center gap-2 text-white px-4 py-3 rounded shadow-lg transition-all opacity-0 translate-y-2 ${colorClass}`;
    toast.style.animation = "fadeIn 0.3s forwards";
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- THU GỌN SIDEBAR ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Code cho mobile hiển thị Backdrop
        sidebar.classList.toggle('sidebar-mobile-open');
        const isOpen = sidebar.classList.contains('sidebar-mobile-open');
        if (isOpen) {
            overlay.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            overlay.classList.add('opacity-0', 'pointer-events-none');
        }
    } else {
        // Code cho Desktop như cũ
        sidebar.classList.toggle('collapsed');
    }
}

// --- THEME TOGGLE ---
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    if (isDark) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

// Khởi chạy module mặc định
window.onload = () => {
    // Tự động kiểm tra bản cập nhật mới
    checkAppUpdates();

    // Phục hồi lại tab cuối cùng người dùng mở
    const savedModule = localStorage.getItem('activeModule') || 'dashboard';
    
    // Tìm nút tương ứng với module đã lưu (ngoại trừ Dashboard vì Dashboard ko có nút menu-btn)
    if (savedModule === 'dashboard') {
        loadModule(null, 'dashboard');
        return;
    }
    
    const targetBtn = document.querySelector(`.menu-btn[onclick*="'${savedModule}'"]`);
    
    if (targetBtn) {
        loadModule(targetBtn, savedModule);
    } else {
        // Fallback về dashboard nếu không tìm thấy
        loadModule(null, 'dashboard');
    }
}

// --- HỆ THỐNG ĐỘT PHÁ CẢNH GIỚI (BREAKTHROUGH) ---
const RANKS = [
    { level: 1,  icon: "🐸",      name: "Ếch Tụ Khí",      rank: 1 },
    { level: 2,  icon: "🐸🌿",   name: "Ếch Luyện Khí",   rank: 2 },
    { level: 3,  icon: "🐸💫",   name: "Ếch Trúc Cơ",     rank: 3 },
    { level: 4,  icon: "🐸🔥",   name: "Ếch Kim Đan",     rank: 4 },
    { level: 5,  icon: "🐸👶",   name: "Ếch Nguyên Anh",  rank: 5 },
    { level: 6,  icon: "🐸⚡",   name: "Ếch Hóa Thần",    rank: 6 },
    { level: 7,  icon: "🐸🌌",   name: "Ếch Hợp Thể",     rank: 7 },
    { level: 8,  icon: "🐸🌠",   name: "Ếch Đại Thừa",    rank: 8 },
    { level: 9,  icon: "🐸☯️",   name: "Ếch Độ Kiếp",     rank: 9 },
    { level: 10, icon: "🐸✨",   name: "Ếch Phi Thăng",   rank: 10 },
    { level: 11, icon: "🐸👑",   name: "Ếch Chân Tiên",   rank: 11 }
];

function getRankForLevel(level) {
    let currentRank = RANKS[0];
    for (const r of RANKS) {
        if (level >= r.level) currentRank = r;
    }
    return currentRank;
}

window.checkBreakthrough = function(stats) {
    if (stats && stats.just_leveled_up) {
        eel.clear_level_up_flag()().then(clearedStats => {
            const rank = getRankForLevel(clearedStats.level);
            const modal = document.getElementById('breakthrough-modal');
            const levelNameSpan = document.getElementById('breakthrough-level-name');
            if (modal && levelNameSpan) {
                levelNameSpan.innerText = `${rank.icon} ${rank.name}`;
                modal.classList.remove('hidden');
                createConfettiEffect();
            }
        });
    }
};

function createConfettiEffect() {
    const modal = document.getElementById('breakthrough-modal');
    if (!modal) return;
    
    const container = document.createElement('div');
    container.id = 'confetti-container';
    container.className = 'absolute inset-0 pointer-events-none overflow-hidden z-10';
    modal.querySelector('.relative').appendChild(container);
    
    const colors = ['#f59e0b', '#d97706', '#3b82f6', '#10b981', '#ef4444', '#ec4899'];
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.className = 'absolute w-2 h-2 rounded-full opacity-75 transition-all duration-[2000ms] ease-out';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.transform = 'translate(-50%, -50%)';
        container.appendChild(p);
        
        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 150;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${0.5 + Math.random()})`;
            p.style.opacity = '0';
        }, 50);
    }
    
    setTimeout(() => {
        container.remove();
    }, 2500);
}

function closeBreakthroughModal() {
    const modal = document.getElementById('breakthrough-modal');
    if (modal) modal.classList.add('hidden');
}

// --- HỆ THỐNG KIỂM TRA CẬP NHẬT TỰ ĐỘNG (AUTO-UPDATE CHANGER) ---
function checkAppUpdates() {
    // Để tránh làm nghẽn khởi động chính, ta chạy kiểm tra sau 2 giây khi app đã hiển thị mượt mà
    setTimeout(() => {
        if (typeof eel === 'undefined') return;
        
        eel.check_for_updates()().then(res => {
            if (res && res.status === "success" && res.is_new) {
                const modal = document.getElementById('update-modal');
                const currentTag = document.getElementById('current-version-tag');
                const latestTag = document.getElementById('update-version-tag');
                const downloadBtn = document.getElementById('update-download-btn');
                const changelogBox = document.getElementById('update-changelog-box');
                const changelogText = document.getElementById('update-changelog-text');
                
                if (modal) {
                    if (currentTag) currentTag.innerText = `v${res.current_version}`;
                    if (latestTag) latestTag.innerText = `v${res.latest_version}`;
                    
                    if (res.changelog && changelogBox && changelogText) {
                        changelogText.innerText = res.changelog;
                        changelogBox.classList.remove('hidden');
                    } else if (changelogBox) {
                        changelogBox.classList.add('hidden');
                    }
                    
                    if (downloadBtn) {
                        downloadBtn.onclick = () => {
                            eel.open_update_url(res.download_url)();
                            closeUpdateModal();
                        };
                    }
                    
                    modal.classList.remove('hidden');
                }
            }
        }).catch(err => {
            console.log("Không thể kết nối máy chủ kiểm tra cập nhật:", err);
        });
    }, 2000);
}

function closeUpdateModal() {
    const modal = document.getElementById('update-modal');
    if (modal) modal.classList.add('hidden');
}