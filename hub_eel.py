import webbrowser
import sys

import eel
import os
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
import threading
import socket
import ctypes
import gevent

# Thiết lập AppUserModelID để Windows nhận diện icon Taskbar chính xác
try:
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("com.phuccorp.frogress.v1")
except:
    pass

# --- SINGLE INSTANCE CHECK ---
def on_second_instance():
    """Hàm gọi khi có bản thứ 2 định mở"""
    on_show(None, None)

try:
    # Bind to a specific port to ensure only one instance runs
    _instance_lock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    _instance_lock.bind(('127.0.0.1', 27015))
    _instance_lock.listen(1)
    
    def listen_for_instances():
        while True:
            try:
                conn, addr = _instance_lock.accept()
                conn.close()
                on_second_instance()
            except: break
            
    threading.Thread(target=listen_for_instances, daemon=True).start()
except socket.error:
    # Bản thứ 2: Gửi tín hiệu cho bản 1 rồi thoát
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(('127.0.0.1', 27015))
        s.close()
    except: pass
    os._exit(0)

import json
import bottle # Import để hỗ trợ Stream file mp3 từ bên ngoài _MEIPASS
from config import CONFIG_PATHS
from modules.ytb_downloader import downloader # Nhúng module tải nhạc
from modules.ytb_downloader import universal_downloader # Nhúng module tải đa năng
from modules.audio_player import AudioPlayerBackend
from modules.notifier import NotifierBackend
from modules.ai_generator import ai_gen

# Khởi tạo Python Audio Player ngay từ khi boot app để ngầm
audio_backend = AudioPlayerBackend(CONFIG_PATHS["yt_downloads"])
notifier_backend = NotifierBackend()
notifier_backend.start()

is_window_open = False # Khởi đầu là False, sẽ set True khi app thực sự chạy

class FocusBackend:
    def __init__(self, notifier):
        self.notifier = notifier
        self.is_running = False
        self.preset = '25_5'
        self.mode = 'focus'  # 'focus' or 'break'
        self.remaining_seconds = 1500
        self.auto_flow = True
        self.active_task_id = None
        self.lock = threading.Lock()
        
        self.PRESETS = {
            '25_5': {'focus': 1500, 'break': 300, 'label_focus': 'Đang tu luyện', 'label_break': 'Tiểu hồi khí'},
            '50_10': {'focus': 3000, 'break': 600, 'label_focus': 'Tập trung sâu', 'label_break': 'Đại hồi khí'},
            '50_5': {'focus': 3000, 'break': 300, 'label_focus': 'Hiệu suất cao', 'label_break': 'Tiểu hồi khí'},
            '15_3': {'focus': 900, 'break': 180, 'label_focus': 'Tập trung ngắn', 'label_break': 'Hồi khí ngắn'}
        }

    def set_state(self, state):
        with self.lock:
            new_mode = state.get('mode')
            if new_mode and self.is_running:
                if new_mode != self.mode:
                    new_mode = self.mode
            
            self.mode = new_mode if new_mode else self.mode
            self.preset = state.get('preset', self.preset)
            self.auto_flow = state.get('auto_flow', self.auto_flow)
            self.active_task_id = state.get('active_task_id', self.active_task_id)
            if not self.is_running:
                self.remaining_seconds = state.get('remaining_seconds', self.remaining_seconds)

    def get_state(self):
        with self.lock:
            return {
                "remaining_seconds": self.remaining_seconds,
                "preset": self.preset,
                "mode": self.mode,
                "is_running": self.is_running,
                "auto_flow": self.auto_flow,
                "active_task_id": self.active_task_id
            }

    def start(self):
        with self.lock:
            self.is_running = True

    def pause(self):
        with self.lock:
            self.is_running = False

    def reset(self):
        with self.lock:
            self.is_running = False
            self.remaining_seconds = self.PRESETS.get(self.preset, {}).get(self.mode, 1500)

    def _run_timer_loop(self):
        while True:
            should_sync = False
            did_end = False
            with self.lock:
                if self.is_running:
                    if self.remaining_seconds > 0:
                        self.remaining_seconds -= 1
                        should_sync = True
                    else:
                        self.is_running = False
                        did_end = True
            
            if did_end:
                self._handle_end()
            
            if should_sync and is_window_open:
                try: 
                    eel.sync_focus_timer(self.remaining_seconds)
                except Exception as e: 
                    pass
            
            gevent.sleep(1.0)

    def _handle_end(self):
        with self.lock:
            ended_mode = self.mode
            
            # 1. Cập nhật Stats
            if ended_mode == 'focus':
                mins_done = self.PRESETS.get(self.preset, {}).get('focus', 1500) // 60
                self._update_python_stats(mins_done)

            # 2. Transition
            if self.mode == 'focus':
                self.mode = 'break'
            else:
                self.mode = 'focus'
            self.remaining_seconds = self.PRESETS.get(self.preset, {}).get(self.mode, 1500)
            self.is_running = self.auto_flow
            
            current_state = {
                "remaining_seconds": self.remaining_seconds,
                "preset": self.preset,
                "mode": self.mode,
                "is_running": self.is_running,
                "auto_flow": self.auto_flow,
                "active_task_id": self.active_task_id
            }

        # 3. Thông báo
        if ended_mode == 'focus':
            mins = self.PRESETS.get(self.preset, {}).get('focus', 1500) // 60
            title = "Đạo hữu đã hoàn thành tu luyện!"
            msg = f"Chúc mừng đạo hữu đã tích lũy thêm {mins} phút tu vi."
            try:
                add_pomo_xp(15) 
            except Exception as e:
                print(f"Lỗi cộng Tu vi ngầm: {e}")
        else:
            title = "Thời gian hồi khí đã hết!"
            msg = "Đạo hữu hãy nhanh chóng quay lại tu luyện để sớm ngày phi thăng!"
            
        icon_path = resource_path("web/icon.png")
        gevent.spawn(self.notifier.send_toast, title, msg, icon_path)
        
        # 4. Lưu state xuống file
        try:
            state_file = os.path.join(CONFIG_PATHS["focus_data"], 'state.json')
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(current_state, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"Lỗi lưu focus state ngầm: {e}")
        
        if is_window_open:
            try: eel.on_focus_session_end(current_state)
            except: pass

    def _update_python_stats(self, mins):
        """Cập nhật stats.json trực tiếp từ Python"""
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y-%m-%d")
        stats_file = os.path.join(CONFIG_PATHS["focus_data"], 'stats.json')
        
        stats = {"total_minutes": 0, "streak": 0, "daily_history": {}, "last_date": ""}
        try:
            if os.path.exists(stats_file):
                with open(stats_file, 'r', encoding='utf-8') as f:
                    stats = json.load(f)
        except: pass

        stats["total_minutes"] = stats.get("total_minutes", 0) + mins
        if "daily_history" not in stats: stats["daily_history"] = {}
        stats["daily_history"][today] = stats["daily_history"].get(today, 0) + mins
        
        # Streak logic
        last_date = stats.get("last_date", "")
        if last_date != today:
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            if last_date == yesterday:
                stats["streak"] = stats.get("streak", 0) + 1
            else:
                stats["streak"] = 1
            stats["last_date"] = today

        try:
            with open(stats_file, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=4, ensure_ascii=False)
        except: pass

