let remainingSeconds = 1500;
let currentPreset = '25_5';
let currentMode = 'focus'; // 'focus' hoặc 'break'
let isRunning = false;
let autoFlow = true;
let activeTaskId = null;
let stats = {
    total_minutes: 0,
    streak: 0,
    daily_history: {},
    last_date: ""
};

// --- EEL CALLBACKS FOR BACKGROUND SYNC ---
eel.expose(sync_focus_timer);
function sync_focus_timer(seconds) {
    if (!document.getElementById('timer-display')) return;

    if (!isRunning) {
        isRunning = true;
        document.getElementById('play-icon')?.classList.add('hidden');
        document.getElementById('pause-icon')?.classList.remove('hidden');
    }
    remainingSeconds = seconds;
    updateTimerDisplay();

    // Random Event Check
    if (currentMode === 'focus' && isRunning) {
        if (scheduledEventTime === null) {
            scheduleRandomEvent();
        } else if (scheduledEventTime > 0 && remainingSeconds === scheduledEventTime && !eventActive) {
            triggerRandomEvent();
        }
    } else {
        scheduledEventTime = null;
    }
}

eel.expose(on_focus_session_end);
function on_focus_session_end(backendState) {
    const prevMode = currentMode;

    remainingSeconds = backendState.remaining_seconds;
    currentPreset = backendState.preset;
    currentMode = backendState.mode;
    isRunning = backendState.is_running;
    autoFlow = backendState.auto_flow !== undefined ? backendState.auto_flow : true;
    activeTaskId = backendState.active_task_id;

    const modeSelect = document.getElementById('timer-mode-select');
    if (modeSelect) modeSelect.value = currentPreset;

    const autoFlowToggle = document.getElementById('auto-flow-toggle');
    if (autoFlowToggle) autoFlowToggle.checked = autoFlow;
    updateAutoFlowStatusUI();

    updateTimerDisplay();
    handleSessionEnd(true, prevMode);
}

const PRESETS = {
    '25_5': { focus: 1500, break: 300, label_focus: 'Đang tu luyện', label_break: 'Tiểu hồi khí', color_focus: 'text-primary', color_break: 'text-spotify' },
    '50_10': { focus: 3000, break: 600, label_focus: 'Tập trung sâu', label_break: 'Đại hồi khí', color_focus: 'text-primary', color_break: 'text-spotify' },
    '50_5': { focus: 3000, break: 300, label_focus: 'Hiệu suất cao', label_break: 'Tiểu hồi khí', color_focus: 'text-primary', color_break: 'text-spotify' },
    '15_3': { focus: 900, break: 180, label_focus: 'Tập trung ngắn', label_break: 'Hồi khí ngắn', color_focus: 'text-primary', color_break: 'text-spotify' }
};

async function initFocus() {
    console.log("Pomodoro initialized");

    const data = await eel.get_focus_data()();
    stats = data.stats;

    const savedState = data.state;
    remainingSeconds = savedState.remaining_seconds;
    currentPreset = savedState.preset || '25_5';
    currentMode = savedState.mode || 'focus';
    activeTaskId = savedState.active_task_id;
    isRunning = savedState.is_running;
    autoFlow = savedState.auto_flow !== undefined ? savedState.auto_flow : true;

    const modeSelect = document.getElementById('timer-mode-select');
    if (modeSelect) modeSelect.value = currentPreset;

    const autoFlowToggle = document.getElementById('auto-flow-toggle');
    if (autoFlowToggle) autoFlowToggle.checked = autoFlow;
    updateAutoFlowStatusUI();

    updateTimerDisplay();
    updateStatsUI();

    if (isRunning) {
        document.getElementById('play-icon')?.classList.add('hidden');
        document.getElementById('pause-icon')?.classList.remove('hidden');
    }

    await loadTodoListTasks();
    const taskSelect = document.getElementById('focus-task-select');
    if (taskSelect) {
        taskSelect.addEventListener('focus', loadTodoListTasks);
        taskSelect.addEventListener('mousedown', loadTodoListTasks);
    }
    renderFocusChart();
    await checkAndToggleAmbientImportSection();

    setInterval(saveFocusState, 10000);
}

