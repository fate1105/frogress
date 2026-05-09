let notesData = [];
let editingNoteId = null;

async function initNotes() {
    // Gọi API từ Python lấy data
    const data = await eel.get_notes_data()();
    notesData = data || [];
    renderNotes();
}

function toggleNoteForm() {
    const form = document.getElementById("note-form");
    if (form) {
        form.classList.toggle("hidden");
        if (form.classList.contains("hidden")) {
            editingNoteId = null;
            document.getElementById("btn-save-note").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Lưu ngay`;
            document.getElementById("note-title").value = "";
            document.getElementById("note-content").value = "";
        } else {
            document.getElementById("note-title").focus();
        }
    }
}

async function addNote() {
    const titleInput = document.getElementById("note-title");
    const contentInput = document.getElementById("note-content");

    const title = titleInput.value.trim();
    const content = contentInput.value; // Giữ nguyên, không trim khoảng trắng để giữ code format

    if (!content.trim()) {
        showToast("Nội dung không được để trống!", "warning");
        return;
    }

    if (editingNoteId) {
        const note = notesData.find(n => n.id === editingNoteId);
        if (note) {
            note.title = title || "Ghi chú không tên";
            note.content = content;
            showToast("Đã cập nhật ghi chú", "success");
        }
    } else {
        const newNote = {
            id: Date.now().toString(),
            title: title || "Ghi chú không tên",
            content: content,
            createdAt: new Date().toISOString()
        };
        notesData.unshift(newNote); // Đưa lên đầu
        showToast("Đã lưu ghi chú mới", "success");
    }

    titleInput.value = "";
    contentInput.value = "";
    editingNoteId = null;

    toggleNoteForm();

    await saveNotesToBackend();
    renderNotes();
}

function editNote(id) {
    const note = notesData.find(n => n.id === id);
    if (!note) return;

    editingNoteId = id;
    document.getElementById("note-title").value = note.title;
    document.getElementById("note-content").value = note.content;

    document.getElementById("btn-save-note").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Cập nhật`;

    const form = document.getElementById("note-form");
    if (form && form.classList.contains("hidden")) {
        toggleNoteForm();
    }
    document.getElementById("note-content").focus();
}

async function deleteNote(id) {
    if (document.getElementById('delete-modal')) return;

    const modalHTML = `
        <div id="delete-modal" class="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center animate-[fadeIn_0.2s]">
            <div class="bg-card w-[350px] p-6 rounded-2xl shadow-2xl border border-gray-700 mx-4 transform transition-all scale-100 relative">
                <h3 class="text-xl font-bold mb-2 text-white">Xác nhận xóa</h3>
                <p class="text-gray-400 text-sm mb-6">Bạn có chắc chắn muốn xóa ghi chú này không? Hành động này không thể khôi phục.</p>
                <div class="flex justify-end gap-3">
                    <button id="btn-cancel-del" class="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">Hủy</button>
                    <button id="btn-confirm-del" class="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg transition-colors">Xóa luôn</button>
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
        notesData = notesData.filter(n => n.id !== id);
        await saveNotesToBackend();
        renderNotes();
        showToast("Đã xóa ghi chú", "info");
    });
}

async function copyNoteContent(btn, id) {
    const note = notesData.find(n => n.id === id);
    if (!note) return;

    try {
        await navigator.clipboard.writeText(note.content);

        // Đổi hiệu ứng nút copy tạm thời
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg> <span class="text-green-500 font-medium">Copied!</span>`;
        btn.classList.add("border-green-500/50", "bg-green-500/10");

        showToast("Đã chép vào bộ nhớ đệm", "success");

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove("border-green-500/50", "bg-green-500/10");
        }, 2000);
    } catch (err) {
        showToast("Lỗi khi copy: " + err, "error");
    }
}

async function saveNotesToBackend() {
    const res = await eel.save_notes_data(notesData)();
    if (res.status === "error") {
        showToast("Lỗi lưu dữ liệu: " + res.msg, "error");
    }
}

function renderNotes() {
    const gridEl = document.getElementById("note-grid");
    const emptyEl = document.getElementById("note-empty");
    const statTotalEl = document.getElementById("note-stat-total");

    gridEl.innerHTML = "";

    if (notesData.length === 0) {
        emptyEl.classList.remove("hidden");
    } else {
        emptyEl.classList.add("hidden");

        notesData.forEach((note, idx) => {
            const cardEl = document.createElement("div");
            // Gán style trực tiếp bằng biến CSS của Hub để đảm bảo đồng bộ theme 100%
            cardEl.className = 'note-card group flex flex-col border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 animate-scale-up';
            cardEl.style.backgroundColor = 'var(--color-bg-card)';
            cardEl.style.color = 'var(--color-white)';
            cardEl.style.animationDelay = `${idx * 0.04}s`;

            const dateStr = new Date(note.createdAt).toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit',
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            cardEl.innerHTML = `
                <!-- Card Header -->
                <div class="px-5 py-4 flex justify-between items-start gap-4">
                    <div class="flex flex-col min-w-0">
                        <h3 class="text-[16px] font-bold leading-tight truncate text-white" title="${escapeHTMLNotes(note.title)}">
                            ${escapeHTMLNotes(note.title)}
                        </h3>
                        <div class="flex items-center gap-3 mt-1.5">
                            <span class="text-[10px] uppercase tracking-wider font-bold text-primary/70">Note</span>
                            <span class="w-1 h-1 rounded-full bg-gray-500/30"></span>
                            <span class="text-[11px] font-medium text-gray-400 font-mono">${dateStr}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Card Body -->
                <div class="px-5 pb-5 flex-1 overflow-x-auto">
                    <pre class="note-content-area font-sans text-[14px] leading-relaxed whitespace-pre-wrap select-text text-gray-400">${escapeHTMLNotes(note.content)}</pre>
                </div>
                
                <!-- Footer - Luôn hiển thị -->
                <div class="px-5 py-3 flex justify-between items-center bg-black/5 dark:bg-black/20 border-t border-border">
                    <div class="flex gap-2">
                        <button onclick="copyNoteContent(this, '${note.id}')" class="p-2 rounded-lg border border-transparent hover:border-primary/20 text-gray-400 hover:text-primary transition-all" title="Sao chép">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button onclick="editNote('${note.id}')" class="p-2 rounded-lg border border-transparent hover:border-primary/20 text-gray-400 hover:text-primary transition-all" title="Chỉnh sửa">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>
                    <button onclick="deleteNote('${note.id}')" class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent" title="Xóa">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            gridEl.appendChild(cardEl);
        });
    }

    if (statTotalEl) statTotalEl.innerText = notesData.length;
}

// Utils an toàn XSS
function escapeHTMLNotes(str) {
    if (!str) return "";
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