focus_backend = FocusBackend(notifier_backend)

# Khởi tạo Route ảo cho Audio để app .exe đọc được file nằm ngoài thư mục nội tĩnh web/
@bottle.route('/downloads/<filename:path>')
def serve_music(filename):
    return bottle.static_file(filename, root=CONFIG_PATHS["yt_downloads"])

@bottle.route('/ambient/<filename:path>')
def serve_ambient(filename):
    return bottle.static_file(filename, root=CONFIG_PATHS["ambient"])

@bottle.route('/thumbnails/<filename:path>')
def serve_thumbnails(filename):
    return bottle.static_file(filename, root=CONFIG_PATHS["yt_thumbnails"])

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

eel.init('web')

# --- AUDIO BACKEND PIPELINE ---
def sync_to_js(state_dict):
    global is_window_open
    if is_window_open:
        try:
            # Gửi không lấy lới phản hồi (fire-and-forget) để tránh kẹt thread
            eel.sync_music_state(state_dict)
        except Exception:
            pass # Lỗi socket do chưa kịp cập nhật is_window_open

audio_backend.on_state_change = sync_to_js

@eel.expose
def ap_set_playlist(playlist, durations):
    # playlist có thể là danh sách các dict (metadata) hoặc danh sách string (filenames)
    if playlist and isinstance(playlist[0], dict):
        filenames = [track['filename'] for track in playlist]
        audio_backend.set_playlist(filenames, durations)
    else:
        audio_backend.set_playlist(playlist, durations)

@eel.expose
def ap_play_track(idx): audio_backend.play_track(idx)

@eel.expose
def ap_toggle_play(): audio_backend.toggle_play()

@eel.expose
def ap_next_track(): audio_backend.next_track()

@eel.expose
def ap_prev_track(): audio_backend.prev_track()

@eel.expose
def ap_set_volume(vol): audio_backend.set_volume(vol)

@eel.expose
def ap_toggle_loop(): audio_backend.toggle_loop()

@eel.expose
def ap_toggle_shuffle(): audio_backend.toggle_shuffle()

@eel.expose
def ap_set_progress(percent): audio_backend.set_progress(percent)

@eel.expose
def ap_request_sync():
    """Hàm này để JS gọi lúc mới bật UI (khôi phục sau khi chạy từ tray)"""
    audio_backend._notify()

# --- YOUTUBE DOWNLOAD API ---

