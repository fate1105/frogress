let toeicData = { vocal: [], grammar: [] };
let currentTab = 'vocal';
let selectedTopic = 'All';
let currentView = 'topics'; // 'topics' or 'words'
let practiceMode = false;
let practiceCards = [];
let currentCardIndex = 0;
let statusFilter = 'all';
let reverseMode = false;
let typingMode = false;
let quizMode = false;
let isTribulation = false;
let tribulationScore = 0;
let dailyGoalProgress = 0;
let isFreePractice = false;
let practiceLimit = 10;
let activePracticeModeSetting = 'flashcard';
const DAILY_GOAL_MAX = 10;

const SRS_INTERVALS = {
    0: 0,
    1: 12 * 60,     // Level 1: 12 hours (in minutes)
    2: 24 * 60,     // Level 2: 1 day
    3: 3 * 24 * 60, // Level 3: 3 days
    4: 7 * 24 * 60, // Level 4: 7 days
    5: 14 * 24 * 60 // Level 5: 14 days (Hóa Thần - Đại Thành)
};

const SRS_TIERS = {
    0: { label: "Nhập Môn", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
    1: { label: "Tiểu Thành", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    2: { label: "Đại Thành", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    3: { label: "Viên Mãn", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    4: { label: "Đại Viên Mãn", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    5: { label: "Xuất Thần Nhập Hóa", color: "text-spotify bg-spotify/10 border-spotify/20" }
};

async function initToeic() {
    loadToeicData();
    await initDailyGoal();
}

async function initDailyGoal() {
    const stats = await eel.get_user_stats()();
    const dailyQuest = stats.daily_quests ? stats.daily_quests['english_10'] : null;
    
    if (dailyQuest) {
        dailyGoalProgress = dailyQuest.progress;
    } else {
        dailyGoalProgress = 0;
    }
    updateGoalUI();
}

function updateGoalUI() {
    const bar = document.getElementById('daily-goal-bar');
    const text = document.getElementById('daily-goal-text');
    if (!bar || !text) return;
    
    const percent = Math.min((dailyGoalProgress / DAILY_GOAL_MAX) * 100, 100);
    bar.style.width = percent + '%';
    text.innerText = `${dailyGoalProgress} / ${DAILY_GOAL_MAX} câu`;
}

async function incrementGoal() {
    dailyGoalProgress++;
    updateGoalUI();
    await eel.record_english_study()();
}

async function loadToeicData() {
    const grid = document.getElementById('toeic-grid');
    if (grid) grid.innerHTML = '<div class="col-span-full text-center py-10 text-primary">Đang tải dữ liệu TOEIC...</div>';
    
    // Gọi Python lấy dữ liệu
    toeicData = await eel.get_toeic_data()();
    
    // Cập nhật thống kê
    const total = toeicData.vocal.length;
    document.getElementById('toeic-stats').innerText = `${total} câu`;

    renderStats();
    renderTopics();
    checkTribulationEligibility();
    
    // Đặt view mặc định và cập nhật UI tương ứng
    switchView(currentView);
}

function renderStats() {
    const items = [...toeicData.vocal];
    const total = items.length;
    if (total === 0) return;

    const mastered = items.filter(i => i.status === 'mastered').length;
    const learning = items.filter(i => i.status === 'learning').length;
    const isNew = items.filter(i => (!i.status || i.status === 'new')).length;

    // Cập nhật text
    document.getElementById('stats-mastered-count').innerText = mastered;
    document.getElementById('stats-learning-count').innerText = learning;
    document.getElementById('stats-new-count').innerText = isNew;

    // Cập nhật Biểu đồ tròn (CSS Variables)
    const pMastered = (mastered / total) * 100;
    const pLearning = (learning / total) * 100 + pMastered;

    const chart = document.getElementById('stats-chart');
    if (chart) {
        chart.style.setProperty('--p-mastered', `${pMastered}%`);
        chart.style.setProperty('--p-learning', `${pLearning}%`);
    }
}

// Chuyển đổi giữa 2 tab
function switchTab(tabName) {
    currentTab = tabName;
    
    // Đổi style Tab
    const btnVocal = document.getElementById('btn-tab-vocal');
    const btnGrammar = document.getElementById('btn-tab-grammar');
    
    if (tabName === 'vocal') {
        btnVocal.className = "px-6 py-3 font-bold text-sm border-b-2 border-primary text-white transition-all";
        btnGrammar.className = "px-6 py-3 font-bold text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-300 transition-all";
    } else {
        btnGrammar.className = "px-6 py-3 font-bold text-sm border-b-2 border-primary text-white transition-all";
        btnVocal.className = "px-6 py-3 font-bold text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-300 transition-all";
    }
    
    renderList();
}

function getReviewStatusText(nextReviewStr) {
    if (!nextReviewStr) return { text: "Cần ôn tập ngay ⚡", color: "text-primary bg-primary/10 border-primary/20 animate-pulse" };
    
    const now = new Date();
    const nextReview = new Date(nextReviewStr);
    
    if (nextReview <= now) {
        return { text: "Cần ôn tập ngay ⚡", color: "text-primary bg-primary/10 border-primary/20 animate-pulse" };
    }
    
    const diffMs = nextReview - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
        return { text: `Ôn tập sau ${diffMins} phút ⏳`, color: "text-gray-400 bg-gray-500/5 border-gray-500/10" };
    }
    
    const diffHours = Math.ceil(diffMins / 60);
    if (diffHours < 24) {
        return { text: `Ôn tập sau ${diffHours} giờ ⏳`, color: "text-gray-400 bg-gray-500/5 border-gray-500/10" };
    }
    
    const diffDays = Math.ceil(diffHours / 24);
    return { text: `Ôn tập sau ${diffDays} ngày ⏳`, color: "text-gray-400 bg-gray-500/5 border-gray-500/10" };
}

// Render Danh mục Chủ đề dưới dạng Grid Cards tuyệt đẹp
function renderTopics() {
    const topicsGrid = document.getElementById('toeic-topics-grid');
    if (!topicsGrid) return;

    // Nhóm từ vựng và tính toán thống kê cho mỗi chủ đề
    const topicStats = {};
    toeicData.vocal.forEach(item => {
        const topic = item.topic || 'General';
        if (!topicStats[topic]) {
            topicStats[topic] = { total: 0, mastered: 0, learning: 0, new: 0 };
        }
        topicStats[topic].total++;
        const status = item.status || 'new';
        if (status === 'mastered') {
            topicStats[topic].mastered++;
        } else if (status === 'learning') {
            topicStats[topic].learning++;
        } else {
            topicStats[topic].new++;
        }
    });

    const uniqueTopics = Object.keys(topicStats).sort();
    
    // Cập nhật số lượng chủ đề lên badge
    const totalBadge = document.getElementById('topics-total-badge');
    if (totalBadge) {
        totalBadge.innerText = `${uniqueTopics.length} chủ đề`;
    }

    let html = '';
    
    // 1. Thẻ đặc biệt đại diện cho "Tất cả từ vựng" (🌌 General Overview)
    const allTotal = toeicData.vocal.length;
    const allMastered = toeicData.vocal.filter(item => item.status === 'mastered').length;
    const allLearning = toeicData.vocal.filter(item => item.status === 'learning').length;
    const allNew = allTotal - allMastered - allLearning;
    const allPercent = allTotal > 0 ? Math.round((allMastered / allTotal) * 100) : 0;
    
    html += `
        <div onclick="selectTopic('All')" class="bg-card p-5 rounded-2xl border border-border shadow-md transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between cursor-pointer group relative overflow-hidden animate-[fadeIn_0.3s] min-h-[260px]">
            <!-- Card highlight deco -->
            <div class="absolute right-0 top-0 w-24 h-24 bg-spotify/5 rounded-bl-full group-hover:bg-spotify/10 transition-colors z-0"></div>
            
            <div class="z-10 flex-1">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Tổng thể</span>
                    <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-spotify/10 text-spotify border border-spotify/20">${allTotal} từ vựng</span>
                </div>
                
                <h4 class="text-white font-extrabold text-xl tracking-wide group-hover:text-spotify transition-colors flex items-center gap-2 mb-4">
                    🌌 Tất cả từ vựng
                </h4>
                
                <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-gray-400 mb-4 bg-dark/40 p-2.5 rounded-xl border border-border/20">
                    <div>
                        <span class="text-spotify block text-xs font-black">${allMastered}</span>
                        <span class="text-gray-500">Thuộc</span>
                    </div>
                    <div>
                        <span class="text-primary block text-xs font-black">${allLearning}</span>
                        <span class="text-gray-500">Đang học</span>
                    </div>
                    <div>
                        <span class="text-gray-400 block text-xs font-black">${allNew}</span>
                        <span class="text-gray-500">Chưa học</span>
                    </div>
                </div>

                <div class="space-y-1.5 mb-4">
                    <div class="flex justify-between text-[10px] text-gray-500 font-bold">
                        <span>Tiến trình hoàn thành</span>
                        <span>${allPercent}%</span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-spotify to-green-400" style="width: ${allPercent}%"></div>
                    </div>
                </div>
            </div>
            
            <button onclick="event.stopPropagation(); practiceTopicDirect('All')" class="w-full justify-center bg-spotify/10 hover:bg-spotify text-spotify hover:text-black border border-spotify/20 hover:border-transparent py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 mt-2 group-hover:shadow-lg active:scale-95 z-10">
                <span>🎮 Luyện tập tất cả</span>
            </button>
        </div>
    `;

    // 2. Render từng Thẻ thư mục Chủ đề (Topic cards)
    uniqueTopics.forEach(topic => {
        const stats = topicStats[topic];
        const percent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
        
        html += `
            <div onclick="selectTopic('${topic.replace(/'/g, "\\'")}')" class="bg-card p-5 rounded-2xl border border-border shadow-md transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between cursor-pointer group relative overflow-hidden animate-[fadeIn_0.3s] min-h-[260px]">
                <!-- Card highlight deco -->
                <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors z-0"></div>
                
                <div class="z-10 flex-1">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Chủ đề</span>
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">${stats.total} từ vựng</span>
                    </div>
                    
                    <h4 class="text-white font-extrabold text-xl tracking-wide group-hover:text-primary transition-colors flex items-center gap-2 mb-4">
                        🏷️ ${topic}
                    </h4>
                    
                    <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-gray-400 mb-4 bg-dark/40 p-2.5 rounded-xl border border-border/20">
                        <div>
                            <span class="text-spotify block text-xs font-black">${stats.mastered}</span>
                            <span class="text-gray-500">Thuộc</span>
                        </div>
                        <div>
                            <span class="text-primary block text-xs font-black">${stats.learning}</span>
                            <span class="text-gray-500">Đang học</span>
                        </div>
                        <div>
                            <span class="text-gray-400 block text-xs font-black">${stats.new}</span>
                            <span class="text-gray-500">Chưa học</span>
                        </div>
                    </div>

                    <div class="space-y-1.5 mb-4">
                        <div class="flex justify-between text-[10px] text-gray-500 font-bold">
                            <span>Tiến trình hoàn thành</span>
                            <span>${percent}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-spotify to-green-400" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
                
                <button onclick="event.stopPropagation(); practiceTopicDirect('${topic.replace(/'/g, "\\'")}')" class="w-full justify-center bg-spotify/10 hover:bg-spotify text-spotify hover:text-black border border-spotify/20 hover:border-transparent py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 mt-2 group-hover:shadow-lg active:scale-95 z-10">
                    <span>🎮 Luyện tập chủ đề</span>
                </button>
            </div>
        `;
    });

    topicsGrid.innerHTML = html;
}

function switchView(view) {
    currentView = view;
    
    const wordsHeader = document.getElementById('toeic-words-header');
    const filters = document.getElementById('toeic-filters');
    const wordsGrid = document.getElementById('toeic-grid');
    const topicsGridView = document.getElementById('toeic-topics-grid-view');
    const activeTopicTitle = document.getElementById('active-topic-title');

    if (view === 'topics') {
        selectedTopic = 'All';
        if (topicsGridView) topicsGridView.style.setProperty('display', 'block', 'important');
        if (wordsHeader) wordsHeader.style.setProperty('display', 'none', 'important');
        if (filters) filters.style.setProperty('display', 'none', 'important');
        if (wordsGrid) wordsGrid.style.setProperty('display', 'none', 'important');
        
        renderStats();
        renderTopics();
    } else {
        if (topicsGridView) topicsGridView.style.setProperty('display', 'none', 'important');
        if (wordsHeader) wordsHeader.style.setProperty('display', 'flex', 'important');
        if (filters) filters.style.setProperty('display', 'flex', 'important');
        if (wordsGrid) wordsGrid.style.setProperty('display', 'grid', 'important');
        
        if (activeTopicTitle) {
            activeTopicTitle.innerText = `🏷️ Chủ đề: ${selectedTopic === 'All' ? 'Tất cả' : selectedTopic}`;
        }
        
        renderList();
    }
}

function selectTopic(topic) {
    selectedTopic = topic;
    switchView('words');
}

function practiceTopicDirect(topic) {
    selectedTopic = topic;
    practiceMode = true;
    updatePracticeUI();
}

function practiceActiveTopic() {
    practiceMode = true;
    updatePracticeUI();
}

// Render dữ liệu ra lưới
function renderList() {
    const grid = document.getElementById('toeic-grid');
    const searchInput = document.getElementById('toeic-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let items = toeicData.vocal || [];
    
    // Lọc theo Chủ đề
    if (selectedTopic !== 'All') {
        items = items.filter(item => item.topic === selectedTopic);
    }

    // Lọc theo tìm kiếm
    if (query) {
        items = items.filter(item => 
            (item.word || '').toLowerCase().includes(query) || 
            (item.meaning_vn || '').toLowerCase().includes(query) ||
            (item.definition_vn || '').toLowerCase().includes(query) ||
            (item.definition_en || '').toLowerCase().includes(query) ||
            (item.example || '').toLowerCase().includes(query) ||
            (item.topic || '').toLowerCase().includes(query)
        );
    }
    
    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
        items = items.filter(item => (item.status || 'new') === statusFilter);
    }
    
    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500">Không tìm thấy dữ liệu phù hợp.</div>`;
        return;
    }

    let html = '';
    items.forEach((item) => {
        const srsLevel = item.srs_level !== undefined ? item.srs_level : 0;
        const srsTier = SRS_TIERS[srsLevel] || SRS_TIERS[0];
        const reviewStatus = getReviewStatusText(item.next_review);

        if (item.word) {
            // Render beautiful vocabulary card
            const word = item.word;
            const pos = item.partOfSpeech || '';
            const level = item.level || '';
            const topic = item.topic || '';
            const phonetic = item.phonetic || '';
            const meaning = item.meaning_vn || '';
            const defVn = item.definition_vn || '';
            const defEn = item.definition_en || '';
            const example = item.example || '';
            const audioUrl = item.audio_url || '';
            
            let badgesHtml = '';
            if (pos) badgesHtml += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">${pos}</span>`;
            if (level) badgesHtml += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">${level}</span>`;
            if (topic) badgesHtml += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">${topic}</span>`;

            let audioHtml = '';
            if (audioUrl) {
                audioHtml = `
                    <button onclick="event.stopPropagation(); playVocabAudio('${audioUrl}')" 
                            class="p-2 bg-spotify/10 hover:bg-spotify/20 rounded-xl text-spotify transition-all flex items-center justify-center shrink-0 shadow-md border border-spotify/20 active:scale-95" 
                            title="Nghe phát âm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    </button>
                `;
            }

            html += `
                <div class="bg-card p-5 rounded-2xl border border-gray-800 hover:border-gray-600 shadow-md transition-all duration-300 flex flex-col justify-between group relative animate-[fadeIn_0.3s]">
                    <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onclick="cycleStatus('${item.id}')" title="Đổi trạng thái" class="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg></button>
                        <button onclick="deleteItem('${item.id}')" title="Xóa" class="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                    <div>
                        <div class="flex flex-wrap gap-1.5 items-center mb-3">
                            <span class="text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${srsTier.color}">${srsTier.label}</span>
                            <span class="text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${reviewStatus.color}">${reviewStatus.text}</span>
                            ${badgesHtml}
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <p class="text-white font-extrabold text-2xl tracking-wide group-hover:text-primary transition-colors">${word}</p>
                            ${audioHtml}
                        </div>
                        
                        ${phonetic ? `<p class="text-gray-500 text-xs font-mono mt-1">${phonetic}</p>` : ''}
                        
                        <div class="mt-3.5 space-y-2 border-t border-border/20 pt-3">
                            <p class="text-spotify font-bold text-sm"><span class="text-gray-500 font-medium mr-1.5">Nghĩa:</span>${meaning}</p>
                            ${defVn ? `<p class="text-gray-300 text-xs leading-relaxed"><span class="text-gray-500 font-medium mr-1.5">Giải nghĩa:</span>${defVn}</p>` : ''}
                            ${defEn ? `<p class="text-gray-400 text-xs italic leading-relaxed"><span class="text-gray-500 font-medium mr-1.5">English:</span>"${defEn}"</p>` : ''}
                        </div>
                        
                        ${example ? `
                            <div class="mt-4 p-3 rounded-xl bg-dark/40 border border-border/20 text-xs text-gray-300 leading-relaxed italic">
                                <span class="text-gray-500 font-bold block mb-1 not-italic uppercase tracking-wider text-[9px]">Ví dụ ứng dụng:</span>
                                "${highlightWord(example, word)}"
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    });
    
    grid.innerHTML = html;
}

function setStatusFilter(status, btn) {
    statusFilter = status;
    document.querySelectorAll('.status-filter-btn').forEach(b => {
        b.classList.remove('active', 'bg-gray-800', 'text-white');
        b.classList.add('text-gray-500');
    });
    if (btn) {
        btn.classList.add('active', 'bg-gray-800', 'text-white');
        btn.classList.remove('text-gray-500');
    }
    renderList();
}

async function cycleStatus(itemId) {
    const item = toeicData[currentTab].find(i => i.id == itemId);
    if (!item) return;
    
    const nextLevels = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 0 };
    const oldLevel = item.srs_level !== undefined ? item.srs_level : 0;
    const newLevel = nextLevels[oldLevel];
    
    item.srs_level = newLevel;
    
    if (newLevel === 0) {
        item.status = 'new';
        item.next_review = null;
    } else if (newLevel === 5) {
        item.status = 'mastered';
        item.next_review = new Date(Date.now() + SRS_INTERVALS[5] * 60 * 1000).toISOString();
        incrementGoal();
    } else {
        item.status = 'learning';
        item.next_review = new Date(Date.now() + SRS_INTERVALS[newLevel] * 60 * 1000).toISOString();
    }
    
    await eel.update_toeic_item(currentTab, item)();
    renderStats();
    renderList();
}

async function deleteItem(itemId) {
    const res = await eel.delete_toeic_item(currentTab, parseInt(itemId))();
    if (res.status === 'success') {
        showToast("Đã xóa câu hỏi thành công!", "success");
        await loadToeicData();
    } else {
        showToast("Lỗi xóa: " + res.msg, "error");
    }
}

// --- XỬ LÝ CHẾ ĐỘ THỰC HÀNH (LUYỆN TẬP) ---
async function togglePracticeMode() {
    if (!practiceMode) {
        selectedTopic = 'All'; // Nút Luyện tập tổng thể ở trên
    }
    practiceMode = !practiceMode;
    updatePracticeUI();
    
    // Nếu vừa thoát khỏi chế độ luyện tập, tải lại dữ liệu để cập nhật tiến trình mới nhất
    if (!practiceMode) {
        await loadToeicData();
    }
}

function updatePracticeUI() {
    const btnToggle = document.getElementById('btn-toggle-practice');
    const wordsHeader = document.getElementById('toeic-words-header');
    const topicsGridView = document.getElementById('toeic-topics-grid-view');
    const grid = document.getElementById('toeic-grid');
    const filters = document.getElementById('toeic-filters');
    const practiceContainer = document.getElementById('toeic-practice-container');
    const dashboard = document.getElementById('toeic-dashboard');

    if (practiceMode) {
        if (btnToggle) {
            btnToggle.innerHTML = "<span>📋 Quản lý List</span>";
            btnToggle.classList.replace('bg-spotify', 'bg-gray-600');
            btnToggle.classList.replace('text-black', 'text-white');
        }
        if (wordsHeader) wordsHeader.style.setProperty('display', 'none', 'important');
        if (topicsGridView) topicsGridView.style.setProperty('display', 'none', 'important');
        if (grid) grid.style.setProperty('display', 'none', 'important');
        if (filters) filters.style.setProperty('display', 'none', 'important');
        if (dashboard) dashboard.style.setProperty('display', 'none', 'important');
        if (practiceContainer) practiceContainer.style.setProperty('display', 'flex', 'important');
        
        isFreePractice = false;
        showPracticeSetup();
    } else {
        if (btnToggle) {
            btnToggle.innerHTML = "<span>🎮 Luyện tập</span>";
            btnToggle.classList.replace('bg-gray-600', 'bg-spotify');
            btnToggle.classList.replace('text-white', 'text-black');
        }
        if (practiceContainer) practiceContainer.style.setProperty('display', 'none', 'important');
        if (dashboard) dashboard.style.setProperty('display', 'grid', 'important');
        
        // Trở lại đúng view tương ứng trước đó
        switchView(currentView);
    }
}

function showPracticeSetup() {
    const wrapper = document.getElementById('flashcard-wrapper');
    const titleEl = document.getElementById('practice-header-title');
    if (titleEl) {
        titleEl.innerText = selectedTopic === 'All' ? "Luyện tập Tổng thể" : `Luyện tập: ${selectedTopic}`;
    }
    document.getElementById('practice-progress-text').innerText = `0 / 0`;

    wrapper.innerHTML = `
        <div class="w-full max-w-md bg-card p-8 rounded-3xl border border-gray-800 shadow-2xl flex flex-col gap-6 animate-[fadeIn_0.3s]">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-white mb-1">Thiết lập Tu luyện</h3>
                <p class="text-gray-400 text-xs">Hãy chọn cấu hình thích hợp trước khi bắt đầu bài tập</p>
            </div>
            
            <!-- Word Count Selector -->
            <div class="space-y-2.5">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">Số lượng câu ôn tập</label>
                <div class="grid grid-cols-4 gap-2">
                    <button onclick="setPracticeCount(10)" id="btn-count-10" class="practice-count-btn bg-dark border border-gray-700 text-gray-300 py-3 rounded-xl font-bold text-sm hover:border-spotify hover:text-white transition-all">10 câu</button>
                    <button onclick="setPracticeCount(20)" id="btn-count-20" class="practice-count-btn bg-dark border border-gray-700 text-gray-300 py-3 rounded-xl font-bold text-sm hover:border-spotify hover:text-white transition-all">20 câu</button>
                    <button onclick="setPracticeCount(30)" id="btn-count-30" class="practice-count-btn bg-dark border border-gray-700 text-gray-300 py-3 rounded-xl font-bold text-sm hover:border-spotify hover:text-white transition-all">30 câu</button>
                    <button onclick="setPracticeCount('all')" id="btn-count-all" class="practice-count-btn bg-dark border border-gray-700 text-gray-300 py-3 rounded-xl font-bold text-sm hover:border-spotify hover:text-white transition-all">Tất cả</button>
                </div>
            </div>
            
            <!-- Mode Selector -->
            <div class="space-y-2.5">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">Chế độ tu luyện</label>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="setPracticeModeSetting('flashcard')" id="btn-mode-flashcard" class="practice-mode-btn bg-dark border border-gray-700 text-gray-300 py-3 px-2 rounded-xl font-bold text-xs hover:border-primary hover:text-white transition-all flex flex-col items-center gap-1.5">
                        <span class="text-base">🎴</span>
                        <span>Thường</span>
                    </button>
                    <button onclick="setPracticeModeSetting('reverse')" id="btn-mode-reverse" class="practice-mode-btn bg-dark border border-gray-700 text-gray-300 py-3 px-2 rounded-xl font-bold text-xs hover:border-primary hover:text-white transition-all flex flex-col items-center gap-1.5">
                        <span class="text-base">🔄</span>
                        <span>Ngược</span>
                    </button>
                    <button onclick="setPracticeModeSetting('typing')" id="btn-mode-typing" class="practice-mode-btn bg-dark border border-gray-700 text-gray-300 py-3 px-2 rounded-xl font-bold text-xs hover:border-spotify hover:text-white transition-all flex flex-col items-center gap-1.5">
                        <span class="text-base">⌨️</span>
                        <span>Gõ chữ</span>
                    </button>
                </div>
            </div>
            
            <!-- Action buttons -->
            <button onclick="startActualPractice()" class="w-full bg-spotify text-black font-bold py-3.5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 mt-2 font-bold text-sm">
                <span>⚡ Bắt đầu tu luyện</span>
            </button>
        </div>
    `;

    updatePracticeSetupUI();
}

function updatePracticeSetupUI() {
    // Reset and set active styles for count buttons
    document.querySelectorAll('.practice-count-btn').forEach(btn => {
        btn.className = "practice-count-btn bg-dark border border-gray-700 text-gray-400 py-3 rounded-xl font-bold text-sm hover:border-spotify hover:text-white transition-all";
    });
    const activeCountBtn = document.getElementById(`btn-count-${practiceLimit}`);
    if (activeCountBtn) {
        activeCountBtn.className = "practice-count-btn bg-spotify/10 border-spotify text-spotify py-3 rounded-xl font-bold text-sm transition-all";
    }

    // Reset and set active styles for mode buttons
    document.querySelectorAll('.practice-mode-btn').forEach(btn => {
        btn.className = "practice-mode-btn bg-dark border border-gray-700 text-gray-400 py-3 px-2 rounded-xl font-bold text-xs hover:border-primary hover:text-white transition-all flex flex-col items-center gap-1.5";
    });
    const activeModeBtn = document.getElementById(`btn-mode-${activePracticeModeSetting}`);
    if (activeModeBtn) {
        const colorClass = (activePracticeModeSetting === 'typing' || activePracticeModeSetting === 'quiz') ? 'border-spotify text-spotify bg-spotify/10' : 'border-primary text-primary bg-primary/10';
        activeModeBtn.className = `practice-mode-btn ${colorClass} border py-3 px-2 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-1.5`;
    }
}

function setPracticeCount(count) {
    practiceLimit = count;
    updatePracticeSetupUI();
}

function setPracticeModeSetting(mode) {
    activePracticeModeSetting = mode;
    updatePracticeSetupUI();
}

function startActualPractice() {
    if (activePracticeModeSetting === 'flashcard') {
        typingMode = false;
        reverseMode = false;
        quizMode = false;
    } else if (activePracticeModeSetting === 'reverse') {
        typingMode = false;
        reverseMode = true;
        quizMode = false;
    } else if (activePracticeModeSetting === 'typing') {
        typingMode = true;
        reverseMode = false;
        quizMode = false;
    } else if (activePracticeModeSetting === 'quiz') {
        typingMode = false;
        reverseMode = false;
        quizMode = true;
    }
    startPractice();
}

function startPractice() {
    let allInTab = [...toeicData.vocal];
    if (selectedTopic !== 'All') {
        allInTab = allInTab.filter(item => item.topic === selectedTopic);
    }
    const now = new Date();
    
    // Filter cards due for review (or new ones with no next_review)
    let dueCards = allInTab.filter(item => {
        if (!item.next_review) return true; // New or unreviewed
        return new Date(item.next_review) <= now;
    });
    
    const notMastered = allInTab.filter(item => !item.srs_level || item.srs_level < 5);
    
    if (dueCards.length === 0) {
        if (isFreePractice && allInTab.length > 0) {
            dueCards = notMastered.length > 0 ? notMastered : allInTab;
        } else {
            document.getElementById('flashcard-wrapper').innerHTML = `
                <div class="text-center py-10 px-6 max-w-md mx-auto flex flex-col items-center gap-6">
                    <div class="w-20 h-20 bg-spotify/10 rounded-full flex items-center justify-center text-spotify text-4xl animate-bounce">
                        ✨
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-white mb-2">Đại Công Cáo Thành!</h3>
                        <p class="text-gray-400 text-sm leading-relaxed">Đạo hữu hôm nay đã hoàn thành luyện tập tất cả các bí kíp đến hạn. Hãy dành thời gian nghỉ ngơi hoặc nạp thêm bí kíp mới!</p>
                    </div>
                    <div class="flex flex-col gap-2 w-full">
                        <button onclick="startFreePractice()" class="w-full bg-spotify text-black font-bold py-3 px-6 rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-2">
                            <span>🎮 Luyện tập tự do</span>
                        </button>
                        <button onclick="togglePracticeMode()" class="w-full bg-gray-800 text-gray-300 font-bold py-3 px-6 rounded-2xl hover:bg-gray-700 transition-all">
                            Quay lại quản lý
                        </button>
                    </div>
                </div>`;
            document.getElementById('practice-progress-text').innerText = `0 / 0`;
            return;
        }
    }
    
    // Shuffle
    for (let i = dueCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dueCards[i], dueCards[j]] = [dueCards[j], dueCards[i]];
    }
    
    const maxCount = practiceLimit === 'all' ? dueCards.length : parseInt(practiceLimit);
    practiceCards = dueCards.slice(0, maxCount); 
    currentCardIndex = 0;
    renderFlashcard();
}

function startFreePractice() {
    isFreePractice = true;
    startPractice();
}

function renderFlashcard() {
    const wrapper = document.getElementById('flashcard-wrapper');
    const originalCard = practiceCards[currentCardIndex];
    if (!originalCard) return;

    document.getElementById('practice-progress-text').innerText = `${currentCardIndex + 1} / ${practiceCards.length}`;

    if (typingMode) {
        // --- CHẾ ĐỘ GÕ CHỮ ---
        const isVocab = (currentTab === 'vocal' && originalCard.word);
        const displayMeaning = isVocab ? originalCard.meaning_vn : originalCard.answer; // Tiếng Việt
        const targetWord = isVocab ? originalCard.word : originalCard.question;   // Tiếng Anh
        const definition = isVocab ? (originalCard.definition_vn || originalCard.definition_en || '') : '';
        const sentenceWithBlank = isVocab && originalCard.example ? blankOutWord(originalCard.example, originalCard.word) : '';
        
        wrapper.innerHTML = `
            <div id="toeic-card" class="w-full max-w-xl bg-card p-6 rounded-3xl border border-gray-700 shadow-2xl flex flex-col justify-between min-h-[320px]">
                <div class="flex flex-col items-center justify-center text-center flex-1 gap-3">
                    <span class="text-[10px] font-bold text-spotify uppercase tracking-widest px-2.5 py-0.5 bg-spotify/10 rounded-full border border-spotify/20">Chế độ Gõ chữ</span>
                    <p class="text-gray-400 text-xs">Hãy nhập từ tiếng Anh có nghĩa là:</p>
                    <p class="text-2xl sm:text-3xl font-bold leading-relaxed text-white">${displayMeaning}</p>
                    ${definition ? `<p class="text-gray-400 text-xs italic">"${definition}"</p>` : ''}
                    ${sentenceWithBlank ? `
                        <div class="mt-3 p-3 rounded-xl bg-dark/40 border border-border/20 text-xs text-gray-300 italic max-w-md">
                            <span class="text-gray-500 font-bold block mb-1 not-italic uppercase text-[8px]">Ngữ cảnh gợi ý:</span>
                            "${sentenceWithBlank}"
                        </div>
                    ` : ''}
                </div>
                
                <div class="flex flex-col gap-3 mt-4">
                    <div class="relative">
                        <input type="text" id="typing-answer" placeholder="Gõ từ tiếng Anh tương ứng..." 
                               class="w-full bg-dark border-2 border-border focus:border-spotify p-3.5 rounded-2xl text-base text-center text-white outline-none transition-all typing-input"
                               onkeypress="if(event.key === 'Enter') checkTypingAnswer(this, '${targetWord.replace(/'/g, "\\'")}')"
                               autocomplete="off">
                    </div>
                    
                    <div class="flex justify-between items-center pt-1">
                        <button onclick="prevFlashcard()" class="p-2 text-gray-400 hover:text-white transition-colors" title="Câu trước">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                        
                        <div id="feedback-text" class="font-bold text-xs text-center flex-1 mx-4"></div>
                        
                        <button id="btn-next-flashcard" onclick="nextFlashcard()" class="p-2 text-spotify hover:scale-110 transition-transform hidden" title="Câu tiếp theo">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                        <button id="btn-show-hint" onclick="revealTypingAnswer('${targetWord.replace(/'/g, "\\'")}')" class="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-all" title="Xem đáp án">
                            Xem đáp án
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const input = document.getElementById('typing-answer');
            if (input) input.focus();
        }, 100);

    } else if (quizMode) {
        // --- CHẾ ĐỘ TRẮC NGHIỆM ---
        const isVocab = (currentTab === 'vocal' && originalCard.word);
        const displayQuestion = isVocab ? originalCard.word : originalCard.question;
        const correctAns = originalCard.answer;
        const options = originalCard.options;
        const pos = isVocab && originalCard.partOfSpeech ? originalCard.partOfSpeech : '';
        const level = isVocab && originalCard.level ? originalCard.level : '';
        const phonetic = isVocab && originalCard.phonetic ? originalCard.phonetic : '';
        const audioUrl = isVocab && originalCard.audio_url ? originalCard.audio_url : '';
        
        let subTitleHtml = '';
        if (isVocab) {
            let badges = '';
            if (pos) badges += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">${pos}</span>`;
            if (level) badges += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">${level}</span>`;
            
            subTitleHtml = `
                <div class="flex flex-col items-center gap-1.5 mt-2">
                    ${phonetic ? `<p class="text-gray-500 text-sm font-mono">${phonetic}</p>` : ''}
                    ${badges ? `<div class="flex gap-1.5">${badges}</div>` : ''}
                </div>
            `;
        }

        let optionsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full">';
        options.forEach((opt, idx) => {
            optionsHtml += `
                <button onclick="checkQuizAnswer(this, '${opt.replace(/'/g, "\\'")}', '${correctAns.replace(/'/g, "\\'")}')" 
                        class="quiz-opt-btn bg-dark border-2 border-border hover:border-primary text-gray-200 p-4 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01] flex items-center gap-3 w-full">
                    <span class="w-6 h-6 rounded-full bg-white/5 border border-gray-600 flex items-center justify-center text-xs text-gray-400 font-bold shrink-0">${String.fromCharCode(65 + idx)}</span>
                    <span class="truncate" title="${opt}">${opt}</span>
                </button>
            `;
        });
        optionsHtml += '</div>';
        
        wrapper.innerHTML = `
            <div id="toeic-card" class="w-full max-w-xl bg-card p-6 rounded-3xl border border-gray-700 shadow-2xl flex flex-col justify-between min-h-[350px]">
                <div class="flex flex-col items-center justify-center text-center flex-1 gap-2">
                    <span class="text-[10px] font-bold text-primary uppercase tracking-widest px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                        ${isTribulation ? '🔥 Thử Thách Độ Kiếp 🔥' : '📝 Chế độ Trắc nghiệm'}
                    </span>
                    <div class="flex items-center gap-3 mt-3">
                        <p class="text-3xl font-extrabold leading-relaxed text-white">${displayQuestion}</p>
                        ${audioUrl ? `
                            <button onclick="event.stopPropagation(); playVocabAudio('${audioUrl}')" 
                                    class="p-2 bg-spotify/10 hover:bg-spotify/20 rounded-xl text-spotify transition-all flex items-center justify-center shrink-0 border border-spotify/20 active:scale-95">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                    ${subTitleHtml}
                </div>
                
                ${optionsHtml}
                
                <div class="flex justify-between items-center pt-4 mt-4 border-t border-border/20">
                    <button onclick="prevFlashcard()" class="p-2 text-gray-400 hover:text-white transition-colors" title="Câu trước" ${isTribulation ? 'disabled style="display:none;"' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    </button>
                    
                    <div id="feedback-text" class="font-bold text-xs text-center flex-1 mx-4"></div>
                    
                    <button id="btn-next-flashcard" onclick="nextFlashcard()" class="p-2 text-spotify hover:scale-110 transition-transform hidden" title="Câu tiếp theo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;
        
        // Auto play audio
        if (audioUrl) {
            playVocabAudio(audioUrl);
        }

    } else {
        // --- CHẾ ĐỘ FLASHCARD THƯỜNG / NGƯỢC ---
        const isVocab = (currentTab === 'vocal' && originalCard.word);
        
        let displayFront = isVocab ? originalCard.word : originalCard.question; 
        let displayBack = isVocab ? originalCard.meaning_vn : originalCard.answer;     

        if (reverseMode) {
            displayFront = isVocab ? originalCard.meaning_vn : originalCard.answer;     
            displayBack = isVocab ? originalCard.word : originalCard.question;    
        }

        const pos = isVocab && originalCard.partOfSpeech ? originalCard.partOfSpeech : '';
        const level = isVocab && originalCard.level ? originalCard.level : '';
        const topic = isVocab && originalCard.topic ? originalCard.topic : '';
        const phonetic = isVocab && originalCard.phonetic ? originalCard.phonetic : '';
        const defVn = isVocab && originalCard.definition_vn ? originalCard.definition_vn : '';
        const defEn = isVocab && originalCard.definition_en ? originalCard.definition_en : '';
        const example = isVocab && originalCard.example ? originalCard.example : '';
        const audioUrl = isVocab && originalCard.audio_url ? originalCard.audio_url : '';

        let badgesHtml = '';
        if (pos) badgesHtml += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">${pos}</span>`;
        if (level) badgesHtml += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">${level}</span>`;
        if (topic) badgesHtml += `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">${topic}</span>`;

        // Mặt trước: Nếu có example, ẩn từ vựng đi
        const frontExampleHtml = isVocab && example ? `
            <div class="mt-4 p-3 rounded-xl bg-dark/40 border border-border/20 text-xs text-gray-400 leading-relaxed italic max-w-sm mx-auto">
                <span class="text-gray-500 font-bold block mb-1 not-italic uppercase text-[8px] tracking-wider">Gợi ý ngữ cảnh:</span>
                "${blankOutWord(example, originalCard.word)}"
            </div>
        ` : '';

        // Mặt sau: Hiện ví dụ đầy đủ và bôi đậm từ vựng
        const backExampleHtml = isVocab && example ? `
            <div class="mt-4 p-3 rounded-xl bg-dark/40 border border-border/20 text-xs text-gray-300 leading-relaxed italic max-w-sm mx-auto">
                <span class="text-gray-500 font-bold block mb-1 not-italic uppercase text-[8px] tracking-wider">Ví dụ ứng dụng:</span>
                "${highlightWord(example, originalCard.word)}"
            </div>
        ` : '';

        let audioButtonHtml = '';
        if (audioUrl) {
            audioButtonHtml = `
                <button onclick="event.stopPropagation(); playVocabAudio('${audioUrl}')" 
                        class="p-2 bg-spotify/15 hover:bg-spotify/25 rounded-xl text-spotify transition-all flex items-center justify-center shrink-0 border border-spotify/20 active:scale-95" 
                        title="Nghe phát âm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                </button>
            `;
        }

        wrapper.innerHTML = `
            <div id="toeic-card" class="perspective-1000 w-full max-w-xl h-[340px] sm:h-[400px] md:h-[440px] min-h-[300px] cursor-pointer">
                <div class="flip-card-inner h-full">
                    <!-- Mặt trước -->
                    <div class="flip-card-front bg-card p-6 rounded-3xl border border-gray-700 shadow-2xl flex flex-col items-center justify-between text-center">
                        <div class="absolute top-3 right-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-full border border-white/5">Mặt trước</div>
                        
                        <div class="flex-1 flex flex-col items-center justify-center gap-2">
                            <span class="text-[10px] font-bold text-primary uppercase tracking-widest px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">Bí kíp Flashcard</span>
                            <div class="flex items-center gap-3 mt-3">
                                <p class="text-3xl font-extrabold leading-relaxed text-white">${displayFront}</p>
                                ${!reverseMode ? audioButtonHtml : ''}
                            </div>
                            ${phonetic && !reverseMode ? `<p class="text-gray-500 text-sm font-mono">${phonetic}</p>` : ''}
                            ${badgesHtml ? `<div class="flex gap-1.5 mt-1.5">${badgesHtml}</div>` : ''}
                            ${!reverseMode ? frontExampleHtml : ''}
                        </div>
                        
                        <div class="w-full mt-4">
                            <div class="py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-bold animate-pulse">Chạm vào thẻ để lật xem nghĩa</div>
                            <div class="flex justify-between items-center mt-3 border-t border-border/20 pt-3">
                                <button onclick="event.stopPropagation(); prevFlashcard()" class="p-2 text-gray-400 hover:text-white transition-colors" title="Câu trước">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                </button>
                                <span class="text-[10px] text-gray-500">Chạm thẻ để lật</span>
                                <button onclick="event.stopPropagation(); nextFlashcard()" class="p-2 text-gray-400 hover:text-white transition-colors" title="Câu tiếp theo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Mặt sau -->
                    <div class="flip-card-back bg-card p-6 rounded-3xl border border-gray-700 shadow-2xl flex flex-col justify-between">
                        <div class="absolute top-3 right-3 text-[10px] font-bold text-spotify uppercase tracking-widest px-2 py-0.5 bg-spotify/10 rounded-full border border-spotify/20">Mặt sau</div>
                        
                        <div class="flex-1 flex flex-col items-center justify-center gap-1.5 overflow-y-auto py-2 custom-scrollbar">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nghĩa của từ / Định nghĩa</span>
                            <div class="flex items-center gap-3 mt-1">
                                <p class="text-3xl font-extrabold leading-relaxed text-spotify">${displayBack}</p>
                                ${reverseMode ? audioButtonHtml : ''}
                            </div>
                            ${phonetic && reverseMode ? `<p class="text-gray-500 text-sm font-mono">${phonetic}</p>` : ''}
                            
                            <div class="w-full max-w-sm mt-3 space-y-1.5 border-t border-border/20 pt-3 text-center">
                                ${defVn ? `<p class="text-gray-300 text-xs leading-relaxed"><span class="text-gray-500 font-semibold mr-1">Giải nghĩa:</span>${defVn}</p>` : ''}
                                ${defEn ? `<p class="text-gray-400 text-xs italic leading-relaxed"><span class="text-gray-500 font-semibold mr-1">English:</span>"${defEn}"</p>` : ''}
                            </div>
                            ${!reverseMode ? backExampleHtml : ''}
                        </div>

                        <div class="w-full flex flex-col gap-3 mt-4">
                            <div class="grid grid-cols-2 gap-2.5">
                                <button onclick="event.stopPropagation(); markFlashcardStatus('mastered')" class="flex items-center justify-center gap-2 bg-spotify/15 hover:bg-spotify/25 text-spotify border border-spotify/30 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>Đã thuộc</span>
                                </button>
                                <button onclick="event.stopPropagation(); markFlashcardStatus('learning')" class="flex items-center justify-center gap-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    <span>Chưa thuộc</span>
                                </button>
                            </div>
                            
                            <div class="flex justify-between items-center border-t border-border/20 pt-3 mt-1">
                                <button onclick="event.stopPropagation(); prevFlashcard()" class="p-2 text-gray-400 hover:text-white transition-colors" title="Câu trước">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                </button>
                                <span class="text-[10px] text-gray-500">Chạm thẻ để úp lại</span>
                                <button onclick="event.stopPropagation(); nextFlashcard()" class="p-2 text-gray-400 hover:text-white transition-colors" title="Câu tiếp theo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const cardElement = document.getElementById('toeic-card');
        cardElement.onclick = () => {
            cardElement.classList.toggle('flipped');
            if (cardElement.classList.contains('flipped') && !reverseMode && audioUrl) {
                playVocabAudio(audioUrl);
            }
            if (!cardElement.classList.contains('flipped') && reverseMode && audioUrl) {
                playVocabAudio(audioUrl);
            }
        };
    }
}

async function handleCorrectSRS(item) {
    const oldLevel = item.srs_level !== undefined ? item.srs_level : 0;
    const newLevel = Math.min(oldLevel + 1, 5);
    
    item.srs_level = newLevel;
    item.status = (newLevel === 5) ? 'mastered' : 'learning';
    
    const intervalMins = SRS_INTERVALS[newLevel];
    item.next_review = new Date(Date.now() + intervalMins * 60 * 1000).toISOString();
    
    await eel.update_toeic_item(currentTab, item)();
    incrementGoal();
}

async function handleWrongSRS(item) {
    item.srs_level = 1; // Reset to level 1 on failure
    item.status = 'learning';
    item.next_review = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Retry in 10 mins
    
    await eel.update_toeic_item(currentTab, item)();
    
    // Append to end of session so they get tested again until correct
    practiceCards.push(item);
    document.getElementById('practice-progress-text').innerText = `${currentCardIndex + 1} / ${practiceCards.length}`;
}

function checkTypingAnswer(input, correct) {
    const val = normalize(input.value);
    const cor = normalize(correct);
    const currentCard = practiceCards[currentCardIndex];
    
    if (val === cor && val !== "") {
        input.classList.remove('border-border', 'border-red-500', 'focus:border-spotify');
        input.classList.add('border-green-500', 'bg-green-500/10');
        input.disabled = true;
        
        const feedback = document.getElementById('feedback-text');
        feedback.innerText = "Chính xác!";
        feedback.className = "font-bold text-sm text-green-400";
        
        handleCorrectSRS(currentCard);
        
        setTimeout(() => {
            nextFlashcard();
        }, 1000);
    } else {
        input.classList.remove('border-border', 'focus:border-spotify');
        input.classList.add('border-red-500', 'bg-red-500/10');
        
        const feedback = document.getElementById('feedback-text');
        feedback.innerText = `Chưa đúng! Đáp án đúng: ${correct}`;
        feedback.className = "font-bold text-sm text-red-400";
        
        handleWrongSRS(currentCard);
        
        const btnNext = document.getElementById('btn-next-flashcard');
        if (btnNext) btnNext.classList.remove('hidden');
    }
}

function revealTypingAnswer(correct) {
    const feedback = document.getElementById('feedback-text');
    feedback.innerText = `Đáp án là: ${correct}`;
    feedback.className = "font-bold text-sm text-primary";
    
    const input = document.getElementById('typing-answer');
    if (input) {
        input.value = correct;
        input.disabled = true;
        input.classList.remove('border-red-500');
        input.classList.add('border-primary/50');
    }
    
    const currentCard = practiceCards[currentCardIndex];
    handleWrongSRS(currentCard);
    
    const btnNext = document.getElementById('btn-next-flashcard');
    if (btnNext) btnNext.classList.remove('hidden');
}

async function markFlashcardStatus(status) {
    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard) return;
    
    if (status === 'mastered') {
        showToast("Đã thuộc bí kíp!", "success");
        await handleCorrectSRS(currentCard);
    } else {
        showToast("Sẽ ôn tập lại sớm!", "info");
        await handleWrongSRS(currentCard);
    }
    
    setTimeout(() => {
        nextFlashcard();
    }, 500);
}

function normalize(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/\(.*\)/g, '')  
        .replace(/\[.*\]/g, '')  
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') 
        .replace(/\s\s+/g, ' ')  
        .trim();
}

function nextFlashcard() {
    if (currentCardIndex < practiceCards.length - 1) {
        currentCardIndex++;
        renderFlashcard();
    } else {
        if (isTribulation) {
            finishTribulation();
        } else {
            showToast('Bạn đã hoàn thành bài tập!', 'success');
            setTimeout(() => {
                togglePracticeMode();
            }, 1500);
        }
    }
}

function prevFlashcard() {
    if (currentCardIndex > 0 && !isTribulation) {
        currentCardIndex--;
        renderFlashcard();
    }
}

// --- TRẮC NGHIỆM & ĐỘ KIẾP LOGIC ---
function checkQuizAnswer(btn, selected, correct) {
    document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
    const currentCard = practiceCards[currentCardIndex];
    const isCorrect = (selected === correct);
    
    if (isCorrect) {
        btn.classList.remove('border-border', 'hover:border-primary');
        btn.classList.add('border-green-500', 'bg-green-500/10');
        const badge = btn.querySelector('span');
        if (badge) {
            badge.classList.remove('bg-white/5', 'border-gray-600', 'text-gray-400');
            badge.classList.add('bg-green-500', 'border-green-500', 'text-black');
            badge.innerText = '✓';
        }
        
        const feedback = document.getElementById('feedback-text');
        feedback.innerText = "Chính xác!";
        feedback.className = "font-bold text-sm text-green-400";
        
        if (isTribulation) {
            tribulationScore++;
        } else {
            handleCorrectSRS(currentCard);
        }
        
        setTimeout(() => {
            nextFlashcard();
        }, 1000);
    } else {
        btn.classList.remove('border-border', 'hover:border-primary');
        btn.classList.add('border-red-500', 'bg-red-500/10');
        const badge = btn.querySelector('span');
        if (badge) {
            badge.classList.remove('bg-white/5', 'border-gray-600', 'text-gray-400');
            badge.classList.add('bg-red-500', 'border-red-500', 'text-white');
            badge.innerText = '✗';
        }
        
        document.querySelectorAll('.quiz-opt-btn').forEach(b => {
            const optText = b.querySelector('.truncate').innerText;
            if (optText === correct) {
                b.classList.add('border-green-500', 'bg-green-500/5');
            }
        });
        
        const feedback = document.getElementById('feedback-text');
        feedback.innerText = `Chưa đúng! Đáp án đúng: ${correct}`;
        feedback.className = "font-bold text-sm text-red-400";
        
        if (!isTribulation) {
            handleWrongSRS(currentCard);
        }
        
        const btnNext = document.getElementById('btn-next-flashcard');
        if (btnNext) btnNext.classList.remove('hidden');
    }
}

function checkTribulationEligibility() {
    const allItems = [...toeicData.vocal, ...toeicData.grammar];
    const lvl4Items = allItems.filter(item => item.srs_level === 4);
    const banner = document.getElementById('tribulation-banner');
    const countSpan = document.getElementById('tribulation-count');
    
    if (banner && countSpan) {
        if (lvl4Items.length >= 10) {
            countSpan.innerText = lvl4Items.length;
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }
}

function startTribulation() {
    const allItems = [...toeicData.vocal, ...toeicData.grammar];
    let lvl4Items = allItems.filter(item => item.srs_level === 4);
    
    for (let i = lvl4Items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lvl4Items[i], lvl4Items[j]] = [lvl4Items[j], lvl4Items[i]];
    }
    
    practiceCards = lvl4Items.slice(0, 20);
    currentCardIndex = 0;
    
    practiceMode = true;
    isTribulation = true;
    quizMode = true;
    typingMode = false;
    reverseMode = false;
    tribulationScore = 0;
    
    const btnToggle = document.getElementById('btn-toggle-practice');
    const tabs = document.getElementById('toeic-tabs');
    const grid = document.getElementById('toeic-grid');
    const filters = document.getElementById('toeic-filters');
    const practiceContainer = document.getElementById('toeic-practice-container');
    const banner = document.getElementById('tribulation-banner');
    
    if (btnToggle) {
        btnToggle.innerHTML = "<span>📋 Quản lý List</span>";
        btnToggle.classList.replace('bg-spotify', 'bg-gray-600');
        btnToggle.classList.replace('text-black', 'text-white');
    }
    tabs?.classList.add('hidden');
    grid?.classList.add('hidden');
    filters?.classList.add('hidden');
    banner?.classList.add('hidden');
    document.getElementById('toeic-dashboard')?.classList.add('hidden');
    practiceContainer?.classList.remove('hidden');
    
    const titleEl = document.getElementById('practice-header-title');
    if (titleEl) {
        titleEl.innerText = "⚡ TÂM MA KIẾP: ĐỘ KIẾP ĐẠI VIÊN MÃN ⚡";
    }
    
    renderFlashcard();
}

function finishTribulation() {
    const requiredScore = Math.ceil(practiceCards.length * 0.8);
    const passed = tribulationScore >= requiredScore;
    const wrapper = document.getElementById('flashcard-wrapper');
    if (!wrapper) return;
    
    if (passed) {
        wrapper.innerHTML = `
            <div class="text-center py-10 px-6 max-w-md mx-auto flex flex-col items-center gap-6 animate-[fadeIn_0.5s]">
                <div class="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 text-5xl animate-bounce">
                    ✨
                </div>
                <div>
                    <h3 class="text-3xl font-bold text-green-400 mb-2">ĐỘ KIẾP THÀNH CÔNG!</h3>
                    <p class="text-gray-200 text-sm leading-relaxed">Chúc mừng đạo hữu đã vượt qua Tâm Ma, thành công thăng cấp <span class="font-bold text-spotify">\${practiceCards.length} bí kíp</span> lên cảnh giới <span class="font-bold text-spotify">Xuất Thần Nhập Hóa</span>! Nhận thêm <span class="font-bold text-amber-400">+100 Tu vi</span>!</p>
                </div>
                <button onclick="exitTribulation(true)" class="w-full bg-gradient-to-r from-green-500 to-spotify text-black font-bold py-3.5 px-6 rounded-2xl hover:brightness-110 transition-all shadow-lg text-sm">
                    Thu nhận công đức & Quay lại
                </button>
            </div>
        `;
    } else {
        wrapper.innerHTML = `
            <div class="text-center py-10 px-6 max-w-md mx-auto flex flex-col items-center gap-6 animate-[fadeIn_0.5s]">
                <div class="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 text-5xl animate-pulse">
                    💀
                </div>
                <div>
                    <h3 class="text-3xl font-bold text-red-500 mb-2">ĐỘ KIẾP THẤT BẠI!</h3>
                    <p class="text-gray-200 text-sm leading-relaxed">Tâm ma bùng phát quấy nhiễu thần trí! Đạo hữu chỉ trả lời đúng <span class="font-bold text-red-400">\${tribulationScore}/\${practiceCards.length} câu</span> (cần tối thiểu \${requiredScore}). Toàn bộ bí kíp bị rớt về cảnh giới <span class="font-bold text-amber-500">Viên Mãn</span>!</p>
                </div>
                <button onclick="exitTribulation(false)" class="w-full bg-red-600 text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-red-700 transition-all shadow-lg text-sm">
                    Ổn định tâm thần & Quay lại
                </button>
            </div>
        `;
    }
}

async function exitTribulation(passed) {
    if (passed) {
        for (const item of practiceCards) {
            item.srs_level = 5;
            item.status = 'mastered';
            item.next_review = new Date(Date.now() + SRS_INTERVALS[5] * 60 * 1000).toISOString();
            await eel.update_toeic_item(currentTab, item)();
        }
        await eel.add_xp(100, "tribulation")();
        showToast("Thăng hoa bí kíp thành công!", "success");
    } else {
        for (const item of practiceCards) {
            item.srs_level = 3;
            item.status = 'learning';
            item.next_review = new Date(Date.now() + SRS_INTERVALS[3] * 60 * 1000).toISOString();
            await eel.update_toeic_item(currentTab, item)();
        }
        showToast("Độ kiếp thất bại, bí kíp bị giáng cấp!", "error");
    }
    
    isTribulation = false;
    quizMode = false;
    practiceMode = false;
    
    const btnToggle = document.getElementById('btn-toggle-practice');
    if (btnToggle) {
        btnToggle.innerHTML = "<span>🎮 Luyện tập</span>";
        btnToggle.classList.replace('bg-gray-600', 'bg-spotify');
        btnToggle.classList.replace('text-white', 'text-black');
    }
    
    document.getElementById('toeic-practice-container')?.classList.add('hidden');
    document.getElementById('toeic-dashboard')?.classList.remove('hidden');
    
    await loadToeicData();
}

// --- XỬ LÝ MODAL THÊM MỚI ---

function openToeicModal() {
    document.getElementById('toeic-modal').classList.remove('hidden');
}

function closeToeicModal() {
    document.getElementById('toeic-modal').classList.add('hidden');
    // Reset form
    document.getElementById('modal-word').value = '';
    document.getElementById('modal-meaning').value = '';
    document.getElementById('modal-pos').value = '';
    document.getElementById('modal-phonetic').value = '';
    document.getElementById('modal-level').value = 'B1';
    document.getElementById('modal-topic').value = '';
    document.getElementById('modal-audio').value = '';
    document.getElementById('modal-def-en').value = '';
    document.getElementById('modal-def-vn').value = '';
    document.getElementById('modal-example').value = '';
}

async function saveNewItem() {
    const word = document.getElementById('modal-word').value.trim();
    const meaning = document.getElementById('modal-meaning').value.trim();
    const pos = document.getElementById('modal-pos').value.trim();
    const phonetic = document.getElementById('modal-phonetic').value.trim();
    const level = document.getElementById('modal-level').value;
    const topic = document.getElementById('modal-topic').value.trim() || 'General';
    const audio = document.getElementById('modal-audio').value.trim();
    const defEn = document.getElementById('modal-def-en').value.trim();
    const defVn = document.getElementById('modal-def-vn').value.trim();
    const example = document.getElementById('modal-example').value.trim();

    if (!word || !meaning) {
        showToast("Vui lòng điền đầy đủ Từ vựng và Nghĩa tiếng Việt!", "warning");
        return;
    }

    const newItem = {
        word: word,
        meaning_vn: meaning,
        partOfSpeech: pos,
        phonetic: phonetic,
        level: level,
        topic: topic,
        audio_url: audio,
        definition_en: defEn,
        definition_vn: defVn,
        example: example
    };

    const btn = document.getElementById('btn-save-toeic');
    btn.innerText = "Đang lưu...";

    // Gọi API lưu vào JSON
    let response = await eel.save_toeic_item('vocal', newItem)();
    
    if (response.status === 'success') {
        closeToeicModal();
        await loadToeicData(); // Tải lại dữ liệu mới nhất
        showToast("Đã lưu thành công!", "success");
    } else {
        showToast("Lỗi: " + response.msg, "error");
    }
    
    btn.innerText = "Lưu vào kho";
}

// --- IMPORT DỮ LIỆU ---
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const dataArr = JSON.parse(e.target.result);
            if (!Array.isArray(dataArr) || dataArr.length === 0) {
                showToast("File JSON không hợp lệ (Không phải cấu trúc Array)!", "error");
                return;
            }
            
            // Validate data shape softly
            if (dataArr[0].word === undefined || dataArr[0].meaning_vn === undefined) {
                showToast("Cấu trúc File không khớp quy chuẩn của App!", "error");
                return;
            }

            // Push to backend
            let response = await eel.import_toeic_data(currentTab, dataArr)();
            if (response.status === 'success') {
                showToast(response.msg, "success");
                await loadToeicData();
            } else {
                showToast(response.msg, "error");
            }
        } catch (err) {
            showToast("Đã lỗi giải mã cấu trúc file Json!", "error");
            console.error(err);
        }
        
        // Reset file input to allow selecting the same file again
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// --- AI GENERATION ---
async function generateWithAI() {
    const input = document.getElementById('ai-word-input');
    const word = input.value.trim();
    if (!word) {
        showToast("Vui lòng nhập từ vựng!", "warning");
        return;
    }

    const btn = document.getElementById('btn-ai-gen');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="text-xs font-bold animate-pulse">Đang Gen...</span>';
    btn.disabled = true;

    try {
        const response = await eel.generate_toeic_ai(word)();
        if (response.status === 'success') {
            const questions = response.data;
            let successCount = 0;

            for (const item of questions) {
                // Tự động lưu từng câu vào kho Vocal
                const saveRes = await eel.save_toeic_item('vocal', item)();
                if (saveRes.status === 'success') successCount++;
            }

            input.value = '';
            showToast(`Đã tự động tạo và lưu ${successCount} câu hỏi thành công!`, "success");
            await loadToeicData(); // Reload list
        } else {
            showToast(response.msg, "error");
        }
    } catch (err) {
        showToast("Lỗi kết nối AI: " + err, "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

function playVocabAudio(url) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(err => {
        console.error("Lỗi phát âm thanh:", err);
    });
}

function highlightWord(sentence, word) {
    if (!sentence || !word) return sentence;
    const regex = new RegExp(`\\b(${word}s?|${word.slice(0, -1)}[a-zA-Z]*)\\b`, 'gi');
    return sentence.replace(regex, `<span class="text-primary font-bold font-mono">$1</span>`);
}

function blankOutWord(sentence, word) {
    if (!sentence || !word) return sentence;
    const regex = new RegExp(`\\b(${word}s?|${word.slice(0, -1)}[a-zA-Z]*)\\b`, 'gi');
    return sentence.replace(regex, `<span class="text-primary font-black font-mono tracking-wider px-2 border-b-2 border-dashed border-primary">_______</span>`);
}