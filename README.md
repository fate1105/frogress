# 🐸 Frogress - Personal Utilities Hub & Cultivation Pomodoro

[![Python Version](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-standalone--exe-brightgreen.svg)](#-đóng-gói-ứng-dụng-build-standalone)

**Frogress** (kết hợp giữa **Frog** - chú ếch tu tiên và **Progress** - tiến trình tu hành) là một ứng dụng Desktop đắc lực giúp đạo hữu quản lý công việc, rèn luyện thói quen hằng ngày và nâng cao năng suất làm việc kết hợp với hệ thống **Gamification phong cách Tu Tiên** độc đáo!

---

## 🌌 Các Module Tu Hành Cốt Lõi (Core Modules)

*   **⚡ Tu Luyện (Focus & Pomodoro - `focus`):**
    *   Hệ thống đếm giờ Pomodoro chuyên sâu tích hợp phát nhạc bế quan.
    *   Hệ thống nhập nhạc thủ công thông minh (Nạp âm thanh mưa rơi, tiếng suối, gió thổi, lửa trại)!
*   **📋 Nhiệm Vụ Tông Môn (Todolist & Daily Quests - `todolist`):**
    *   Quản lý danh sách việc cần làm (Todo-list) của đạo hữu.
    *   Tích hợp **3 nhiệm vụ thói quen lành mạnh mỗi ngày** (Uống đủ nước, Tập thể dục, Lập kế hoạch ngày mai...) với tiêu đề đời sống ngắn gọn, gần gũi.
    *   Cơ chế tự động xóa các nhiệm vụ thói quen chưa làm của ngày cũ khi bắt đầu một ngày mới.
*   **📖 Tàng Kinh Các (Notes Manager - `notes`):**
    *   Nơi đạo hữu ghi chép nhanh ý tưởng, ghi chú cá nhân và các kế hoạch tu luyện dài hạn.
*   **🔤 Ngoại Ngữ Chân Kinh (TOEIC Vocab Practice - `toeic`):**
    *   Rèn luyện và học từ vựng ngẫu nhiên giúp đạo hữu đột phá trình độ ngoại ngữ.
*   **🐸 Tu Hành Lục (Profile & Stats - `profile`):**
    *   Ghi nhận toàn bộ thành quả tu luyện của đạo hữu.
    *   Tích lũy Tu Vi khi hoàn thành nhiệm vụ để đột phá cảnh giới (từ *Ếch Tụ Khí* đột phá lên tới *Ếch Phi Thăng*, *Ếch Chân Tiên*).
    *   Hiệu ứng pháo hoa chúc mừng đột phá lung linh huyền ảo.
*   **🎵 Linh Âm Động (Music & YouTube Downloader - `youtube`):**
    *   Quản lý danh sách nhạc tu luyện cá nhân.
    *   Hỗ trợ tải và trích xuất nhạc từ YouTube tốc độ cao, tự động lấy ảnh bìa album và điền đầy đủ metadata.
    *   *Đặc biệt:* Luồng tải chạy ẩn hoàn toàn cửa sổ dòng lệnh CMD trên Windows, mang lại trải nghiệm mượt mà không tì vết.
*   **✉️ Linh Hạc Truyền Tin (System Reminders - `reminders`):**
    *   Hệ thống nhắc nhở thông minh qua thông báo hệ thống Windows (Windows Toast Notifications).
*   **📦 Vạn Bảo Khố (Universal Downloader - `omniloader`):**
    *   Công cụ hỗ trợ tải tệp đa năng, tiện ích phong phú.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

*   **Backend:** Python + `Eel` (Cầu nối giao tiếp hai chiều Python <-> JS).
*   **Frontend:** HTML5 + CSS3 (Vanilla CSS Custom) + TailwindCSS (Giao diện Responsive cao cấp, hỗ trợ Dark Mode).
*   **Tiến trình phụ:** `ffmpeg` & `ffprobe` xử lý dữ liệu âm thanh đa luồng.
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
    *   Tự động khởi tạo một môi trường ảo (Virtual Environment) sạch sẽ.
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

---

## 🕊️ Thông Tin Dự Án (Project Info)

*   **Tác giả (Author):** **Fate**
*   **Triết lý phát triển (Methodology):** ⚡ **Vibe Coding** — Được đồng kiến tạo bằng sự hợp tác mượt mà và bứt phá giữa trí tuệ con người và trí tuệ nhân tạo (AI Assistant), giúp biến các ý tưởng sáng tạo độc đáo thành sản phẩm hữu hình trong thời gian ngắn nhất.
*   **Mục đích phát triển (Purpose):** Dự án được xây dựng hoàn toàn vì đam mê học tập, rèn luyện thói quen nâng cao năng suất cá nhân và **không nhằm mục đích thương mại** (Non-commercial). Tác giả chia sẻ công khai và miễn phí tới cộng đồng đồng đạo hữu tu tiên! 🌌✨