@eel.expose
def start_ytb_download(urls_text):
    # Lọc lấy danh sách link từ textarea
    urls = [url.strip() for url in urls_text.split('\n') if url.strip()]
    if not urls:
        return {"status": "warning", "msg": "Dán link vào đã!"}
    
    # Chạy process_downloads trong một luồng riêng để không làm đơ giao diện Web
    threading.Thread(target=downloader.process_downloads, args=(urls,), daemon=True).start()
    return {"status": "info", "msg": "Đang khởi động luồng tải..."}

@eel.expose
def get_downloaded_mp3():
    return downloader.get_downloaded_files()

# --- UNIVERSAL DOWNLOADER API ---
@eel.expose
def start_universal_download(urls_text, mode, quality):
    urls = [url.strip() for url in urls_text.split('\n') if url.strip()]
    if not urls:
        return {"status": "warning", "msg": "Dán ít nhất một link vào!"}
    
    threading.Thread(
        target=universal_downloader.start_download_thread, 
        args=(urls, mode, quality), 
        daemon=True
    ).start()
    return {"status": "info", "msg": "Đang phân tích link và chuẩn bị tải..."}


# --- MODULE THREADS FILTER ---
@eel.expose
def get_threads_data():
    file_path = os.path.join(CONFIG_PATHS["threads_data"], "ket_qua_tho_hoan_chinh.txt")
    
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return content if content.strip() else "Thi tập hiện đang để trống, chưa có áng thơ nào được lưu lại."
        except Exception as e:
            return f"Lỗi đọc file: {str(e)}"
            
    return "Tiên cảnh hiện tại đang bị sương mù che phủ, chưa tìm thấy thi ca nào."

@eel.expose
def open_browser_link(url):
    if not url.startswith('http'):
        url = 'https://' + url
    webbrowser.open(url)

# --- API CHO TOEIC MODULE ---
# Truy xuất đường dẫn qua Config
TOEIC_PATH = CONFIG_PATHS["toeic_data"]

@eel.expose
def get_toeic_data():
    vocal, grammar = [], []
    vocal_file = os.path.join(TOEIC_PATH, 'vocal.json')
    grammar_file = os.path.join(TOEIC_PATH, 'grammar.json')
    import time

    def heal_data(items, file_p):
        changed = False
        for i, item in enumerate(items):
            if "id" not in item:
                item["id"] = int(time.time() * 1000) + i
                changed = True
            if "status" not in item:
                item["status"] = "new"
                changed = True
            if "srs_level" not in item:
                if item["status"] == "mastered":
                    item["srs_level"] = 5
                elif item["status"] == "learning":
                    item["srs_level"] = 1
                else:
                    item["srs_level"] = 0
                changed = True
            if "next_review" not in item:
                item["next_review"] = None
                changed = True
        if changed:
            with open(file_p, 'w', encoding='utf-8') as f:
                json.dump(items, f, ensure_ascii=False, indent=4)
        return items

    try:
        if os.path.exists(vocal_file):
            with open(vocal_file, 'r', encoding='utf-8') as f:
                vocal = heal_data(json.load(f), vocal_file)
        if os.path.exists(grammar_file):
            with open(grammar_file, 'r', encoding='utf-8') as f:
                grammar = heal_data(json.load(f), grammar_file)
    except Exception as e:
        print(f"Lỗi đọc file TOEIC tại {TOEIC_PATH}: {e}")
        
    return {"vocal": vocal, "grammar": grammar}

@eel.expose
def generate_toeic_ai(word):
    return ai_gen.generate_toeic_questions(word)

@eel.expose
def save_toeic_item(item_type, new_item):
    filename = 'vocal.json' if item_type == 'vocal' else 'grammar.json'
    file_path = os.path.join(TOEIC_PATH, filename)
    
    try:
        data = []
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        # Thêm ID và Status mặc định nếu chưa có
        import time
        if "id" not in new_item:
            new_item["id"] = int(time.time() * 1000)
        if "status" not in new_item:
            new_item["status"] = "new"
            
        # Thêm vào đầu danh sách để thấy ngay kết quả trên UI
        data.insert(0, new_item)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return {"status": "success", "msg": "Đã lưu vào " + filename, "item": new_item}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@eel.expose
