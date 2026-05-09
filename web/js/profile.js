async function initProfile() {
    console.log("Initializing Profile...");
    try {
        const stats = await eel.get_user_stats()();
        window.checkBreakthrough(stats);
        renderProfileStats(stats);
        renderDailyQuests(stats);
        loadAchievements();
    } catch (error) {
        console.error("Lỗi khởi tạo Profile:", error);
    }
}

function renderProfileStats(stats) {
    // Basic stats
    document.getElementById('profile-level').textContent = stats.level;
    document.getElementById('profile-xp-current').textContent = stats.xp_in_level;
    document.getElementById('profile-xp-needed').textContent = stats.xp_needed;
    document.getElementById('profile-coins').textContent = stats.coins || 0;

    // Streak
    const streakDays = stats.streak_days || 0;
    const streakEl = document.getElementById('profile-streak');
    streakEl.innerHTML = `🔥 ${streakDays} Ngày`;
    if (streakDays > 0) {
        streakEl.classList.remove('grayscale', 'opacity-50');
    } else {
        streakEl.classList.add('grayscale', 'opacity-50');
    }

    // Progress Bar
    const percent = (stats.xp_in_level / stats.xp_needed) * 100;
    document.getElementById('profile-xp-bar').style.width = `${Math.min(percent, 100)}%`;

    // Mascot
    const mascotEl = document.getElementById('profile-mascot');
    const titleEl = document.getElementById('profile-title').firstChild; // Get text node
    
    const ranks = [
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

    let currentRank = ranks[0];
    for (const r of ranks) {
        if (stats.level >= r.level) currentRank = r;
    }
    
    const iconHtml = `<img src="assets/icons/rank-${currentRank.rank}.png" class="w-full h-full object-contain p-2" onerror="this.outerHTML='${currentRank.icon}'">`;
    mascotEl.innerHTML = iconHtml;
    titleEl.textContent = currentRank.name + " ";
}

function renderDailyQuests(stats) {
    renderQuestList(stats.daily_quests, 'quests-container');
    renderQuestList(stats.weekly_quests, 'weekly-quests-container');
}

function renderQuestList(questsObj, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const quests = questsObj || {};

    if (Object.keys(quests).length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Không có nhiệm vụ nào.</div>`;
        return;
    }

    let html = '';
    for (const [id, quest] of Object.entries(quests)) {
        const isCompleted = quest.progress >= quest.goal;
        const isClaimed = quest.claimed;

        // Caculate progress width
        const progressPercent = Math.min((quest.progress / quest.goal) * 100, 100);

        let buttonHtml = '';
        if (isClaimed) {
            buttonHtml = `<button disabled class="px-4 py-2 bg-dark text-dim font-bold rounded-xl cursor-not-allowed border border-border">Đã nhận</button>`;
        } else if (isCompleted) {
            buttonHtml = `<button onclick="claimQuest('${id}')" class="px-4 py-2 bg-primary text-black font-bold rounded-xl hover:brightness-110 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all">Nhận +${quest.reward} Tu vi</button>`;
        } else if (id.startsWith('random_')) {
            buttonHtml = `<button onclick="markQuestDone('${id}')" class="px-4 py-2 bg-dark hover:bg-gray-800 text-white font-bold rounded-xl border border-white/10 transition-all">Đánh dấu xong</button>`;
        } else {
            buttonHtml = `<div class="text-right">
                <span class="text-xs font-bold text-gray-500 block mb-1">${quest.progress} / ${quest.goal}</span>
                <span class="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">+${quest.reward} Tu vi</span>
            </div>`;
        }

        html += `
        <div class="bg-card border ${isCompleted && !isClaimed ? 'border-primary/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'border-border'} rounded-2xl p-4 flex items-center justify-between transition-all">
            <div class="flex items-center gap-4 w-full md:w-auto">
                <div class="w-12 h-12 rounded-xl bg-dark flex items-center justify-center p-2 border border-border">
                    <img src="assets/icons/${quest.icon}" class="w-full h-full object-contain ${isCompleted ? '' : 'grayscale opacity-70'}">
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-main text-base truncate ${isClaimed ? 'text-gray-500 line-through' : ''}">${quest.title}</h3>
                    <p class="text-xs text-dim mb-2">${quest.desc}</p>
                    
                    <!-- Progress Bar mini -->
                    <div class="w-full max-w-[150px] h-1.5 bg-dark border border-border rounded-full overflow-hidden">
                        <div class="h-full ${isCompleted ? 'bg-primary' : 'bg-gray-500'} transition-all" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="ml-4 shrink-0">
                ${buttonHtml}
            </div>
        </div>
        `;
    }

    container.innerHTML = html;
}

async function claimQuest(questId) {
    try {
        const newStats = await eel.claim_quest_reward(questId)();
        if (newStats) {
            renderProfileStats(newStats);
            renderDailyQuests(newStats);
        }
    } catch (e) {
        console.error("Lỗi khi nhận thưởng:", e);
    }
}

async function markQuestDone(questId) {
    try {
        // Chỉ đơn giản update_quest với số lượng 1
        const newStats = await eel.update_quest(questId, 1)();
        if (newStats) {
            renderProfileStats(newStats);
            renderDailyQuests(newStats);
            showToast("Đã đánh dấu hoàn thành!", "success");
        }
    } catch (e) {
        console.error("Lỗi khi đánh dấu xong:", e);
    }
}

async function loadAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    
    try {
        const achievements = await eel.get_achievements()();
        let html = '';
        let unlockedCount = 0;
        
        achievements.forEach(ach => {
            if (ach.unlocked) unlockedCount++;
            const pct = Math.min((ach.progress / ach.goal) * 100, 100);
            
            html += `
            <div class="flex flex-col items-center gap-2 group cursor-pointer relative" title="${ach.desc} (${ach.progress}/${ach.goal} ${ach.unit})">
                <div class="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 transition-all duration-300 relative ${ach.unlocked ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105' : 'bg-dark border-border opacity-40 grayscale'}">
                    ${ach.icon}
                    <!-- Lock Overlay -->
                    ${!ach.unlocked ? '<span class="absolute -bottom-1 -right-1 text-xs bg-black rounded-full w-5 h-5 flex items-center justify-center border border-border">🔒</span>' : '<span class="absolute -bottom-1 -right-1 text-xs bg-primary rounded-full w-5 h-5 flex items-center justify-center border border-black text-black font-black">✓</span>'}
                </div>
                <span class="text-[10px] font-bold text-center text-main">${ach.title}</span>
                
                <!-- Hover Progress Panel -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-black border border-border rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-2xl text-left">
                    <p class="text-xs font-bold text-white mb-1">${ach.title}</p>
                    <p class="text-[10px] text-gray-400 mb-2 leading-tight">${ach.desc}</p>
                    <div class="flex justify-between items-center text-[9px] font-bold text-gray-500 mb-1">
                        <span>Tiến độ:</span>
                        <span>${Math.round(ach.progress)} / ${ach.goal} ${ach.unit}</span>
                    </div>
                    <div class="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full bg-primary" style="width: ${pct}%"></div>
                    </div>
                </div>
            </div>
            `;
        });
        
        grid.innerHTML = html;
        
        // Update the footer text in achievement container
        const footer = grid.nextElementSibling;
        if (footer) {
            footer.innerHTML = `
                <p class="text-xs font-semibold text-primary">Đạo hữu đã khai mở <span class="text-white bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-full font-black">${unlockedCount} / ${achievements.length}</span> Tiên Lộ Ấn!</p>
            `;
        }
    } catch (e) {
        console.error("Lỗi tải thành tựu:", e);
    }
}