async function loadTodoListTasks() {
    const select = document.getElementById('focus-task-select');
    if (!select) return;

    try {
        const todos = await eel.get_todo_data()();
        console.log("Fetched todos for Pomodoro:", todos.length);

        // Clear and add default
        select.innerHTML = '<option value="">-- Không có nhiệm vụ nào được chọn --</option>';

        // Filter only active tasks
        const activeTasks = todos.filter(t => !t.completed);

        activeTasks.forEach(task => {
            const opt = document.createElement('option');
            opt.value = task.id;
            opt.innerText = task.text;
            if (String(task.id) === String(activeTaskId)) opt.selected = true;
            select.appendChild(opt);
        });

    } catch (e) {
        console.error("Lỗi tải TodoList cho Focus:", e);
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const label = document.getElementById('timer-label');
    const progress = document.getElementById('timer-progress');

    if (!display || !label || !progress) return;

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    display.innerText = timeStr;

    const presetObj = PRESETS[currentPreset];
    const labelStr = currentMode === 'focus' ? presetObj.label_focus : presetObj.label_break;
    label.innerText = labelStr;

    const colorClass = currentMode === 'focus' ? presetObj.color_focus : presetObj.color_break;
    progress.classList.remove('text-primary', 'text-spotify');
    progress.classList.add(colorClass);

    const total = presetObj[currentMode];
    const offset = 816 - (remainingSeconds / total) * 816;
    progress.style.strokeDashoffset = offset;

    document.title = isRunning ? `(${timeStr}) Frogress` : "Frogress";
}

function toggleFocusTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (isRunning) return;

    if (remainingSeconds <= 0) {
        currentMode = (currentMode === 'focus') ? 'break' : 'focus';
        remainingSeconds = PRESETS[currentPreset][currentMode];
        updateTimerDisplay();
        saveFocusState();
    }

    isRunning = true;

    document.getElementById('play-icon').classList.add('hidden');
    document.getElementById('pause-icon').classList.remove('hidden');

    eel.focus_start_timer();
    saveFocusState();
}

function pauseTimer() {
    isRunning = false;
    document.getElementById('play-icon').classList.remove('hidden');
    document.getElementById('pause-icon').classList.add('hidden');

    eel.focus_pause_timer();
    saveFocusState();
}

function resetFocusTimer() {
    pauseTimer();
    remainingSeconds = PRESETS[currentPreset][currentMode];
    updateTimerDisplay();

    eel.focus_reset_timer();
    saveFocusState();
}

function changeFocusPreset(preset) {
    pauseTimer();
    currentPreset = preset;
    currentMode = 'focus';
    remainingSeconds = PRESETS[currentPreset].focus;
    updateTimerDisplay();
    saveFocusState();
}

async function handleSessionEnd(fromBackend = false, backendPrevMode = null) {
    if (!fromBackend) {
        pauseTimer();
    } else {
        // Đồng bộ UI nút bấm dựa theo biến isRunning từ Backend
        if (!isRunning) {
            document.getElementById('play-icon')?.classList.remove('hidden');
            document.getElementById('pause-icon')?.classList.add('hidden');
        } else {
            document.getElementById('play-icon')?.classList.add('hidden');
            document.getElementById('pause-icon')?.classList.remove('hidden');
        }
    }

    const prevMode = backendPrevMode || currentMode;

    // Cộng điểm và Stats
    if (fromBackend && prevMode === 'focus') {
        // Tải lại stats từ backend
        eel.get_focus_data()().then(data => {
            stats = data.stats;
            updateStatsUI();
            if (document.getElementById('focus-chart')) renderFocusChart();
        });

        // Hiển thị Toast thông báo (XP đã được Python cộng ngầm)
        showToast(`+15 Tu vi! Đạo hạnh của đạo hữu đã tinh tấn thêm một bậc!`, "success");

        // Kiểm tra xem có đang chọn nhiệm vụ nào không
        const taskSelect = document.getElementById('focus-task-select');
        if (taskSelect) {
            activeTaskId = taskSelect.value;
        }

        // Chỉ hiện Modal hoàn thành nếu đang ở trang Focus và có Task ID
        if (activeTaskId && document.getElementById('focus-modal')) {
            showFocusModal();
        }
    }
}

