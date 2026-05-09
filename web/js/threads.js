// Hàm này được gọi từ main.js
function initThreads() {
    // Đảm bảo DOM đã sẵn sàng trước khi load
    setTimeout(() => {
        loadThreadsData();
    }, 100);
}

async function loadThreadsData() {
    const reader = document.getElementById('poem-content');
    reader.innerHTML = '<div class="text-center py-20 text-primary animate-pulse font-sans not-italic">Đang mở kho thơ...</div>';
    
    try {
        let data = await eel.get_threads_data()();
        
        if (data.includes("Tiên cảnh") || data.includes("Thi tập") || data.startsWith("Lỗi")) {
            renderEmptyState(data);
            return;
        }

        // 1. PHÂN TÍCH CÚ PHÁP (Parsing Text -> JSON Object)
        const lines = data.split('\n');
        let authors = [];
        let currentAuthor = null;
        let totalPoems = 0;

        lines.forEach(line => {
            line = line.trim();
            // Lấy tổng số bài
            if (line.startsWith('TỔNG SỐ BÀI THƠ')) {
                let match = line.match(/\d+/);
                if (match) totalPoems = match[0];
            } 
            // Lấy tên Tác giả và Số lượng
            else if (line.startsWith('Tác giả:')) {
                let match = line.match(/Tác giả:\s*(.*?)\s*\((\d+)\s*bài\)/);
                if (match) {
                    currentAuthor = { name: match[1], count: match[2], poems: [] };
                    authors.push(currentAuthor);
                }
            } 
            // Lấy tên Bài thơ
            else if (line.match(/^\d+\./)) {
                let poemName = line.replace(/^\d+\.\s*/, '');
                if (currentAuthor) currentAuthor.poems.push(poemName);
            }
        });
        
        if (authors.length === 0) {
            renderEmptyState("Thi tập hiện chưa có dữ liệu thơ được phân loại.");
            return;
        }

        // 2. RENDER RA GIAO DIỆN (Tailwind Cards)
        let html = `
            <div class="mb-8 flex justify-between items-center border-b border-gray-800 pb-4">
                <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                    <span class="p-2 bg-gray-800 rounded-lg text-lg">📚</span> Mục lục Tác giả
                </h2>
                <div class="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold border border-primary/20 flex items-center gap-2">
                    <span>Tổng cộng:</span>
                    <span class="text-lg">${totalPoems}</span>
                    <span>bài thơ</span>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        `;

        // Render từng thẻ tác giả
        authors.forEach(author => {
            html += `
                <div class="bg-card rounded-2xl border border-gray-800 overflow-hidden hover:border-primary/40 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] group flex flex-col h-80">
                    
                    <div class="px-5 py-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center group-hover:bg-gray-800 transition-colors">
                        <h3 class="font-bold text-lg text-gray-200 group-hover:text-primary transition-colors truncate pr-3" title="${author.name}">
                            ${author.name}
                        </h3>
                        <span class="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                            ${author.count} bài
                        </span>
                    </div>
                    
                    <div class="p-5 flex-1 overflow-y-auto custom-scrollbar bg-card">
                        <ul class="space-y-3">
                            ${author.poems.map((poem, idx) => `
                                <li class="text-sm flex gap-3 group/item items-start">
                                    <span class="text-gray-600 font-mono text-[10px] mt-1 group-hover/item:text-primary transition-colors w-4 text-right shrink-0">
                                        ${idx + 1}.
                                    </span>
                                    <span class="text-gray-400 group-hover/item:text-gray-100 transition-colors cursor-default leading-relaxed">
                                        ${poem}
                                    </span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });

        html += `</div>`; // Đóng Grid
        reader.innerHTML = html;

    } catch (e) {
        renderEmptyState("Lỗi phân tích dữ liệu. Đảm bảo file đúng định dạng.");
    }
}

function renderEmptyState(msg) {
    document.getElementById('poem-content').innerHTML = `
        <div class="flex flex-col items-center justify-center py-32 animate-[fadeIn_0.5s]">
            <div class="relative mb-8">
                <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                <div class="relative w-24 h-24 bg-dark/50 border border-border rounded-3xl flex items-center justify-center text-5xl shadow-2xl">
                    📜
                </div>
            </div>
            <h3 class="text-xl font-bold text-white mb-3">Vạn Pháp Quy Tông</h3>
            <p class="text-gray-400 max-w-xs text-center leading-relaxed">
                ${msg}
            </p>
            <div class="mt-8 flex gap-4">
                <button onclick="toggleCrawler()" class="px-6 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold text-sm transition-all">
                    Khai thông thi lộ
                </button>
            </div>
        </div>`;
}

// Hàm mở link cố định
async function openThreadsFixed() {
    // Gọi thẳng URL gốc của Threads
    await eel.open_browser_link("https://www.threads.com/@tnph_c")();
}

// Hàm Ẩn/Hiện khu vực chứa Code
function toggleCrawler() {
    const section = document.getElementById('crawler-section');
    section.classList.toggle('hidden');
    section.classList.toggle('flex');
}

function copyCode() {
    const code = document.getElementById('crawler-code').innerText;
    navigator.clipboard.writeText(code);
    
    const btn = document.getElementById('btn-copy');
    btn.innerHTML = "✅ COPIED!";
    btn.classList.replace("bg-primary", "bg-[#1ed760]");
    btn.classList.replace("text-white", "text-black");
    
    setTimeout(() => {
        btn.innerHTML = "📋 COPY CODE";
        btn.classList.replace("bg-[#1ed760]", "bg-primary");
        btn.classList.replace("text-black", "text-white");
    }, 2000);
}