def update_toeic_item(item_type, updated_item):
    filename = 'vocal.json' if item_type == 'vocal' else 'grammar.json'
    file_path = os.path.join(TOEIC_PATH, filename)
    
    try:
        if not os.path.exists(file_path):
            return {"status": "error", "msg": "File không tồn tại"}
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Tìm và cập nhật theo ID
        found = False
        for i, item in enumerate(data):
            if item.get("id") == updated_item.get("id"):
                data[i] = updated_item
                found = True
                break
        
        if not found:
            return {"status": "error", "msg": "Không tìm thấy item để cập nhật"}
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@eel.expose
def delete_toeic_item(item_type, item_id):
    filename = 'vocal.json' if item_type == 'vocal' else 'grammar.json'
    file_path = os.path.join(TOEIC_PATH, filename)
    
    # Kiểm tra ID hợp lệ (tránh xóa nhầm ID None/null)
    if item_id is None or item_id == "undefined" or item_id == 0:
        return {"status": "error", "msg": "ID không hợp lệ"}

    try:
        if not os.path.exists(file_path):
            return {"status": "error", "msg": "File không tồn tại"}
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Chỉ xóa nếu tìm thấy đúng ID
        new_data = [item for item in data if item.get("id") != item_id]
        
        if len(new_data) == len(data):
            return {"status": "error", "msg": "Không tìm thấy item để xóa hoặc ID không khớp"}
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=4)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@eel.expose
def import_toeic_data(item_type, new_items):
    filename = 'vocal.json' if item_type == 'vocal' else 'grammar.json'
    file_path = os.path.join(TOEIC_PATH, filename)
    
    try:
        data = []
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        # Đảm bảo mỗi item mới có ID và Status
        import time
        for i, item in enumerate(new_items):
            if "id" not in item:
                item["id"] = int(time.time() * 1000) + i
            if "status" not in item:
                item["status"] = "new"

        # Merge dư lieu moi vao dau (Them vao tren cung bang phep + list) hoac .extend
        data = new_items + data
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        return {"status": "success", "msg": f"Đã phục hồi thành công {len(new_items)} bản ghi mảng {item_type}!"}
    except Exception as e:
        return {"status": "error", "msg": f"Lỗi đọc/ghi thiết bị: {str(e)}"}

# --- API CHO TODO LIST MODULE ---
TODO_PATH = CONFIG_PATHS["todolist_data"]

@eel.expose
def get_todo_data():
    file_path = os.path.join(TODO_PATH, 'todos.json')
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Lỗi đọc file Todo List: {e}")
        return []

