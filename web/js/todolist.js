let todosData = [];
let currentFilter = "Tất cả";
let editingTodoId = null; // Quản lý trạng thái sửa
let viewMode = "list"; // list hoặc calendar
let currentCalendarDate = new Date();
let currentSelectedDate = null; // Ngày đang được chọn để xem chi tiết

async function initTodoList() {
    // Reset bộ lọc về "Tất cả" mỗi khi vào lại tab để tránh lệch state
    currentFilter = "Tất cả";
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.classList.remove('active', 'bg-primary', 'text-white', 'shadow-md', 'shadow-blue-500/20');
            btn.classList.add('text-gray-400', 'hover:text-gray-100', 'hover:bg-dark');
            if (btn.innerText === "Tất cả") {
                btn.classList.add('active', 'bg-primary', 'text-white', 'shadow-md', 'shadow-blue-500/20');
                btn.classList.remove('text-gray-400', 'hover:text-gray-100', 'hover:bg-dark');
            }
        });
    }

    // Gọi API từ Python để lấy data
    const data = await eel.get_todo_data()();
    todosData = data || [];
    
    // Khởi tạo ngày cho lịch nếu chưa có
    currentCalendarDate = new Date();
    
    renderTodos();
}

function switchView(mode) {
    viewMode = mode;
    const listContainer = document.getElementById("todo-list");
    const calendarContainer = document.getElementById("calendar-view");
    const filtersContainer = document.getElementById("todo-filters");
    const btnList = document.getElementById("btn-view-list");
    const btnCalendar = document.getElementById("btn-view-calendar");

    if (mode === "calendar") {
        listContainer.classList.add("hidden");
        calendarContainer.classList.remove("hidden");
        filtersContainer.classList.add("hidden"); // Lịch thì ko dùng filter tab này
        
        btnCalendar.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-primary text-white shadow-sm";
        btnList.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white";
    } else {
        listContainer.classList.remove("hidden");
        calendarContainer.classList.add("hidden");
        filtersContainer.classList.remove("hidden");
        
        btnList.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all bg-primary text-white shadow-sm";
        btnCalendar.className = "px-3 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white";
    }
    renderTodos();
}

function getCategoryColor(category) {
    switch (category) {
        // Học tập - Vàng Neon Classic
        case "Học tập": return {
            card: "bg-gradient-to-br from-[#FFFF88] to-[#FCF46C] border-[#000000]/20 shadow-yellow-500/10",
            text: "text-[#4A4000]",
            sub: "text-[#7D6B00]"
        };

        // Công việc - Xanh Da Trời
        case "Công việc": return {
            card: "bg-gradient-to-br from-[#CCFFFF] to-[#AEEEEE] border-[#000000]/20 shadow-blue-500/10",
            text: "text-[#003C3C]",
            sub: "text-[#005B5B]"
        };

        // Cá nhân - Xanh Bạc Hà (Mint)
        case "Cá nhân": return {
            card: "bg-gradient-to-br from-[#C2FFC2] to-[#A0FFA0] border-[#000000]/20 shadow-green-500/10",
            text: "text-[#0A260A]",
            sub: "text-[#1B4D1B]"
        };

        // Khác - Hồng Phấn / Tím Rose
        default: return {
            card: "bg-gradient-to-br from-[#FFD1FF] to-[#FBB0FB] border-[#000000]/20 shadow-purple-500/10",
            text: "text-[#2B0A2B]",
            sub: "text-[#5D1B5D]"
        };
    }
}

function getRankBadge(rank) {
    switch (rank) {
        case "C":
            return `<span class="text-[9px] font-extrabold uppercase tracking-widest border border-slate-500/20 px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500">Ngoại Môn</span>`;
        case "A":
            return `<span class="text-[9px] font-extrabold uppercase tracking-widest border border-purple-500/30 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600">Truyền Thừa</span>`;
        case "S":
            return `<span class="text-[9px] font-extrabold uppercase tracking-widest border border-red-500/40 px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 animate-pulse">⚔️ Diệt Ma</span>`;
        case "B":
        default:
            return `<span class="text-[9px] font-extrabold uppercase tracking-widest border border-blue-500/30 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600">Nội Môn</span>`;
    }
}