function updateStats(minsToAdd) {
    const today = new Date().toISOString().split('T')[0];

    stats.total_minutes += minsToAdd;

    if (!stats.daily_history[today]) {
        stats.daily_history[today] = 0;
    }
    stats.daily_history[today] += minsToAdd;

    // Streak logic
    if (stats.last_date !== today) {
        const lastDate = new Date(stats.last_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (stats.last_date === yesterday.toISOString().split('T')[0]) {
            stats.streak += 1;
        } else if (!stats.last_date) {
            stats.streak = 1;
        } else {
            stats.streak = 1; // Reset if broke streak
        }
        stats.last_date = today;
    }

    updateStatsUI();
    saveFocusStats();
    renderFocusChart();
}

function updateStatsUI() {
    const streakEl = document.getElementById('focus-streak');
    const totalEl = document.getElementById('focus-total-mins');
    if (streakEl) streakEl.innerText = stats.streak || 0;
    if (totalEl) totalEl.innerText = stats.total_minutes || 0;
}

async function saveFocusStats() {
    await eel.save_focus_stats(stats)();
}

async function saveFocusState() {
    const taskSelect = document.getElementById('focus-task-select');
    const finalTaskId = taskSelect ? taskSelect.value : activeTaskId;

    const state = {
        remaining_seconds: remainingSeconds,
        preset: currentPreset,
        mode: currentMode,
        auto_flow: autoFlow,
        active_task_id: finalTaskId,
        timestamp: new Date().toISOString()
    };
    await eel.save_focus_state(state)();
}

function toggleAutoFlow(val) {
    autoFlow = val;
    updateAutoFlowStatusUI();
    saveFocusState();
}

function updateAutoFlowStatusUI() {
    const status = document.getElementById('auto-flow-status');
    if (status) {
        status.innerText = autoFlow ? "Đang bật" : "Đang tắt";
        status.classList.remove('text-spotify', 'text-gray-500');
        status.classList.add(autoFlow ? 'text-spotify' : 'text-gray-500');
    }
}

function showFocusModal() {
    document.getElementById('focus-modal').classList.remove('hidden');
}

async function handleTaskAction(complete) {
    document.getElementById('focus-modal').classList.add('hidden');

    if (complete && activeTaskId) {
        try {
            const todos = await eel.get_todo_data()();
            const task = todos.find(t => String(t.id) === String(activeTaskId));
            if (task) {
                task.completed = true;
                await eel.save_todo_data(todos)();

                // Tính toán deadline cho task (nếu có)
                let diffDays = 0;
                if (task.deadline) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dlDate = new Date(task.deadline);
                    dlDate.setHours(0, 0, 0, 0);
                    diffDays = Math.max(0, Math.ceil((dlDate - today) / (1000 * 60 * 60 * 24)));
                }

                // Nhận Tu vi khi xong task từ modal Focus
                eel.add_todo_xp(diffDays)().then(user => {
                    if (user) showToast(`Hoàn thành Todo! Chú ếch đang tiến hóa...`, "success");
                });

                showToast("Đã đánh dấu hoàn thành nhiệm vụ!", "success");
                loadTodoListTasks(); // Refresh list
            }
        } catch (e) {
            console.error("Lỗi cập nhật Task từ Focus:", e);
        }
    }
}

function skipSession() {
    pauseTimer();
    currentMode = (currentMode === 'focus') ? 'break' : 'focus';
    remainingSeconds = PRESETS[currentPreset][currentMode];

    updateTimerDisplay();
    saveFocusState();

    eel.trigger_focus_notification("Pomodoro", "Đã bỏ qua Pomodoro hiện tại.");

    if (autoFlow) {
        startTimer();
    }
}