@eel.expose
def save_todo_data(todos):
    file_path = os.path.join(TODO_PATH, 'todos.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(todos, f, ensure_ascii=False, indent=4)
        return {"status": "success"}
    except Exception as e:
        print(f"Lỗi ghi file Todo List: {e}")
        return {"status": "error", "msg": str(e)}

# --- REMINDERS API ---
@eel.expose
def get_reminders_data():
    rem_file = os.path.join(CONFIG_PATHS["notifier_data"], "reminders.json")
    if not os.path.exists(rem_file):
        return []
    with open(rem_file, 'r', encoding='utf-8') as f:
        try: return json.load(f)
        except: return []

@eel.expose
def save_reminders_data(data):
    rem_file = os.path.join(CONFIG_PATHS["notifier_data"], "reminders.json")
    try:
        with open(rem_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

# --- API CHO NOTES MODULE ---
NOTES_PATH = CONFIG_PATHS["notes_data"]

@eel.expose
def get_notes_data():
    file_path = os.path.join(NOTES_PATH, 'notes.json')
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Lỗi đọc file Notes: {e}")
        return []

@eel.expose
def save_notes_data(notes):
    file_path = os.path.join(NOTES_PATH, 'notes.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(notes, f, ensure_ascii=False, indent=4)
        return {"status": "success"}
    except Exception as e:
        print(f"Lỗi ghi file Notes: {e}")
        return {"status": "error", "msg": str(e)}

# --- FOCUS TIMER API ---
FOCUS_PATH = CONFIG_PATHS["focus_data"]

@eel.expose
def get_focus_data():
    stats_file = os.path.join(FOCUS_PATH, 'stats.json')
    
    data = {
        "stats": {"total_minutes": 0, "streak": 0, "daily_history": {}, "last_date": ""},
        "state": focus_backend.get_state()  # LUÔN ưu tiên state live từ backend
    }
    
    try:
        if os.path.exists(stats_file):
            with open(stats_file, 'r', encoding='utf-8') as f:
                data["stats"] = json.load(f)
    except Exception as e:
        print(f"Lỗi đọc dữ liệu Focus: {e}")
        
    return data

@eel.expose
def save_focus_stats(stats):
    try:
        stats_file = os.path.join(FOCUS_PATH, 'stats.json')
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=4)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@eel.expose
def save_focus_state(state):
    try:
        # Đồng bộ vào backend Python
        focus_backend.set_state(state)
        
        state_file = os.path.join(FOCUS_PATH, 'state.json')
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

# --- FATE DATA API ---
@eel.expose
def get_fate_data():
    import random
    file_path = os.path.join(CONFIG_PATHS["data_root"], 'fate_data.json')
    # Nếu trong config chưa có data_root hoặc file không ở đó, ta thử check data/ trực tiếp
    if not os.path.exists(file_path):
        base_path = os.path.dirname(os.path.abspath(__file__)) if not getattr(sys, 'frozen', False) else sys._MEIPASS
        file_path = os.path.join(base_path, 'data', 'fate_data.json')
        
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                facts = json.load(f)
                if facts:
                    return random.choice(facts)
        return {"type": "fatefact", "content": "Fate's Muse"}
    except Exception as e:
        print(f"Lỗi đọc Meow Fact: {e}")
        return {"type": "fatefact", "content": "Fate's Muse"}

# --- DASHBOARD & GAMIFICATION API ---
@eel.expose
def open_spotify_app():
    try:
        os.system("start spotify:")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

from modules.gamification import calculate_level, process_daily_quests, update_quest_progress, check_anti_spam, update_streak, apply_streak_multiplier, init_user_stats

def sync_lifestyle_quests_to_todo(stats):
    """Đồng bộ hóa 2 nhiệm vụ ngẫu nhiên mỗi ngày (lifestyle) sang Nhiệm vụ tông môn"""
    from modules.gamification import load_lifestyle_quests
    lifestyle_quests = load_lifestyle_quests()
    if not lifestyle_quests:
        return
        
    # Chọn ngẫu nhiên 3 nhiệm vụ lifestyle
    import random
    selected_lifestyles = random.sample(lifestyle_quests, min(3, len(lifestyle_quests)))
    if not selected_lifestyles:
        return
        
    # Đọc danh sách Todo hiện tại
    todos = get_todo_data()
    
    from datetime import datetime
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Tự động dọn dẹp: xóa bỏ các nhiệm vụ "Nhật Tu:" của những ngày trước (cho dù chưa hoàn thành)
    original_len = len(todos)
    todos = [t for t in todos if not (t.get("text", "").startswith("Nhật Tu:") and t.get("deadline") != today_str)]
    updated = len(todos) < original_len
    
    # Tránh trùng lặp: kiểm tra xem các nhiệm vụ này đã có trong danh sách hôm nay chưa
    # Chúng ta sử dụng tiêu đề (title/text) và ngày hôm nay làm chuẩn
    existing_texts = {t["text"] for t in todos if t.get("createdAt", "").startswith(today_str)}
    import time
    for q in selected_lifestyles:
        title = f"Nhật Tu: {q['title']}"
        if title not in existing_texts:
            # Quy đổi phần thưởng sang bậc tương đương: Reward 5, 10 -> C-Rank, Reward 15 -> B-Rank
            rank = "B" if q.get("reward", 10) >= 15 else "C"
            new_todo = {
                "id": f"life_{int(time.time() * 1000)}_{random.randint(100, 999)}",
                "text": title,
                "category": "Cá nhân",
                "rank": rank,
                "deadline": today_str,
                "completed": False,
                "createdAt": datetime.now().isoformat()
            }
            todos.insert(0, new_todo)
            existing_texts.add(title)
            updated = True
            
    if updated:
        save_todo_data(todos)

@eel.expose
def get_user_stats():
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                stats = json.load(f)
        except:
            stats = init_user_stats()
    else:
        stats = init_user_stats()
        
    last_lifestyle_sync_date = stats.get("last_lifestyle_sync_date")
    stats = process_daily_quests(stats)
    stats = update_streak(stats)
    
    from datetime import datetime
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Đồng bộ hóa nếu hôm nay chưa từng đồng bộ nhiệm vụ Nhật Tu sang Todo List
    if last_lifestyle_sync_date != today_str:
        try:
            sync_lifestyle_quests_to_todo(stats)
            stats["last_lifestyle_sync_date"] = today_str
        except Exception as e:
            print(f"Lỗi đồng bộ nhiệm vụ Nhật Tu sang Todo: {e}")
        
    level, xp_in_level, xp_needed = calculate_level(stats.get("xp", 0))
    stats["level"] = level
    stats["xp_in_level"] = xp_in_level
    stats["xp_needed"] = xp_needed
    
    # Lưu lại để cập nhật ngày hoặc quest
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
    except: pass
    
    return stats

@eel.expose
def import_ambient_sound(sound_name, base64_data):
    """Lưu tệp âm thanh bế quan MP3 từ base64 gửi từ frontend vào thư mục data/ambient/"""
    allowed_sounds = ["rain", "stream", "campfire", "wind"]
    if sound_name not in allowed_sounds:
        return {"status": "error", "msg": "Tên âm thanh không hợp lệ!"}
        
    try:
        import base64
        ambient_dir = CONFIG_PATHS["ambient"]
        os.makedirs(ambient_dir, exist_ok=True)
        
        file_path = os.path.join(ambient_dir, f"{sound_name}.mp3")
        
        # Giải mã base64 và lưu thành file nhị phân
        file_bytes = base64.b64decode(base64_data)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@eel.expose
def check_ambient_sounds_status():
    """Kiểm tra xem đã nạp đủ 4 file âm thanh bế quan chưa"""
    allowed_sounds = ["rain", "stream", "campfire", "wind"]
    ambient_dir = CONFIG_PATHS["ambient"]
    if not os.path.exists(ambient_dir):
        return {"all_exist": False, "missing": allowed_sounds}
        
    missing = []
    for s in allowed_sounds:
        file_path = os.path.join(ambient_dir, f"{s}.mp3")
        if not os.path.exists(file_path):
            missing.append(s)
            
    return {
        "all_exist": len(missing) == 0,
        "missing": missing
    }

@eel.expose
def add_xp(amount, action_type="manual"):
    stats = get_user_stats()
    old_level = stats.get("level", 1)
    
    if amount < 0:
        # Negative XP (failure / penalty)
        stats["xp"] = max(0, stats.get("xp", 0) + amount)
    else:
        # Positive XP
        is_valid, stats = check_anti_spam(stats, action_type, daily_limit=10)
        if not is_valid:
            return stats  # Không cộng Tu vi nếu spam
            
        # Áp dụng nhân hệ số Khí Vận hàng ngày
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        if stats.get("last_fortune_date") == today:
            fortune = stats.get("current_fortune")
            if fortune and "multiplier" in fortune:
                amount = int(amount * fortune["multiplier"])
            
        final_amount = apply_streak_multiplier(amount, stats.get("streak_days", 1))
        stats["xp"] = stats.get("xp", 0) + final_amount
    
    level, xp_in_level, xp_needed = calculate_level(stats["xp"])
    stats["level"] = level
    stats["xp_in_level"] = xp_in_level
    stats["xp_needed"] = xp_needed
    
    if level > old_level:
        stats["just_leveled_up"] = True
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
        return stats
    except: return stats

@eel.expose
def clear_level_up_flag():
    stats = get_user_stats()
    if "just_leveled_up" in stats:
        del stats["just_leveled_up"]
        file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=4)
        except: pass
    return stats

@eel.expose
def force_reset_quests():
    stats = get_user_stats()
    stats["last_quest_date"] = ""
    stats["last_week_date"] = ""
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
    except: pass
    return get_user_stats()

@eel.expose
def add_todo_xp(days_before_deadline, rank="B", quest_id=None):
    """Tính XP cho việc hoàn thành Todo dựa trên Giai cấp và Deadline"""
    ranks_config = {
        "C": {"base": 5, "bonus": 2},
        "B": {"base": 15, "bonus": 5},
        "A": {"base": 40, "bonus": 10},
        "S": {"base": 100, "bonus": 20}
    }
    
    cfg = ranks_config.get(rank, ranks_config["B"])
    base_xp = cfg["base"]
    bonus = max(0, days_before_deadline * cfg["bonus"])
    total_xp = base_xp + bonus
    
    stats = get_user_stats()
    stats["completed_tasks_count"] = stats.get("completed_tasks_count", 0) + 1
    
    # Đồng bộ hóa hoàn thành quest Nhật Tu tương ứng
    if quest_id:
        stats = update_quest_progress(stats, quest_id, 1)
    
    # Cập nhật Quest Combo Pomo+Todo
    if "action_counts" not in stats:
        stats["action_counts"] = {}
        
    if not stats["action_counts"].get("combo_todo_done", False):
        stats["action_counts"]["combo_todo_done"] = True
        stats = update_quest_progress(stats, "combo_pomo_todo", 1)
        
    # Cập nhật Quest Tuần
    stats = update_quest_progress(stats, "week_todo_15", 1)
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
    except: pass
    
    # Sau khi lưu tiến trình, gọi add_xp
    return add_xp(total_xp, action_type="todo")

@eel.expose
def record_english_study():
    """Ghi nhận tiến trình học English vào hệ thống Quest"""
    stats = get_user_stats()
    stats = update_quest_progress(stats, "english_10", 1)
    stats = update_quest_progress(stats, "week_eng_50", 1)
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
    except: pass
    return stats

@eel.expose
def add_pomo_xp(amount):
    """Tính Tu vi cho Pomodoro và update combo"""
    stats = get_user_stats()
    
    if "action_counts" not in stats:
        stats["action_counts"] = {}
        
    if not stats["action_counts"].get("combo_pomo_done", False):
        stats["action_counts"]["combo_pomo_done"] = True
        stats = update_quest_progress(stats, "combo_pomo_todo", 1)
        
    stats = update_quest_progress(stats, "week_pomo_10", 1)
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
    except: pass
    
    return add_xp(amount, action_type="pomodoro")

@eel.expose
def update_quest(quest_id, amount=1):
    stats = get_user_stats()
    stats = update_quest_progress(stats, quest_id, amount)
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4)
    except: pass
    return stats