function triggerBossMissionCompleteEffect() {
    const body = document.body;
    body.classList.add('animate-[shake_0.5s_infinite]');
    setTimeout(() => body.classList.remove('animate-[shake_0.5s_infinite]'), 1000);
    
    const numParticles = 40;
    for (let i = 0; i < numParticles; i++) {
        const p = document.createElement('div');
        p.className = 'fixed pointer-events-none rounded-full z-[9999]';
        p.style.width = `${Math.random() * 12 + 6}px`;
        p.style.height = p.style.width;
        p.style.backgroundColor = Math.random() > 0.5 ? '#ef4444' : '#eab308'; // Red or gold
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.boxShadow = `0 0 10px ${p.style.backgroundColor}`;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 250 + 100;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;
        
        body.appendChild(p);
        
        p.animate([
            { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 600,
            easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
            fill: 'forwards'
        });
        
        setTimeout(() => p.remove(), 1500);
    }
}

function getNoteRotation(id) {
    // Dùng ID để tạo góc xoay cố định cho mỗi note (-2 đến 2 độ)
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rotations = [-2, -1, 0, 1, 2, -1.5, 1.5];
    return rotations[seed % rotations.length];
}

function toggleTodoForm() {
    const form = document.getElementById("todo-form");
    if (form) {
        form.classList.toggle("hidden");
        if (form.classList.contains("hidden")) {
            // Reset trạng thái sửa khi đóng form
            editingTodoId = null;
            document.getElementById("btn-save-todo").innerText = "Lưu Lại";
            document.getElementById("todo-input").value = "";
            document.getElementById("todo-date").value = "";
            const rankSel = document.getElementById("todo-rank");
            if (rankSel) rankSel.value = "B";
        } else {
            document.getElementById("todo-input").focus();
        }
    }
}

async function addTodo() {
    const input = document.getElementById("todo-input");
    const dateInput = document.getElementById("todo-date");
    const categorySel = document.getElementById("todo-category");
    const rankSel = document.getElementById("todo-rank");

    const text = input.value.trim();
    if (!text) return;
    
    const rank = rankSel ? rankSel.value : "B";

    if (editingTodoId) {
        // Chế độ Cập nhật
        const todo = todosData.find(t => t.id === editingTodoId);
        if (todo) {
            todo.text = text;
            todo.deadline = dateInput.value;
            todo.category = categorySel.value;
            todo.rank = rank;
            showToast("Đã cập nhật công việc", "success");
        }
    } else {
        // Chế độ Thêm mới
        const newTodo = {
            id: Date.now().toString(),
            text: text,
            category: categorySel.value,
            rank: rank,
            deadline: dateInput.value,
            completed: false,
            createdAt: new Date().toISOString()
        };
        todosData.unshift(newTodo);
        showToast("Đã thêm công việc mới", "success");
    }

    // Reset form và đóng
    input.value = "";
    dateInput.value = "";
    editingTodoId = null;
    document.getElementById("btn-save-todo").innerText = "Lưu Lại";

    toggleTodoForm();
    renderTodos();
    await saveToBackend();
}

function editTodo(id) {
    const todo = todosData.find(t => t.id === id);
    if (!todo) return;

    editingTodoId = id;

    // Điền dữ liệu vào form
    document.getElementById("todo-input").value = todo.text;
    document.getElementById("todo-date").value = todo.deadline || "";
    document.getElementById("todo-category").value = todo.category || "Học tập";
    
    const rankSel = document.getElementById("todo-rank");
    if (rankSel) rankSel.value = todo.rank || "B";

    // Đổi chữ nút bấm
    document.getElementById("btn-save-todo").innerText = "Cập Nhật";

    // Mở form nếu đang đóng
    const form = document.getElementById("todo-form");
    if (form && form.classList.contains("hidden")) {
        toggleTodoForm();
    }
    document.getElementById("todo-input").focus();
}

async function toggleTodo(id) {
    const todo = todosData.find(t => t.id === id);
    if (!todo) return;

    const isNowCompleted = !todo.completed;
    const isLifestyleQuest = todo.text.startsWith("Nhật Tu:");

    if (isLifestyleQuest && isNowCompleted) {
        // Tính toán hoàn thành trước deadline bao nhiêu ngày
        let diffDays = 0;
        if (todo.deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dlDate = new Date(todo.deadline);
            dlDate.setHours(0, 0, 0, 0);
            const diffTime = dlDate - today;
            diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
        
        // Gọi API add_todo_xp
        eel.add_todo_xp(diffDays, todo.rank || "B", null)().then(user => {
            if (user) {
                showToast(`Hoàn thành Nhật Tu! Điểm thưởng đã được cộng.`, "success");
                window.checkBreakthrough(user);
            }
        });

        // Xóa hoàn toàn nhiệm vụ Nhật Tu khỏi Todo List để tránh gây loãng danh sách đã hoàn thành
        todosData = todosData.filter(t => t.id !== id);
        await saveToBackend();
        
        const el = document.getElementById(`todo-${id}`);
        if (el) {
            el.classList.add("animate-fade-out");
            setTimeout(() => {
                renderTodos();
            }, 280);
        } else {
            renderTodos();
        }
        return;
    }

    // Nhiệm vụ bình thường
    todo.completed = isNowCompleted;
    await saveToBackend();

    if (isNowCompleted) {
        // Tính toán hoàn thành trước deadline bao nhiêu ngày
        let diffDays = 0;
        if (todo.deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dlDate = new Date(todo.deadline);
            dlDate.setHours(0, 0, 0, 0);
            const diffTime = dlDate - today;
            diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
        
        // Kích hoạt hiệu ứng diệt ma rung chấn cực mạnh nếu hoàn thành S-Rank BOSS
        if (todo.rank === "S") {
            triggerBossMissionCompleteEffect();
        }
        
        // Gọi API add_todo_xp với rank
        eel.add_todo_xp(diffDays, todo.rank || "B", null)().then(user => {
            if (user) {
                if (todo.rank === "S") {
                    showToast(`⚔️ HOÀNH TRÁNG! Đạo hữu đã diệt ma hoàn thành nhiệm vụ Tông môn tối cao, nhận lượng Tu vi cực khủng!`, "success");
                } else {
                    showToast(`Hoàn thành Todo! Điểm thưởng đã được cộng.`, "success");
                }
                window.checkBreakthrough(user);
            }
        });
    }

    const el = document.getElementById(`todo-${id}`);

    // Nếu đang view những cái khác (có filter) và ta thay đổi state khiến nó k thuộc view hiện tại nữa
    // Thì cho nó trôi đi
    let shouldSlideOut = false;
    if (currentFilter === "Hoàn thành" && !isNowCompleted) shouldSlideOut = true;
    if (currentFilter !== "Hoàn thành" && isNowCompleted) shouldSlideOut = true;

    if (el && shouldSlideOut) {
        el.classList.add("animate-fade-out");
        // Giảm time animation JS để khỏi đợi lâu
        setTimeout(() => {
            renderTodos();
        }, 280); // Khớp time fade out
    } else {
        renderTodos();
    }
}

async function deleteTodo(id) {
    // Có thể cho animation ở đây
    todosData = todosData.filter(t => t.id !== id);
    await saveToBackend();
    renderTodos();
}

async function saveToBackend() {
    const res = await eel.save_todo_data(todosData)();
    if (res.status === "error") {
        showToast("Lỗi lưu dữ liệu: " + res.msg, "error");
    }
}

function filterTodos(category) {
    currentFilter = category;

    // Update style cho nút bấm
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.innerText.trim() === category) {
            btn.className = "filter-btn active whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-primary text-white shadow-md shadow-blue-500/20";
        } else {
            btn.className = "filter-btn whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-dark transition-colors";
        }
    });

    renderTodos();
}

