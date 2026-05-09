let remindersData = [];
let editingReminderId = null;

async function initReminders() {
    remindersData = await eel.get_reminders_data()() || [];
    renderReminders();
}

function toggleReminderForm() {
    const form = document.getElementById("reminder-form");
    if(form) {
        form.classList.toggle("hidden");
        if(form.classList.contains("hidden")) {
            editingReminderId = null;
            document.getElementById("btn-save-rem").innerText = "Lưu tiến trình báo";
            document.getElementById("rem-title").value = "";
            document.getElementById("rem-interval").value = "";
            document.getElementById("rem-msg").value = "";
        } else {
            document.getElementById("rem-title").focus();
        }
    }
}

async function addReminder() {
    const title = document.getElementById("rem-title").value.trim();
    const interval = parseInt(document.getElementById("rem-interval").value);
    const msg = document.getElementById("rem-msg").value.trim();
    
    if (!title || !interval || isNaN(interval)) {
        showToast("Vui lòng điền đủ Tiêu đề và Thời gian lặp (phút)!", "warning");
        return;
    }

    if (editingReminderId) {
        const rem = remindersData.find(r => r.id === editingReminderId);
        if (rem) {
            rem.title = title;
            rem.message = msg;
            rem.interval_minutes = interval;
            rem.last_triggered = ""; 
            showToast("Đã cập nhật chu kỳ nhắc nhở", "success");
        }
    } else {
        const newRem = {
            id: Date.now().toString(),
            title: title,
            message: msg,
            interval_minutes: interval,
            last_triggered: "", // Để rỗng backend sẽ tự kích lại thời điểm xuất phát
            is_active: true
        };
        remindersData.unshift(newRem);
        showToast("Đã đưa chu kỳ vào luồng chạy ngầm của Hub!", "success");
    }
    
    document.getElementById("rem-title").value = "";
    document.getElementById("rem-interval").value = "";
    document.getElementById("rem-msg").value = "";
    editingReminderId = null;
    
    toggleReminderForm();
    await saveRemindersToBackend();
    renderReminders();
}

function editReminder(id) {
    const rem = remindersData.find(r => r.id === id);
    if (!rem) return;

    editingReminderId = id;
    document.getElementById("rem-title").value = rem.title;
    document.getElementById("rem-interval").value = rem.interval_minutes;
    document.getElementById("rem-msg").value = rem.message;
    
    document.getElementById("btn-save-rem").innerText = "Cập Nhật Bộ Đếm";

    const form = document.getElementById("reminder-form");
    if (form && form.classList.contains("hidden")) {
        toggleReminderForm();
    }
    document.getElementById("rem-title").focus();
}

async function toggleActiveStatus(id) {
    const rem = remindersData.find(r => r.id === id);
    if (rem) {
        rem.is_active = !rem.is_active;
        if (rem.is_active) {
            rem.last_triggered = ""; 
            showToast("Đã kích hoạt lại bộ đếm!", "success");
        } else {
            showToast("Đã Tắt chu kỳ báo.", "warning");
        }
        await saveRemindersToBackend();
        renderReminders();
    }
}

async function deleteReminder(id) {
    if (document.getElementById('delete-modal')) return;

    const modalHTML = `
        <div id="delete-modal" class="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center animate-[fadeIn_0.2s] px-4">
            <div class="bg-card w-full max-w-[350px] p-6 rounded-2xl shadow-2xl border border-border transform transition-all scale-100">
                <h3 class="text-xl font-bold mb-2 text-gray-100">Gỡ bộ nhắc nhở</h3>
                <p class="text-gray-400 text-sm mb-6 leading-relaxed">Bạn có huỷ chu kỳ nhắc tự động này không?</p>
                <div class="flex justify-end gap-3 font-medium">
                    <button id="btn-cancel-del" class="px-5 py-2.5 rounded-lg bg-dark hover:bg-gray-800 border border-border text-gray-100 transition-colors">Để mình tính lại</button>
                    <button id="btn-confirm-del" class="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors border border-red-400">Xóa luôn</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('delete-modal');
    
    return new Promise((resolve) => {
        document.getElementById('btn-cancel-del').onclick = () => {
            modal.remove();
            resolve(false);
        };
        document.getElementById('btn-confirm-del').onclick = () => {
            modal.remove();
            resolve(true);
        };
    }).then(async (confirmed) => {
        if (!confirmed) return;
        remindersData = remindersData.filter(r => r.id !== id);
        await saveRemindersToBackend();
        renderReminders();
        showToast("Đã gỡ bỏ chu kỳ thành công", "info");
    });
}

async function saveRemindersToBackend() {
    const res = await eel.save_reminders_data(remindersData)();
    if(res.status === "error") {
        showToast("Lỗi đồng bộ dữ liệu: " + res.msg, "error");
    }
}

function renderReminders() {
    const listEl = document.getElementById("reminder-list");
    const emptyEl = document.getElementById("reminder-empty");
    
    listEl.innerHTML = "";
    
    if(remindersData.length === 0) {
        emptyEl.classList.remove("hidden");
    } else {
        emptyEl.classList.add("hidden");
        
        remindersData.forEach((rem, idx) => {
            const cardEl = document.createElement("div");
            // Thay đổi style dựa trên is_active
            cardEl.className = `flex flex-col bg-card border ${rem.is_active ? 'border-primary/50 shadow-lg dark:bg-primary/5 bg-primary/10' : 'border-border shadow-sm bg-dark/70 opacity-90'} rounded-2xl p-5 md:p-6 animate-scale-up transition-all relative overflow-hidden group`;
            cardEl.style.animationDelay = `${idx * 0.04}s`;
            
            const hours = Math.floor(rem.interval_minutes / 60);
            const m = rem.interval_minutes % 60;
            let timeStr = "";
            if (hours > 0) timeStr += `${hours}h`;
            if (m > 0 || hours === 0) timeStr += `${m}m`;
            
            const toggleColor = rem.is_active ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-gray-600";
            const knobPos = rem.is_active ? "translate-x-6" : "translate-x-1";
            
            cardEl.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <h3 class="font-bold text-xl text-gray-100 truncate max-w-[75%]" title="${rem.title}">${rem.title}</h3>
                    <!-- Toggle Switch -->
                    <button onclick="toggleActiveStatus('${rem.id}')" class="relative inline-flex items-center h-6 w-11 rounded-full ${toggleColor} transition-all focus:outline-none shrink-0" title="Bật/Tắt chu kỳ">
                        <span class="inline-block w-4 h-4 transform ${knobPos} bg-white rounded-full transition-transform"></span>
                    </button>
                </div>
                
                <p class="text-sm text-gray-400 mb-5 leading-relaxed flex-1 line-clamp-3">${rem.message}</p>
                
                <div class="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-dark border border-border rounded-lg text-xs font-bold text-gray-500 dark:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Lặp Mỗi <span class="text-primary">${timeStr}</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="editReminder('${rem.id}')" class="text-gray-500 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all" title="Chỉnh sửa">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="deleteReminder('${rem.id}')" class="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all" title="Xóa chu kỳ">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
            listEl.appendChild(cardEl);
        });
    }
}