@eel.expose
def claim_quest_reward(quest_id):
    stats = get_user_stats()
    quest = None
    
    if "daily_quests" in stats and quest_id in stats["daily_quests"]:
        quest = stats["daily_quests"][quest_id]
    elif "weekly_quests" in stats and quest_id in stats["weekly_quests"]:
        quest = stats["weekly_quests"][quest_id]
        
    if quest and quest["progress"] >= quest["goal"] and not quest.get("claimed", False):
        quest["claimed"] = True
        
        # Lưu stats trước khi gọi add_xp để tránh lỗi đè dữ liệu
        file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=4)
        except: pass
        
        # Cộng XP phần thưởng
        return add_xp(quest["reward"], action_type="claim_quest")
            
    return stats

@eel.expose
def get_dashboard_data():
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 1. Lấy thời gian tập trung hôm nay
    focus_stats = get_focus_data()["stats"]
    today_focus = focus_stats.get("daily_history", {}).get(today, 0)
    
    # 2. Lấy số lượng task chưa xong
    todos = get_todo_data()
    pending_tasks = len([t for t in todos if not t.get("completed", False)])
    
    # 3. Lấy thông tin user (XP/Level)
    user_stats = get_user_stats()
    
    return {
        "focus_time": today_focus,
        "pending_tasks": pending_tasks,
        "user": user_stats,
        "today": today
    }

