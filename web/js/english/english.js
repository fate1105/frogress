/**
 * English Module - Main Entry Point.
 * Replaces the old toeic.js logic with a modern, modular system.
 */

async function initEnglishModule() {
    console.log("Initializing English Module (Ngoại Ngữ Chân Kinh)...");
    
    // 1. Load Data
    const words = await DataService.loadData();
    console.log(`Loaded ${words.length} words.`);
    
    // 2. Initialize UI
    UIManager.init();
}

// Redirect initToeic to the new module for compatibility with main.js
window.initToeic = initEnglishModule;

// --- GLOBAL ACTIONS (Called from HTML) ---

window.openToeicModal = function() {
    const modal = document.getElementById('toeic-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeToeicModal = function() {
    const modal = document.getElementById('toeic-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const fields = ['modal-word', 'modal-meaning', 'modal-pos', 'modal-phonetic', 'modal-topic', 'modal-audio', 'modal-def-en', 'modal-def-vn', 'modal-example'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const level = document.getElementById('modal-level');
        if (level) level.value = 'B1';
    }
};

window.openAiToeicModal = function() {
    const modal = document.getElementById('ai-toeic-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeAiToeicModal = function() {
    const modal = document.getElementById('ai-toeic-modal');
    if (modal) {
        modal.classList.add('hidden');
        const input = document.getElementById('ai-modal-word-input');
        if (input) input.value = '';
    }
};

window.generateWithAIFromModal = async function() {
    const input = document.getElementById('ai-modal-word-input');
    const word = input.value.trim();
    if (!word) {
        showToast("Vui lòng nhập từ vựng!", "warning");
        return;
    }

    const btn = document.getElementById('btn-ai-modal-gen');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="text-xs font-bold animate-pulse">Đang kiến tạo...</span>';
    btn.disabled = true;

    try {
        const response = await eel.generate_toeic_ai(word)();
        if (response.status === 'success') {
            const questions = response.data;
            let successCount = 0;

            for (const item of questions) {
                const saveRes = await eel.save_toeic_item('vocal', item)();
                if (saveRes.status === 'success') successCount++;
            }

            input.value = '';
            window.closeAiToeicModal();
            showToast(`Đã tự động tạo và lưu ${successCount} câu hỏi thành công!`, "success");
            await DataService.loadData();
            UIManager.renderHome();
        } else {
            showToast(response.msg, "error");
        }
    } catch (err) {
        showToast("Lỗi kết nối AI: " + err, "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

window.saveNewItem = async function() {
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
        word,
        meaning_vn: meaning,
        partOfSpeech: pos,
        phonetic,
        level,
        topic,
        audio_url: audio,
        definition_en: defEn,
        definition_vn: defVn,
        example
    };

    const btn = document.getElementById('btn-save-toeic');
    if (btn) btn.innerText = "Đang lưu...";

    const response = await eel.save_toeic_item('vocal', newItem)();
    
    if (response.status === 'success') {
        window.closeToeicModal();
        await DataService.loadData();
        if (UIManager.activeView === 'home' || UIManager.activeView === 'topics') UIManager.renderHome();
        showToast("Đã lưu thành công!", "success");
    } else {
        showToast("Lỗi: " + response.msg, "error");
    }
    
    if (btn) btn.innerText = "Lưu vào kho";
};

window.generateWithAI = async function() {
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
                const saveRes = await eel.save_toeic_item('vocal', item)();
                if (saveRes.status === 'success') successCount++;
            }

            input.value = '';
            showToast(`Đã tự động tạo và lưu ${successCount} câu hỏi thành công!`, "success");
            await DataService.loadData();
            UIManager.renderHome();
        } else {

            showToast(response.msg, "error");
        }
    } catch (err) {
        showToast("Lỗi kết nối AI: " + err, "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

window.playVocabAudio = function(url) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(err => console.error("Lỗi phát âm thanh:", err));
};

// --- UTILS ---
window.highlightWord = function(sentence, word) {
    if (!sentence || !word) return sentence;
    const regex = new RegExp(`\\b(${word}s?|${word.slice(0, -1)}[a-zA-Z]*)\\b`, 'gi');
    return sentence.replace(regex, `<span class="text-primary font-bold font-mono">$1</span>`);
};

window.blankOutWord = function(sentence, word) {
    if (!sentence || !word) return sentence;
    const regex = new RegExp(`\\b(${word}s?|${word.slice(0, -1)}[a-zA-Z]*)\\b`, 'gi');
    return sentence.replace(regex, `<span class="text-primary font-black font-mono tracking-wider px-2 border-b-2 border-dashed border-primary">_______</span>`);
};

// Optional: Global scope access for debug
window.EnglishModule = {
    DataService,
    SRSEngine,
    PracticeEngine,
    UIManager
};