function renderFocusChart() {
    const container = document.getElementById('focus-chart');
    if (!container) return;

    container.innerHTML = '';

    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    const maxMins = Math.max(...days.map(d => stats.daily_history[d] || 0), 60);

    days.forEach(day => {
        const mins = stats.daily_history[day] || 0;
        const heightPercent = (mins / maxMins) * 100;
        const dayLabel = new Date(day).toLocaleDateString('vi-VN', { weekday: 'short' });

        const barWrapper = document.createElement('div');
        barWrapper.className = 'flex-1 flex flex-col items-center gap-2 group h-full justify-end relative';

        const tooltip = document.createElement('div');
        tooltip.className = 'absolute -top-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none';
        tooltip.innerText = `${mins} phút`;

        const barContainer = document.createElement('div');
        barContainer.className = 'w-full bg-white/5 rounded-t-lg relative flex items-end overflow-hidden h-full max-w-[30px] mx-auto';

        const bar = document.createElement('div');
        bar.className = 'w-full bg-primary/40 group-hover:bg-primary transition-all duration-500 rounded-t-sm';
        bar.style.height = `${Math.max(heightPercent, 2)}%`;

        const label = document.createElement('span');
        label.className = 'text-[10px] text-gray-500 font-bold uppercase';
        label.innerText = dayLabel;

        barContainer.appendChild(bar);
        barWrapper.appendChild(tooltip);
        barWrapper.appendChild(barContainer);
        barWrapper.appendChild(label);
        container.appendChild(barWrapper);
    });
}

// --- HỆ THỐNG KỲ NGỘ & TÂM MA (RANDOM EVENTS) & ÂM THANH BẾ QUAN ---
let scheduledEventTime = null;
let scheduledEventType = null;
let eventActive = false;
let tamMaTimer = null;
let tamMaSecondsLeft = 30;
let currentChant = "";

function scheduleRandomEvent() {
    if (currentMode !== 'focus' || !isRunning) {
        scheduledEventTime = null;
        scheduledEventType = null;
        return;
    }

    // 40% cơ hội xuất hiện Kỳ Ngộ / Tâm Ma mỗi phiên
    if (Math.random() < 0.1) {
        const presetObj = PRESETS[currentPreset];
        const totalSecs = presetObj.focus;
        const minSec = Math.floor(totalSecs * 0.15);
        const maxSec = Math.floor(totalSecs * 0.85);
        scheduledEventTime = minSec + Math.floor(Math.random() * (maxSec - minSec));
        scheduledEventType = Math.random() < 0.5 ? 'ki_ngo' : 'tam_ma';
        console.log(`[Random Event] Scheduled ${scheduledEventType} at ${scheduledEventTime}s remaining`);
    } else {
        scheduledEventTime = -1; // Đã kiểm tra xong phiên này
        console.log("[Random Event] No event scheduled for this session");
    }
}