function renderTodos() {
    if (viewMode === "calendar") {
        renderCalendar();
        return;
    }

    const listEl = document.getElementById("todo-list");
    const emptyEl = document.getElementById("todo-empty");
    const statTotalEl = document.getElementById("stat-total");
    const statDoneEl = document.getElementById("stat-done");

    listEl.innerHTML = "";

    let displayList = todosData;
    if (currentFilter === "Hoàn thành") {
        displayList = todosData.filter(t => t.completed);
    } else if (currentFilter === "Tất cả") {
        displayList = todosData.filter(t => !t.completed); // Filter default giờ chỉ thấy chưa xong
    } else {
        displayList = todosData.filter(t => t.category === currentFilter && !t.completed);
    }

    // Sắp xếp: Ưu tiên Chưa xong -> Deadline gần nhất -> Mới tạo
    displayList.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (displayList.length === 0) {
        emptyEl.classList.remove("hidden");
    } else {
        emptyEl.classList.add("hidden");

        displayList.forEach((todo, idx) => {
            const itemEl = document.createElement("div");
            // Tính toán Deadline
            let deadlineHtml = '';
            let highlightClass = '';

            if (todo.deadline && !todo.completed) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dlDate = new Date(todo.deadline);
                dlDate.setHours(0, 0, 0, 0);
                const diffTime = dlDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    highlightClass = 'border-[#CD5C5C]/50 shadow-sm bg-[#FFF5F5]';
                    deadlineHtml = `<span class="text-[11px] text-[#DC2626] font-bold border border-[#DC2626]/40 px-2 py-0.5 rounded-md bg-[#DC2626]/10 flex items-center gap-1 w-fit"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Quá hạn ${Math.abs(diffDays)} ngày</span>`;
                } else if (diffDays <= 2) {
                    if (diffDays === 0) {
                        deadlineHtml = `<span class="text-[11px] text-[#EA580C] font-bold border border-[#EA580C]/40 px-2 py-0.5 rounded-md bg-[#EA580C]/10 flex items-center gap-1 w-fit"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Deadline HÔM NAY!</span>`;
                        highlightClass = 'border-[#FB923C]/50 shadow-sm bg-[#FFF7ED]';
                    } else {
                        highlightClass = 'border-[#FACC15]/50 shadow-sm bg-[#FEFCE8]';
                        deadlineHtml = `<span class="text-[11px] text-[#CA8A04] font-bold border border-[#CA8A04]/40 px-2 py-0.5 rounded-md bg-[#CA8A04]/10 flex items-center gap-1 w-fit"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Tới hạn trong ${diffDays} ngày</span>`;
                    }
                } else {
                    deadlineHtml = `<span class="text-[11px] text-[#4B5563] border border-[#000000]/10 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit font-medium"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${dlDate.toLocaleDateString('vi-VN')}</span>`;
                }
            } else if (todo.deadline && todo.completed) {
                const dlDate = new Date(todo.deadline);
                deadlineHtml = `<span class="text-[11px] text-[#6B7280] border border-[#000000]/10 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit opacity-60"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${dlDate.toLocaleDateString('vi-VN')}</span>`;
            }

            itemEl.id = `todo-${todo.id}`;
            const colors = getCategoryColor(todo.category);
            const rotation = getNoteRotation(todo.id);

            itemEl.className = `todo-item relative flex flex-col min-h-[180px] p-5 rounded-sm shadow-xl transition-all animate-scale-up border-b-4 border-r-2 ${colors.card} ${todo.completed ? 'opacity-75 grayscale-[0.2]' : ''}`;
            itemEl.style.transform = `rotate(${rotation}deg)`;

            // Chỉ delay cho những cái cũ để tạo hiệu ứng lướt, cái mới nhất (idx=0) hiện ngay
            if (idx > 0 && idx < 5) {
                itemEl.style.animationDelay = `${idx * 0.04}s`;
            } else if (idx >= 5) {
                itemEl.classList.remove('animate-scale-up'); // Chống giật cho list quá dài
            }

            // Giả lập Ghim đỏ (Push Pin) - Click để Toggle Hoàn thành
            const pinHtml = `<div onclick="toggleTodo('${todo.id}')" class="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 z-20 cursor-pointer hover:scale-125 transition-all duration-300 group flex items-center justify-center" title="${todo.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}">
                <!-- Bóng của ghim trên giấy -->
                <div class="absolute top-[60%] left-[60%] w-2 h-2 bg-black/30 rounded-full blur-[1px]"></div>
                <!-- Đầu ghim (Pin Head) -->
                <div class="relative w-7 h-7 ${todo.completed ? 'bg-gradient-to-tr from-gray-500 to-gray-300' : 'bg-gradient-to-tr from-red-600 via-red-500 to-red-400'} rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.3)] border border-black/10 flex items-center justify-center overflow-hidden">
                    <!-- Ánh sáng phản chiếu (Shine) -->
                    <div class="absolute top-1 left-1 w-2.5 h-2.5 bg-white/40 rounded-full blur-[0.5px]"></div>
                    <!-- Icon tick nếu xong -->
                    ${todo.completed ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" class="drop-shadow-sm"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
            </div>`;

            itemEl.innerHTML = `
                ${pinHtml}
                <!-- Nội dung chính -->
                <div class="flex-1 flex flex-col gap-3">
                    <div class="flex justify-between items-start gap-2 flex-wrap">
                        <span class="text-[9px] font-bold uppercase tracking-widest border border-[#000000]/10 px-2 py-0.5 rounded-md ${colors.sub}">${todo.category}</span>
                        ${getRankBadge(todo.rank || 'B')}
                    </div>
                    
                    <p class="text-[15px] font-bold leading-relaxed ${todo.completed ? 'line-through opacity-80' : colors.text} break-words">
                        ${escapeHTML(todo.text)}
                    </p>
                </div>

                <!-- Thanh công cụ & Deadline -->
                <div class="mt-4 pt-3 border-t border-[#000000]/10">
                    <div class="flex justify-between items-center">
                        <div class="flex-1 min-w-0">
                            ${deadlineHtml}
                        </div>
                        <div class="flex gap-1 ml-2">
                            <button onclick="editTodo('${todo.id}')" class="p-1.5 ${colors.text} opacity-40 hover:opacity-100 hover:bg-[#FFFFFF]/20 rounded-md transition-all" title="Sửa">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button onclick="deleteTodo('${todo.id}')" class="p-1.5 ${colors.text} opacity-40 hover:opacity-100 hover:bg-[#FFFFFF]/20 rounded-md transition-all" title="Xóa">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            listEl.appendChild(itemEl);
        });
    }

    // Cập nhật thống kê
    if (statTotalEl && statDoneEl) {
        statTotalEl.innerText = todosData.length;
        const doneCount = todosData.filter(t => t.completed).length;
        statDoneEl.innerText = doneCount;

        if (doneCount > 0 && doneCount === todosData.length) {
            statDoneEl.classList.remove("text-primary");
            statDoneEl.classList.add("text-spotify");
        } else {
            statDoneEl.classList.add("text-primary");
            statDoneEl.classList.remove("text-spotify");
        }
    }
}

// Utils an toàn XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function openAddFormWithDate(dateStr) {
    const form = document.getElementById("todo-form");
    if (form && form.classList.contains("hidden")) {
        toggleTodoForm();
    }
    document.getElementById("todo-date").value = dateStr;
    document.getElementById("todo-input").focus();
}

// --- Logic Lịch ---

function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

function goToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

function renderCalendar() {
    const gridEl = document.getElementById("calendar-grid");
    const monthYearEl = document.getElementById("calendar-month-year");
    if (!gridEl || !monthYearEl) return;

    gridEl.innerHTML = "";
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Hiển thị tiêu đề tháng
    const monthNames = ["Tháng 01", "Tháng 02", "Tháng 03", "Tháng 04", "Tháng 05", "Tháng 06", "Tháng 07", "Tháng 08", "Tháng 09", "Tháng 10", "Tháng 11", "Tháng 12"];
    monthYearEl.innerText = `${monthNames[month]}, ${year}`;

    // Ngày đầu tiên của tháng
    const firstDay = new Date(year, month, 1);
    
    // Tìm ngày bắt đầu của lưới (bao gồm cả vài ngày của tháng trước để lấp đầy tuần)
    // getDay() trả về 0 (CN) -> 6 (T7). Ta muốn T2 là đầu tuần.
    let startDayOfWeek = firstDay.getDay(); 
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Chuyển CN thành 7
    const daysBefore = startDayOfWeek - 1; // Số ngày tháng trước cần hiển thị

    const startDate = new Date(year, month, 1 - daysBefore);

    // Vẽ 42 ô (6 tuần) để đảm bảo lịch luôn đều
    for (let i = 0; i < 42; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayEl = document.createElement("div");
        const isToday = d.toDateString() === new Date().toDateString();
        const isOtherMonth = d.getMonth() !== month;
        
        dayEl.className = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} border-r border-b border-border/30 cursor-pointer hover:bg-primary/5 transition-colors`;
        dayEl.onclick = (e) => {
            // Chỉ mở modal nếu ko phải đang click vào task tag (vì tag đã có onclick sửa)
            if (!e.target.closest('.calendar-task-tag')) {
                showDayDetail(dateStr);
            }
        };
        
        // Lọc task cho ngày này (tất cả task, kể cả đã hoàn thành)
        const tasksForDay = todosData.filter(t => t.deadline === dateStr);
        
        let tasksHtml = "";
        tasksForDay.forEach(task => {
            const colors = getCategoryColor(task.category);
            // Dùng màu nền của category làm nhãn nhỏ
            let bgColorClass = "bg-primary";
            if (task.category === "Học tập") bgColorClass = "bg-[#FFFF88]";
            else if (task.category === "Công việc") bgColorClass = "bg-[#CCFFFF]";
            else if (task.category === "Cá nhân") bgColorClass = "bg-[#C2FFC2]";
            else bgColorClass = "bg-[#FFD1FF]";

            tasksHtml += `
                <div onclick="editTodo('${task.id}')" class="calendar-task-tag ${task.completed ? 'completed' : ''} ${bgColorClass} ${colors.text} shadow-sm" title="${escapeHTML(task.text)}">
                    <span class="truncate">${escapeHTML(task.text)}</span>
                </div>
            `;
        });

        dayEl.innerHTML = `
            <div class="day-number">${d.getDate()}</div>
            <div class="calendar-tasks custom-scrollbar">
                ${tasksHtml}
            </div>
        `;
        
        gridEl.appendChild(dayEl);
    }
}

