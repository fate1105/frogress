# 🐸 Frogress - Personal Utilities Hub & Cultivation Pomodoro

[![Python Version](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-standalone--exe-brightgreen.svg)](#-đóng-gói-ứng-dụng-build-standalone)

**Frogress** (kết hợp giữa **Frog** - chú ếch tu tiên và **Progress** - tiến trình tu hành) là một ứng dụng Desktop đắc lực giúp đạo hữu quản lý công việc, rèn luyện thói quen hằng ngày và nâng cao năng suất làm việc kết hợp với hệ thống **Gamification phong cách Tu Tiên** độc đáo!

---

## 🌌 Các Tính Năng Cốt Lõi (Core Features)

*   **⚡ Linh Âm Động (Ambient Focus):** 
    *   Hệ thống Pomodoro chuyên sâu tích hợp phát nhạc bế quan.
    *   Giao diện nhập nhạc thủ công thông minh (nạp âm thanh mưa rơi, tiếng suối, gió thổi, lửa trại) giúp giảm dung lượng file đóng gói từ **1.2GB xuống chỉ còn 30MB**!
*   **🐸 Hệ Thống Đột Phá Cảnh Giới (Gamification):**
    *   Tích lũy Tu Vi khi hoàn thành nhiệm vụ để đột phá cảnh giới (từ *Ếch Tụ Khí* lên tới *Ếch Phi Thăng*, *Ếch Chân Tiên*).
    *   Hiệu ứng pháo hoa chúc mừng đột phá lung linh huyền ảo.
*   **📋 Nhật Nhiệm Bảng (Daily Quests):**
    *   Mỗi ngày tự động lựa chọn ngẫu nhiên **3 nhiệm vụ thói quen lành mạnh** (Uống đủ nước, Tập thể dục, Học tiếng Anh...).
    *   Cơ chế tự động dọn dẹp các nhiệm vụ chưa hoàn thành của ngày cũ khi sang ngày mới, giữ bảng nhiệm vụ luôn mới mẻ.
*   **📥 Linh Âm Các (YouTube Downloader):**
    *   Tải nhạc và video từ YouTube tốc độ cao.
    *   Tự động trích xuất ảnh bìa và metadata đầy đủ.
    *   Chạy ngầm luồng con ẩn hoàn toàn cửa sổ CMD dòng lệnh trên Windows, mang lại trải nghiệm mượt mà không tì vết.
*   **📖 Tông Môn Tàng Thư (Notes & Todolist):**
    *   Ghi chép nhanh ý tưởng, kế hoạch tu luyện.
    *   Quản lý danh sách việc cần làm (Todo-list) khoa học.
*   **📣 Anh Ngữ Tiên Đài (English Reminder):**
    *   Hệ thống học từ vựng TOEIC/IELTS ngẫu nhiên, nhắc nhở thông minh qua thông báo hệ thống Windows (Windows Toast Notifications).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

*   **Backend:** Python + `Eel` (Cầu nối giao tiếp hai chiều Python <-> JS).
*   **Frontend:** HTML5 + CSS3 (Vanilla CSS Custom) + TailwindCSS (giao diện Responsive cao cấp, hỗ trợ Dark Mode tối ưu).
*   **Tiến trình phụ:** `ffmpeg` & `ffprobe` xử lý âm thanh đa luồng.
*   **Đóng gói:** `PyInstaller` tối ưu hóa môi trường ảo sạch.

---

## 🚀 Hướng Dẫn Chạy Dự Án Từ Nguồn (Local Development)

### 📋 Yêu cầu hệ thống:
*   Đã cài đặt **Python 3.10** trở lên.
*   Đã cài đặt công cụ **FFmpeg** trong biến môi trường hệ thống (để chạy trình tải nhạc YouTube).

### 🏃 Các bước khởi chạy:
1.  **Cài đặt thư viện bắt buộc:**
    ```powershell
    pip install -r requirements.txt
    ```
2.  **Chạy ứng dụng:**
    ```powershell
    python hub_eel.py
    ```

---

## 📦 Đóng Gói Ứng Dụng (Build Standalone EXE)

Để đóng gói ứng dụng thành một tệp `.exe` độc lập siêu nhẹ mà không cần cài đặt Python trên máy người dùng cuối:

1.  Đơn giản chỉ cần **nhấp đúp** vào file shortcut đóng gói tự động:
    ```powershell
    .\build_app.cmd
    ```
2.  **Cơ chế hoạt động của trình đóng gói thông minh:**
    *   Tự động khởi tạo một môi trường ảo (Virtual Environment) hoàn toàn độc lập và sạch sẽ.
    *   Chỉ tải những thư viện tối thiểu cần thiết để vận hành ứng dụng (giảm dung lượng file xuất ra xuống mức tối đa).
    *   Nén toàn bộ thư mục ứng dụng thành file ZIP phân phối nằm trong thư mục `/dist` có tên dạng `Frogress_v1.x_Release.zip`.
    *   Người dùng cuối chỉ cần giải nén file ZIP này và chạy tệp `Frogress.exe` là có thể tu tiên ngay lập tức!

---

## 📣 Hệ Thống Đột Phá Phiên Bản (Auto-Update System)

Dự án tích hợp cơ chế tự động kiểm tra phiên bản mới từ đám mây (GitHub) mỗi khi khởi động:

*   **Tệp phiên bản:** Cấu trúc [version.json](version.json) đặt tại thư mục gốc của Repo.
*   **Cách thức cập nhật:** Khi đạo hữu thay đổi số phiên bản và đẩy lên kho lưu trữ GitHub công khai, ứng dụng của người dùng sẽ tự động bắt lấy bản nâng cấp, hiển thị hộp thoại Đột phá Phiên bản kèm theo Nhật ký cập nhật trực quan và nút tải nhanh chỉ với một lượt click chuột!

---

Chúc đạo hữu sớm ngày đắc đạo thành tiên trên con đường làm chủ năng suất cùng **Frogress**! 🐸✨⚔️