function triggerRandomEvent() {
    eventActive = true;
    const modal = document.getElementById('random-event-modal');
    const content = document.getElementById('random-event-content');
    if (!modal || !content) return;

    if (scheduledEventType === 'ki_ngo') {
        content.innerHTML = `
            <div class="absolute -inset-10 bg-gradient-to-tr from-green-500/10 to-emerald-500/10 blur-2xl pointer-events-none rounded-full"></div>
            <div class="relative z-10">
                <div class="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce">
                    💎
                </div>
                <h3 class="text-2xl font-bold text-green-400 mb-2">🍀 KỲ NGỘ THIÊN ĐỊA! 🍀</h3>
                <p class="text-xs uppercase tracking-wider text-gray-500 mb-4 font-semibold">Cơ Duyên Xảo Hợp • Linh Khí Tràn Đầy</p>
                <p class="text-gray-200 text-sm leading-relaxed mb-6">
                    Trong lúc bế quan tu luyện, đạo hữu đột nhiên phát hiện một viên linh thạch thượng phẩm chứa đầy linh khí trời đất nằm trong góc động phủ!
                </p>
                <button onclick="resolveKiNgo()" class="w-full bg-gradient-to-r from-green-500 to-spotify text-black font-extrabold py-3.5 px-6 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all text-sm uppercase tracking-wider shadow-lg">
                    Thu nhận linh khí (+5 Tu vi)
                </button>
            </div>
        `;
    } else {
        const chants = [
            "Tâm tĩnh như thủy, vạn vật giai không",
            "Băng thanh ngọc khiết, thần trí vô song",
            "Vạn pháp quy tông, duy ngã độc tôn",
            "Tự tại phiêu diêu, phá tan tâm ma"
        ];
        currentChant = chants[Math.floor(Math.random() * chants.length)];
        tamMaSecondsLeft = 30;

        content.innerHTML = `
            <div class="absolute -inset-10 bg-gradient-to-tr from-red-600/10 to-orange-600/10 blur-2xl pointer-events-none rounded-full"></div>
            <div class="relative z-10 flex flex-col items-center">
                <div class="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-4xl mb-5 animate-pulse text-red-500 border border-red-500/20">
                    💀
                </div>
                <h3 class="text-2xl font-black text-red-500 mb-1">🔥 TÂM MA PHÁT TÁC! 🔥</h3>
                <p class="text-[10px] uppercase tracking-widest text-red-400/70 font-bold mb-4">Linh Hồn Rung Động • Huyết Khí Nghịch Lưu</p>
                
                <p class="text-gray-300 text-xs leading-relaxed mb-4 text-center">
                    Tâm ma đột nhiên xé rách thức hải, dấy lên ảo ảnh quấy nhiễu chân khí! Mau chóng trì tụng tịnh tâm chú để trấn áp tâm ma:
                </p>
                
                <div class="bg-red-500/5 border border-red-500/20 rounded-2xl py-3 px-5 mb-4 text-center w-full shadow-inner select-none">
                    <span class="text-sm font-black text-red-300 tracking-wide font-mono select-none">${currentChant}</span>
                </div>
                
                <input type="text" id="tam-ma-input" placeholder="Nhập chính xác tịnh tâm chú..." autocomplete="off"
                    class="w-full bg-dark border-2 border-red-500/30 focus:border-red-500 p-3.5 rounded-xl text-sm font-bold text-gray-100 outline-none text-center mb-4 transition-all">
                
                <div class="text-xs font-bold text-red-400 mb-6 flex items-center gap-1.5">
                    ⏱️ Thời gian: <span id="tam-ma-timer-display" class="text-sm text-white bg-red-600/40 px-2 py-0.5 rounded font-mono font-black">${tamMaSecondsLeft}s</span>
                </div>
                
                <button onclick="resolveTamMa()" class="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-extrabold py-3.5 px-6 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all text-sm uppercase tracking-wider shadow-lg">
                    Ổn định tâm thần
                </button>
            </div>
        `;

        tamMaTimer = setInterval(() => {
            tamMaSecondsLeft--;
            const timeDisp = document.getElementById('tam-ma-timer-display');
            if (timeDisp) timeDisp.innerText = `${tamMaSecondsLeft}s`;

            if (tamMaSecondsLeft <= 0) {
                clearInterval(tamMaTimer);
                failTamMa();
            }
        }, 1000);

        setTimeout(() => {
            document.getElementById('tam-ma-input')?.focus();
        }, 150);
    }

    modal.classList.remove('hidden');
}

async function resolveKiNgo() {
    eventActive = false;
    scheduledEventTime = null;
    const modal = document.getElementById('random-event-modal');
    if (modal) modal.classList.add('hidden');

    const stats = await eel.add_xp(5, "ki_ngo")();
    showToast("Kỳ ngộ hoàn tất! Đạo hữu tích lũy +5 Tu vi.", "success");
    window.checkBreakthrough(stats);
}

async function resolveTamMa() {
    const input = document.getElementById('tam-ma-input');
    if (!input) return;

    if (input.value.trim() === currentChant) {
        clearInterval(tamMaTimer);
        eventActive = false;
        scheduledEventTime = null;
        const modal = document.getElementById('random-event-modal');
        if (modal) modal.classList.add('hidden');

        const stats = await eel.add_xp(5, "tam_ma_win")();
        showToast("Ổn định tâm thần thành công! Tiêu diệt tâm ma nhận +5 Tu vi.", "success");
        window.checkBreakthrough(stats);
    } else {
        showToast("Tịnh tâm chú trì tụng không chính xác! Hãy cẩn thận!", "error");
        input.classList.add('animate-shake');
        setTimeout(() => input.classList.remove('animate-shake'), 500);
    }
}

async function failTamMa() {
    clearInterval(tamMaTimer);
    eventActive = false;
    scheduledEventTime = null;
    const modal = document.getElementById('random-event-modal');
    if (modal) modal.classList.add('hidden');

    const stats = await eel.add_xp(-10, "tam_ma_fail")();
    showToast("Quá thời gian ổn định tâm tính! Tu vi bị tổn thất. (-10 Tu vi)", "error");
    window.checkBreakthrough(stats);
}

// --- AMBIENT SOUNDS ---
let currentAmbientSoundName = null;
let ambientAudio = null;
let ambientVolume = 0.5;

