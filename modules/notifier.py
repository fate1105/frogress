import os
import json
import gevent
import sys
from datetime import datetime, timedelta
from winotify import Notification
from config import CONFIG_PATHS

TODO_FILE = os.path.join(CONFIG_PATHS["todolist_data"], "todos.json")
REMINDERS_FILE = os.path.join(CONFIG_PATHS["notifier_data"], "reminders.json")
LOG_FILE = os.path.join(CONFIG_PATHS["notifier_data"], "notifier.log")

def resource_path(relative_path):
    """ Lấy đường dẫn tuyệt đối đến tài nguyên, hỗ trợ cả môi trường dev và PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        # Nếu không phải frozen, lùi lại 1 cấp vì notifier.py nằm trong thư mục modules/
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, relative_path)

def _log(message):
    """ Ghi log ra file để debug trong môi trường chạy ẩn (.exe) """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {message}\n")
    except:
        pass

class NotifierBackend:
    def __init__(self):
        self.is_running = False
        self._thread = None
        
        self._last_todo_date = None
        self._todo_notified_14 = False
        self._todo_notified_21 = False
        
        _log("--- Khởi tạo Notifier Backend ---")
        self._init_data()

    def _init_data(self):
        if not os.path.exists(REMINDERS_FILE):
            try:
                _log(f"Tạo mới file reminders tại: {REMINDERS_FILE}")
                with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
                    json.dump([], f)
            except Exception as e:
                _log(f"Lỗi khởi tạo Reminders file: {e}")

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._thread = gevent.spawn(self._monitor_loop)
            _log("Đã bắt đầu thread monitor.")
            
    def stop(self):
        self.is_running = False
        if self._thread:
            self._thread.kill()
            _log("Đã dừng thread monitor.")
            
    def send_toast(self, title, msg, icon_url=None):
        _log(f"Gửi Toast: {title} - {msg}")
        try:
            abs_icon = None
            if icon_url:
                if os.path.isabs(icon_url):
                    abs_icon = icon_url
                else:
                    abs_icon = os.path.abspath(icon_url)
            
            if abs_icon and not os.path.exists(abs_icon):
                _log(f"Cảnh báo: Không tìm thấy icon tại {abs_icon}")
                abs_icon = None

            toast = Notification(
                app_id="Frogress",
                title=title,
                msg=msg,
                duration="short",
                icon=abs_icon
            )
            toast.show()
            _log("Toast đã hiển thị thành công.")
        except Exception as e:
            _log(f"Lỗi khi gửi Toast: {e}")

    def _monitor_loop(self):
        _log("Monitor loop bắt đầu chạy...")
        app_icon_path = resource_path("web/icon.png")
        if not os.path.exists(app_icon_path):
            _log(f"Cảnh báo: Không tìm thấy icon chính tại {app_icon_path}")
            app_icon_path = None
        else:
            _log(f"Đã xác định icon tại: {app_icon_path}")
            
        gevent.sleep(5) 
        self._check_todos(app_icon_path)

        while self.is_running:
            try:
                now = datetime.now()
                current_date = now.date()
                
                if self._last_todo_date != current_date:
                    self._todo_notified_14 = False
                    self._todo_notified_21 = False
                    self._last_todo_date = current_date
                
                if now.hour == 14 and not self._todo_notified_14:
                    self._check_todos(app_icon_path)
                    self._todo_notified_14 = True
                    
                if now.hour == 21 and not self._todo_notified_21:
                    self._check_todos(app_icon_path)
                    self._todo_notified_21 = True
                
                self._check_custom_reminders(app_icon_path)
            except Exception as e:
                _log(f"Lỗi trong vòng lặp monitor: {e}")
            
            gevent.sleep(30)

    def _check_todos(self, app_icon):
        if not os.path.exists(TODO_FILE):
            return
        try:
            with open(TODO_FILE, "r", encoding="utf-8") as f:
                todos = json.load(f)
        except Exception as e:
            _log(f"Lỗi đọc file Todo: {e}")
            return
            
        today = datetime.now()
        today_str = today.strftime("%Y-%m-%d")
        tomorrow = today + timedelta(days=1)
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")
        
        due_tasks = 0
        overdue_tasks = 0
        tomorrow_tasks = 0
        
        for t in todos:
            if t.get("completed"):
                continue
            dl = t.get("deadline")
            if not dl:
                continue
            
            if dl == today_str:
                due_tasks += 1
            elif dl == tomorrow_str:
                tomorrow_tasks += 1
            elif dl < today_str:
                overdue_tasks += 1
                
        if due_tasks > 0 or overdue_tasks > 0 or tomorrow_tasks > 0:
            msg = []
            if overdue_tasks > 0:
                msg.append(f"Quá hạn: {overdue_tasks} việc")
            if due_tasks > 0:
                msg.append(f"Hôm nay: {due_tasks} việc")
            if tomorrow_tasks > 0:
                msg.append(f"Ngày mai: {tomorrow_tasks} việc")
                
            self.send_toast("Nhiệm vụ TodoList", " | ".join(msg), app_icon)

    def _check_custom_reminders(self, app_icon):
        if not os.path.exists(REMINDERS_FILE):
            return
        try:
            with open(REMINDERS_FILE, "r", encoding="utf-8") as f:
                rems = json.load(f)
        except Exception as e:
            _log(f"Lỗi đọc file Reminders: {e}")
            return
            
        now = datetime.now()
        needs_save = False
        
        for r in rems:
            if not r.get("is_active"):
                continue
            
            interval_mins = int(r.get("interval_minutes", 60))
            if interval_mins <= 0:
                continue
                
            last_triggered_str = r.get("last_triggered")
            
            trigger_now = False
            if not last_triggered_str:
                _log(f"Phát hiện nhắc nhở mới: {r.get('title')}, kích hoạt lần đầu.")
                trigger_now = True
            else:
                try:
                    last_dt = datetime.fromisoformat(last_triggered_str)
                    if now >= last_dt + timedelta(minutes=interval_mins):
                        trigger_now = True
                except:
                    trigger_now = True

            if trigger_now:
                title = r.get('title', 'Nhắc nhở')
                message = r.get('message', '')
                _log(f"Kích hoạt nhắc nhở: {title}")
                self.send_toast(title, message, app_icon)
                
                r["last_triggered"] = now.isoformat()
                needs_save = True
                
        if needs_save:
            try:
                with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
                    json.dump(rems, f, ensure_ascii=False, indent=2)
            except Exception as e:
                _log(f"Lỗi lưu file Reminders: {e}")