@eel.expose
def get_weather():
    # Placeholder: Có thể tích hợp API thật nếu cần (ví dụ OpenWeatherMap)
    # Tạm thời trả về dummy data hoặc chỉ logic đơn giản
    return {"temp": 28, "desc": "Nắng nhẹ", "city": "Hồ Chí Minh"}

@eel.expose
def focus_start_timer():
    focus_backend.start()

@eel.expose
def focus_pause_timer():
    focus_backend.pause()

@eel.expose
def focus_reset_timer():
    focus_backend.reset()

@eel.expose
def trigger_focus_notification(title, message):
    # Sử dụng resource_path để lấy icon nằm trong gói build
    icon_path = resource_path("web/icon.png")
    notifier_backend.send_toast(title, message, icon_path)

import pystray
from PIL import Image, ImageDraw, ImageOps
import sys

# Biến trạng thái để kiểm soát cửa sổ tránh mở nhiều tab trùng lặp
# Đã được định nghĩa ở đầu file để đồng bộ

def get_icon_image():
    try:
        base_path = os.path.dirname(os.path.abspath(__file__)) if not getattr(sys, 'frozen', False) else sys._MEIPASS
        icon_path = os.path.join(base_path, 'web', 'icon.png')
        if not os.path.exists(icon_path):
            raise FileNotFoundError()
            
        img = Image.open(icon_path).convert("RGBA")
        # Ép khung hình vuông chuẩn 256x256, giữ tỷ lệ gốc, khoảng trống sẽ dán nền trong suốt
        img = ImageOps.pad(img, (256, 256), color=(0, 0, 0, 0))
        return img
    except Exception as e:
        print("Sử dụng icon dự phòng do lỗi:", e)
        # Fallback to auto-generated icon if image is missing or invalid
        image = Image.new('RGB', (64, 64), color=(59, 130, 246))
        d = ImageDraw.Draw(image)
        d.text((15, 25), "HUB", fill=(255,255,255))
        return image

def on_show(icon, item):
    global is_window_open
    if not is_window_open:
        try:
            eel.show('index.html')
            is_window_open = True
        except Exception as e:
            print("Lỗi bật cửa sổ:", e)

def on_quit(icon, item):
    icon.stop()
    audio_backend.stop()
    notifier_backend.stop()
    os._exit(0)