function toggleAmbientSound(soundName) {
    const urls = {
        rain: '/ambient/rain.mp3',
        campfire: '/ambient/campfire.mp3',
        stream: '/ambient/stream.mp3',
        wind: '/ambient/wind.mp3'
    };

    const btn = document.getElementById(`btn-sound-${soundName}`);
    if (!btn) return;

    if (currentAmbientSoundName === soundName) {
        if (ambientAudio) {
            ambientAudio.pause();
            ambientAudio = null;
        }
        currentAmbientSoundName = null;
        btn.classList.remove('border-primary', 'bg-primary/10', 'text-primary');
        btn.classList.add('border-border', 'bg-dark/40', 'text-gray-400');
        showToast("Đã tắt âm thanh bế quan.", "info");
    } else {
        if (ambientAudio) {
            ambientAudio.pause();
            const prevBtn = document.getElementById(`btn-sound-${currentAmbientSoundName}`);
            if (prevBtn) {
                prevBtn.classList.remove('border-primary', 'bg-primary/10', 'text-primary');
                prevBtn.classList.add('border-border', 'bg-dark/40', 'text-gray-400');
            }
        }

        currentAmbientSoundName = soundName;
        ambientAudio = new Audio(urls[soundName]);
        ambientAudio.loop = true;
        ambientAudio.volume = ambientVolume;
        ambientAudio.play().then(() => {
            btn.classList.remove('border-border', 'bg-dark/40', 'text-gray-400');
            btn.classList.add('border-primary', 'bg-primary/10', 'text-primary');
            showToast("Đang phát âm thanh bế quan sinh động...", "success");
        }).catch(e => {
            console.error("Lỗi phát âm thanh:", e);
            showToast(`⚠️ Không tìm thấy hoặc lỗi phát file '${soundName}.mp3'. Đạo hữu hãy chép file nhạc vào thư mục 'data/ambient/' nhé!`, "error");
            // Trả lại trạng thái cũ cho nút bấm
            btn.classList.remove('border-primary', 'bg-primary/10', 'text-primary');
            btn.classList.add('border-border', 'bg-dark/40', 'text-gray-400');
            currentAmbientSoundName = null;
            ambientAudio = null;
        });
    }
}

function changeAmbientVolume(vol) {
    ambientVolume = parseFloat(vol);
    if (ambientAudio) {
        ambientAudio.volume = ambientVolume;
    }
}

let pendingImportSoundName = null;

async function checkAndToggleAmbientImportSection() {
    try {
        const res = await eel.check_ambient_sounds_status()();
        const section = document.getElementById('ambient-import-section');
        if (!section) return;
        
        if (res && res.all_exist) {
            section.classList.add('hidden');
        } else {
            section.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Lỗi kiểm tra trạng thái âm thanh bế quan:", e);
    }
}

function triggerImportAmbientSoundDirect() {
    const select = document.getElementById('import-sound-slot');
    if (!select) return;
    
    pendingImportSoundName = select.value;
    document.getElementById('ambient-file-input').click();
}

async function handleAmbientImport(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    if (!file.name.toLowerCase().endsWith('.mp3')) {
        showToast("Hệ thống chỉ chấp nhận tệp định dạng .mp3!", "error");
        input.value = "";
        return;
    }
    
    showToast("Đang nạp tệp âm thanh bế quan vào hệ thống...", "info");
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        
        try {
            const res = await eel.import_ambient_sound(pendingImportSoundName, base64Data)();
            if (res && res.status === "success") {
                showToast(`Đã thay thế âm thanh bế quan thành công!`, "success");
                
                // Nếu đang phát âm thanh này, dừng lại và khởi động lại với tệp mới
                if (currentAmbientSoundName === pendingImportSoundName) {
                    if (ambientAudio) {
                        ambientAudio.pause();
                        ambientAudio = null;
                    }
                    toggleAmbientSound(pendingImportSoundName);
                }
                
                // Rà soát lại xem đã nạp đủ 4 file chưa, nếu đủ rồi thì ẩn luôn nút
                checkAndToggleAmbientImportSection();
            } else {
                showToast(`Lỗi nạp tệp: ${res.msg}`, "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Lỗi kết nối máy chủ Python!", "error");
        }
        
        // Reset
        input.value = "";
        pendingImportSoundName = null;
    };
    reader.readAsDataURL(file);
}
