async function initDashboard() {
    console.log("Initializing Dashboard...");
    
    try {
        // 1. Lấy dữ liệu từ Backend
        const data = await eel.get_dashboard_data()();
        const fate = await eel.get_fate_data()();
        
        // 2. Xử lý Lời chào & Fate Fact
        updateGreeting();
        if (fate) {
            document.getElementById('dash-fate-title').textContent = fate.type === 'fatefact' ? 'Cơ duyên hằng ngày' : 'Thiên đạo chỉ dẫn';
            document.getElementById('dash-fate-content').textContent = `"${fate.content}"`;
            
            // Đồng bộ icon với level (sẽ được xử lý ở updateFrogEvolution bên dưới)
        }
        
        // 3. Hiển thị Stats
        document.getElementById('stat-focus-time').textContent = data.focus_time || 0;
        document.getElementById('stat-pending-tasks').textContent = data.pending_tasks || 0;
        
        // 4. Xử lý Frog Gamification
        const user = data.user;
        window.checkBreakthrough(user);
        document.getElementById('stat-xp').textContent = user.xp_in_level !== undefined ? user.xp_in_level : user.xp;
        document.getElementById('stat-level').textContent = user.level;
        
        // Gọi hàm hiển thị khí vận hàng ngày
        checkAndRenderDailyFortune(user, data.today);
        
        // Tính % Progress Bar dựa trên API trả về
        const currentXP = user.xp_in_level !== undefined ? user.xp_in_level : (user.xp % 200);
        const xpNeeded = user.xp_needed || 200;
        const progressPercent = (currentXP / xpNeeded) * 100;
        document.getElementById('xp-progress-bar').style.width = `${progressPercent}%`;
        document.getElementById('xp-to-next').textContent = `/ ${xpNeeded} Tu vi`;
        
        // Cập nhật tên và icon tiến hóa
        updateFrogEvolution(user.level);

    } catch (error) {
        console.error("Lỗi khởi tạo Dashboard:", error);
    }
}

function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting-text');
    if (!greetingEl) return;

    let greeting = "Đạo hữu ngày mới tốt lành!";
    if (hour >= 5 && hour < 12) greeting = "Đạo hữu buổi sáng tốt lành!";
    else if (hour >= 12 && hour < 18) greeting = "Đạo hữu buổi chiều an lạc!";
    else if (hour >= 18 && hour < 22) greeting = "Đạo hữu buổi tối tinh tấn!";
    else greeting = "Đạo hữu vẫn đang thức khuya tu luyện sao?";

    greetingEl.textContent = greeting;
}

function updateFrogEvolution(level) {
    const iconEl = document.getElementById('frog-evolution-icon');
    const nameEl = document.getElementById('frog-level-name');
    if (!iconEl || !nameEl) return;

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
        if (level >= r.level) currentRank = r;
    }

    const iconHtml = `<img src="assets/icons/rank-${currentRank.rank}.png" class="w-full h-full object-contain" onerror="this.outerHTML='${currentRank.icon}'">`;
    iconEl.innerHTML = iconHtml;
    nameEl.textContent = currentRank.name;
    
    // Cập nhật icon trên Greeting và Fate Bar (Giữ 🐸 mặc định theo yêu cầu)
    const dashFateIcon = document.getElementById('dash-fate-icon');
    if (dashFateIcon) dashFateIcon.textContent = "🐸";
    
    const fateIcon = document.getElementById('meow-icon');
    if (fateIcon) fateIcon.textContent = "🐸";
}

