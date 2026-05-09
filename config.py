import os
import sys

# Xử lý định vị thư mục BASE_DIR để lưu trữ dữ liệu (Data)
if getattr(sys, 'frozen', False):
    # Nếu đang chạy từ file .exe: Lưu vào thư mục Roaming AppData để đảm bảo quyền ghi (Write Permission)
    # Tránh lỗi PermissionError: [WinError 5] Access is denied khi để exe ở folder bảo mật
    appdata_path = os.environ.get('APPDATA')
    if not appdata_path:
        appdata_path = os.path.expanduser('~')
    BASE_DIR = os.path.join(appdata_path, "Frogress")
    
    # Logic di chuyển dữ liệu từ tên cũ (TricoinHub) sang tên mới (Frogress)
    OLD_BASE_DIR = os.path.join(appdata_path, "TricoinHub")
    if os.path.exists(OLD_BASE_DIR) and not os.path.exists(BASE_DIR):
        try:
            import shutil
            shutil.move(OLD_BASE_DIR, BASE_DIR)
            print(f"[*] Đã di chuyển dữ liệu từ {OLD_BASE_DIR} sang {BASE_DIR}")
        except Exception as e:
            print(f"[!] Lỗi di chuyển dữ liệu: {e}")
else:
    # Nếu chạy script Python thông thường: Lưu tại thư mục chứa code
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Các cấu hình đường dẫn tuyệt đối cho ứng dụng
CONFIG_PATHS = {
    "data_root": os.path.join(BASE_DIR, "data"),
    "toeic_data": os.path.join(BASE_DIR, "data", "toeic_reminder"),
    "threads_data": os.path.join(BASE_DIR, "data", "threads_filter"),
    "yt_downloads": os.path.join(BASE_DIR, "data", "downloads"),
    "yt_thumbnails": os.path.join(BASE_DIR, "data", "thumbnails"),
    "video_downloads": os.path.join(BASE_DIR, "data", "video_downloads"),
    "todolist_data": os.path.join(BASE_DIR, "data", "todolist"),
    "notes_data": os.path.join(BASE_DIR, "data", "notes"),
    "focus_data": os.path.join(BASE_DIR, "data", "focus"),
    "notifier_data": os.path.join(BASE_DIR, "data"), # Thêm này để notifier dùng chung
    "user_data": os.path.join(BASE_DIR, "data", "user"),
    "ambient": os.path.join(BASE_DIR, "data", "ambient")
}

# Đảm bảo các thư mục luôn tồn tại
if not os.path.exists(BASE_DIR):
    os.makedirs(BASE_DIR, exist_ok=True)

for path in CONFIG_PATHS.values():
    os.makedirs(path, exist_ok=True)

# Copy dữ liệu mẫu (Pre-existing data) từ thư mục gốc cài đặt vào AppData ở lần chạy đầu tiên
if getattr(sys, 'frozen', False):
    import shutil
    try:
        bundled_data_dir = os.path.join(sys._MEIPASS, "data")
    except Exception:
        bundled_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
        
    target_data_dir = CONFIG_PATHS["data_root"]
    
    if os.path.exists(bundled_data_dir):
        for root, dirs, files in os.walk(bundled_data_dir):
            for file in files:
                src_file = os.path.join(root, file)
                rel_path = os.path.relpath(src_file, bundled_data_dir)
                dst_file = os.path.join(target_data_dir, rel_path)
                
                # Chỉ copy nếu file bên AppData chưa tồn tại (không đè dữ liệu cũ của user)
                if not os.path.exists(dst_file):
                    os.makedirs(os.path.dirname(dst_file), exist_ok=True)
                    try:
                        shutil.copy2(src_file, dst_file)
                    except Exception as e:
                        pass
# Cấu hình phiên bản và đường dẫn cập nhật tự động
CURRENT_VERSION = "1.2"
UPDATE_URL = "https://raw.githubusercontent.com/fate1105/frogress/main/version.json"