# --- THIÊN ĐẠO BẢNG: ACHIEVEMENTS SYSTEM ---
def check_achievements():
    achievements = []
    
    # 1. Khổ tu sĩ (>= 100 focus hours)
    focus_file = os.path.join(CONFIG_PATHS["focus_data"], 'stats.json')
    total_mins = 0
    if os.path.exists(focus_file):
        try:
            with open(focus_file, 'r', encoding='utf-8') as f:
                focus_data = json.load(f)
                total_mins = focus_data.get("total_minutes", 0)
        except: pass
    
    achievements.append({
        "id": "kho_tu_si",
        "title": "Khổ Tu Sĩ",
        "desc": "Bế quan tu luyện đạt 100 giờ tập trung tích lũy",
        "progress": total_mins,
        "goal": 6000,
        "unit": "phút",
        "unlocked": total_mins >= 6000,
        "icon": "⏳"
    })
        
    # 2. Học giả (>= 500 level 5 vocabulary cards in TOEIC)
    vocal_file = os.path.join(CONFIG_PATHS["user_data"], 'toeic_vocal.json')
    grammar_file = os.path.join(CONFIG_PATHS["user_data"], 'toeic_grammar.json')
    
    def count_lvl5(file_p):
        if os.path.exists(file_p):
            try:
                with open(file_p, 'r', encoding='utf-8') as f:
                    items = json.load(f)
                    return len([item for item in items if item.get("srs_level", 0) == 5])
            except: pass
        return 0
        
    mastered_count = count_lvl5(vocal_file) + count_lvl5(grammar_file)
    
    achievements.append({
        "id": "hoc_gia",
        "title": "Học Giả",
        "desc": "Thăng cấp 500 bí kíp lên Xuất Thần Nhập Hóa",
        "progress": mastered_count,
        "goal": 500,
        "unit": "bí kíp",
        "unlocked": mastered_count >= 500,
        "icon": "📚"
    })
        
    # 3. Diệt Yêu Sư (>= 50 completed tasks)
    user_file = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    completed_tasks = 0
    if os.path.exists(user_file):
        try:
            with open(user_file, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
                completed_tasks = user_data.get("completed_tasks_count", 0)
        except: pass
        
    achievements.append({
        "id": "diet_yeu_su",
        "title": "Diệt Yêu Sư",
        "desc": "Sát trừ 50 Nhiệm vụ tông môn",
        "progress": completed_tasks,
        "goal": 50,
        "unit": "nhiệm vụ",
        "unlocked": completed_tasks >= 50,
        "icon": "⚔️"
    })
        
    return achievements

@eel.expose
def get_achievements():
    return check_achievements()

@eel.expose
def roll_daily_fortune():
    import random
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    
    stats = get_user_stats()
    
    if stats.get("last_fortune_date") == today:
        return {
            "success": False,
            "message": "Hôm nay đạo hữu đã gieo quẻ rồi!",
            "fortune": stats.get("current_fortune")
        }
        
    fortunes = [
        {
            "id": "super_luck",
            "title": "Thượng Thượng Cát",
            "desc": "Khí vận hanh thông, linh khí dồi dào! Hôm nay nhận thêm +30% Tu vi từ tất cả hoạt động.",
            "multiplier": 1.3,
            "icon": "🌟",
            "color": "#eab308"
        },
        {
            "id": "great_luck",
            "title": "Đại Cát",
            "desc": "Vận thế cát tường, vạn sự thuận lợi! Hôm nay nhận thêm +15% Tu vi từ tất cả hoạt động.",
            "multiplier": 1.15,
            "icon": "🍀",
            "color": "#22c55e"
        },
        {
            "id": "medium_luck",
            "title": "Trung Cát",
            "desc": "Bình thường tĩnh lặng, tâm cảnh an ổn. Hôm nay nhận thêm +5% Tu vi.",
            "multiplier": 1.05,
            "icon": "🌾",
            "color": "#3b82f6"
        },
        {
            "id": "bad_luck",
            "title": "Tiểu Hung",
            "desc": "Tâm ma rục rịch, thử thách ý chí! Khí vận bình thường nhưng rèn luyện kiên nhẫn (+0% Tu vi).",
            "multiplier": 1.0,
            "icon": "💀",
            "color": "#ef4444"
        }
    ]
    
    weights = [10, 30, 45, 15]
    rolled_fortune = random.choices(fortunes, weights=weights, k=1)[0]
    
    stats["last_fortune_date"] = today
    stats["current_fortune"] = rolled_fortune
    
    file_path = os.path.join(CONFIG_PATHS["user_data"], 'stats.json')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=4, ensure_ascii=False)
    except: pass
    
    return {
        "success": True,
        "message": f"Chúc mừng đạo hữu nhận được quẻ: {rolled_fortune['title']}",
        "fortune": rolled_fortune
    }

def setup_tray():
    menu = pystray.Menu(
        pystray.MenuItem("Mở Frogress", on_show, default=True),
        pystray.MenuItem("Thoát", on_quit)
    )
    icon = pystray.Icon("frogress", get_icon_image(), "Frogress", menu)
    icon.run_detached()

def on_close_window(page, websockets):
    global is_window_open
    is_window_open = False
    print("Cửa sổ đã tắt, tiếp tục chạy ngầm...")
    # Lệnh pass không cần thiết nhưng có thể giữ lại để logic không rỗng
    pass

import urllib.request
import webbrowser

@eel.expose
def check_for_updates():
    """Kiểm tra bản cập nhật mới từ URL cấu hình"""
    try:
        from config import CURRENT_VERSION, UPDATE_URL
        if not UPDATE_URL:
            return {"status": "no_url"}
            
        req = urllib.request.Request(
            UPDATE_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        # Timeout 3 giây tránh treo giao diện nếu mạng chậm
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode('utf-8'))
            latest_version = data.get("version", "1.0")
            download_url = data.get("download_url", "")
            changelog = data.get("changelog", "")
            
            # So sánh phiên bản dạng chuỗi số
            try:
                is_new = float(latest_version) > float(CURRENT_VERSION)
            except:
                is_new = latest_version != CURRENT_VERSION
                
            return {
                "status": "success",
                "is_new": is_new,
                "current_version": CURRENT_VERSION,
                "latest_version": latest_version,
                "download_url": download_url,
                "changelog": changelog
            }
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@eel.expose
def open_update_url(url):
    """Mở trình duyệt truy cập đường link tải bản cập nhật"""
    if url:
        try:
            webbrowser.open(url)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "msg": str(e)}
    return {"status": "error", "msg": "No URL specified"}

if __name__ == "__main__":
    # Khởi chạy System Tray
    setup_tray()
    
    # Đánh dấu cửa sổ sắp mở
    is_window_open = True
    
    # Chạy vòng lặp timer bằng gevent
    import gevent
    gevent.spawn(focus_backend._run_timer_loop)

    # Chạy Eel không block vòng lặp để ta có thể duy trì app
    eel.start('index.html', size=(1280, 800), port=0, block=False, close_callback=on_close_window)
    
    # Vòng lặp giữ process mãi mãi
    try:
        while True:
            eel.sleep(1.0)
    except (KeyboardInterrupt, SystemExit):
        print("\nĐang tắt hệ thống Frogress một cách an toàn...")
        os._exit(0)