function showDayDetail(dateStr) {
    currentSelectedDate = dateStr;
    const modal = document.getElementById("day-detail-modal");
    const listEl = document.getElementById("modal-task-list");
    const titleEl = document.getElementById("modal-date-title");
    const countEl = document.getElementById("modal-task-count");

    if (!modal || !listEl || !titleEl) return;

    // Định dạng tiêu đề ngày
    const d = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    titleEl.innerText = d.toLocaleDateString('vi-VN', options);

    // Lấy danh sách task
    const tasks = todosData.filter(t => t.deadline === dateStr);
    countEl.innerText = `${tasks.length} công việc`;

    listEl.innerHTML = "";
    if (tasks.length === 0) {
        listEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <p class="text-sm font-medium">Không có công việc nào trong ngày này</p>
            </div>
        `;
    } else {
        tasks.forEach(task => {
            const colors = getCategoryColor(task.category);
            const taskEl = document.createElement("div");
            taskEl.className = `flex items-center gap-3 p-4 rounded-xl border border-border bg-dark/40 hover:bg-dark/60 transition-all group ${task.completed ? 'opacity-50' : ''}`;
            
            taskEl.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onclick="event.stopPropagation(); toggleTodoFromModal('${task.id}')"
                       class="todo-checkbox shrink-0">
                <div class="flex-1 min-w-0" onclick="editTodoFromModal('${task.id}')">
                    <p class="text-sm font-bold text-white mb-1 ${task.completed ? 'line-through' : ''}">${escapeHTML(task.text)}</p>
                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${colors.card} ${colors.text}">${task.category}</span>
                </div>
                <button onclick="deleteTodoFromModal('${task.id}')" class="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            `;
            listEl.appendChild(taskEl);
        });
    }

    modal.classList.remove("hidden");
}

function closeDayDetail() {
    const modal = document.getElementById("day-detail-modal");
    if (modal) modal.classList.add("hidden");
    currentSelectedDate = null;
}

function addTaskFromModal() {
    if (currentSelectedDate) {
        closeDayDetail();
        openAddFormWithDate(currentSelectedDate);
    }
}

async function toggleTodoFromModal(id) {
    await toggleTodo(id);
    // Re-render modal
    if (currentSelectedDate) showDayDetail(currentSelectedDate);
}

async function editTodoFromModal(id) {
    closeDayDetail();
    editTodo(id);
}

async function deleteTodoFromModal(id) {
    await deleteTodo(id);
    if (currentSelectedDate) showDayDetail(currentSelectedDate);
}

// Đóng modal khi bấm ra ngoài
window.addEventListener('click', function(e) {
    const dayModal = document.getElementById('day-detail-modal');
    if (e.target === dayModal) {
        closeDayDetail();
    }
});