function checkAndRenderDailyFortune(user, today) {
    const section = document.getElementById('daily-fortune-section');
    const stick = document.getElementById('fortune-wood-stick');
    const desc = document.getElementById('fortune-description');
    const btn = document.getElementById('btn-roll-fortune');
    
    if (!section || !stick || !desc || !btn) return;
    
    if (user.last_fortune_date === today && user.current_fortune) {
        const fortune = user.current_fortune;
        stick.textContent = fortune.icon;
        stick.style.borderColor = fortune.color;
        stick.style.color = fortune.color;
        
        desc.innerHTML = `
            <span class="font-black text-sm uppercase block mt-0.5" style="color: ${fortune.color}">${fortune.title}</span>
            <span class="block text-[10px] text-gray-300 mt-1 leading-relaxed">${fortune.desc}</span>
        `;
        
        // Ẩn hoàn toàn khối chứa nút bấm để tối giản giao diện
        btn.parentElement.classList.add('hidden');
        
        section.style.borderColor = "rgba(0,0,0,0.4)";
        section.style.boxShadow = `0 10px 30px -10px ${fortune.color}15`;
    } else {
        stick.textContent = "🔮";
        stick.style.borderColor = "";
        stick.style.color = "";
        
        desc.innerHTML = `
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Quẻ hôm nay</span>
            <span class="font-extrabold text-xs text-white block mt-0.5">Chưa gieo quẻ</span>
            <span class="block text-[10px] text-gray-400 mt-1 leading-relaxed">Hãy quay quẻ chiêm tinh để nhận khí vận.</span>
        `;
        
        // Hiện khối chứa nút bấm để sẵn sàng gieo quẻ
        btn.parentElement.classList.remove('hidden');
        btn.textContent = "Gieo Quẻ";
        btn.disabled = false;
        btn.className = "w-full bg-primary hover:brightness-110 text-black font-extrabold py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-widest transition-all";
        
        section.style.borderColor = "";
        section.style.boxShadow = "";
    }
}

async function rollDailyFortune() {
    const section = document.getElementById('daily-fortune-section');
    const stick = document.getElementById('fortune-wood-stick');
    const btn = document.getElementById('btn-roll-fortune');
    if (!section || !stick || !btn) return;
    
    btn.disabled = true;
    btn.textContent = "Chờ chút...";
    
    section.classList.add('animate-[shake_0.5s_infinite]');
    
    const rollIcons = ["🔮", "🎋", "☯️", "✨", "🌟", "🍀"];
    let i = 0;
    const interval = setInterval(() => {
        stick.textContent = rollIcons[i % rollIcons.length];
        i++;
    }, 100);
    
    try {
        const res = await eel.roll_daily_fortune()();
        
        setTimeout(() => {
            clearInterval(interval);
            section.classList.remove('animate-[shake_0.5s_infinite]');
            
            if (res.success) {
                const fortune = res.fortune;
                stick.textContent = fortune.icon;
                stick.style.borderColor = fortune.color;
                stick.style.color = fortune.color;
                stick.classList.remove('animate-pulse');
                
                const desc = document.getElementById('fortune-description');
                desc.innerHTML = `
                    <span class="font-black text-sm uppercase block mt-0.5" style="color: ${fortune.color}">${fortune.title}</span>
                    <span class="block text-[10px] text-gray-300 mt-1 leading-relaxed">${fortune.desc}</span>
                `;
                
                // Ẩn hoàn toàn khối chứa nút bấm để tối giản giao diện sau khi gieo thành công
                btn.parentElement.classList.add('hidden');
                
                section.style.borderColor = "rgba(0,0,0,0.4)";
                section.style.boxShadow = `0 10px 30px -10px ${fortune.color}15`;
                
                showToast(`🔮 Đạo hữu đã khai mở quẻ: ${fortune.title}!`, "success");
                
                createFortuneParticles(section, fortune.color);
            } else {
                showToast(res.message, "error");
                btn.disabled = false;
                btn.textContent = "Gieo Quẻ";
            }
        }, 1500);
        
    } catch (error) {
        clearInterval(interval);
        section.classList.remove('animate-[shake_0.5s_infinite]');
        btn.disabled = false;
        btn.textContent = "Gieo Quẻ Khí Vận";
        console.error("Lỗi khi quay quẻ:", error);
    }
}

function createFortuneParticles(container, color) {
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'absolute pointer-events-none rounded-full z-50';
        p.style.width = `${Math.random() * 6 + 4}px`;
        p.style.height = p.style.width;
        p.style.backgroundColor = color;
        p.style.left = '50%';
        p.style.top = '50%';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 80 + 40;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;
        
        container.appendChild(p);
        
        p.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 500,
            easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
            fill: 'forwards'
        });
        
        setTimeout(() => p.remove(), 1500);
    }
}
