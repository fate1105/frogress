import yt_dlp
import os
import concurrent.futures
import eel

import sys
from config import CONFIG_PATHS

DOWNLOADS_DIR = CONFIG_PATHS["yt_downloads"]

def download_single_video(video_url):
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [
            {
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            },
            {
                'key': 'FFmpegMetadata',
                'add_metadata': True,
            },
            {
                'key': 'EmbedThumbnail',
            },
        ],
        'writethumbnail': True,
        'outtmpl': os.path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
        'quiet': True,
        'concurrent_fragment_downloads': 5,
        'noplaylist': True, 
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
    except Exception as e:
        # Trong thực tế có thể log chi tiết e ra terminal hoặc file
        print(f"Lỗi khi tải {video_url}: {e}")
        raise

def process_downloads(urls):
    if not os.path.exists(DOWNLOADS_DIR):
        os.makedirs(DOWNLOADS_DIR)

    total = len(urls)
    completed = 0
    
    # Bắn thông báo lên giao diện Web
    eel.update_ytb_progress(f"🚀 Đang tải {total} bài...", "blue")()

    # Tải song song 3 bài
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(download_single_video, url): url for url in urls}
        for future in concurrent.futures.as_completed(futures):
            url = futures[future]
            try:
                future.result()
                completed += 1
                eel.update_ytb_progress(f"🚀 Tiến độ: {completed}/{total}", "blue")()
            except Exception as exc:
                eel.update_ytb_progress(f"❌ Lỗi tải link: {url[:30]}...", "red")()

    if completed == total:
        eel.update_ytb_progress("✅ Xong! Hãy kiểm tra kho nhạc bên dưới.", "green")()
    else:
        eel.update_ytb_progress(f"⚠️ Hoàn thành {completed}/{total} bài, có lỗi một số link.", "yellow")()
    # Kích hoạt JS để tải lại danh sách nhạc mới
    eel.refresh_mp3_list()()

import subprocess
import json

THUMB_DIR = CONFIG_PATHS.get("yt_thumbnails")

def get_file_metadata(filename):
    file_path = os.path.join(DOWNLOADS_DIR, filename)
    thumb_name = filename.replace('.mp3', '.jpg')
    thumb_path = os.path.join(THUMB_DIR, thumb_name) if THUMB_DIR else None
    
    metadata = {
        'filename': filename,
        'title': filename.replace('.mp3', ''),
        'artist': 'Unknown Artist',
        'thumbnail': None,
        'duration': 0
    }
    
    try:
        # Lập cấu hình ẩn cửa sổ CMD trên Windows
        creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0

        # Lấy metadata bằng ffprobe
        cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', file_path]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', creationflags=creationflags)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            fmt = data.get('format', {})
            tags = fmt.get('tags', {})
            metadata['title'] = tags.get('title', metadata['title'])
            metadata['artist'] = tags.get('artist', metadata['artist'])
            try:
                metadata['duration'] = float(fmt.get('duration', 0))
            except:
                metadata['duration'] = 0
            
        # Trích xuất ảnh bìa nếu chưa có
        if thumb_path and not os.path.exists(thumb_path):
            if not os.path.exists(THUMB_DIR): os.makedirs(THUMB_DIR)
            # -n: không đè, -y: đè. Ở đây ta dùng -y để đảm bảo ảnh mới nhất
            cmd_thumb = ['ffmpeg', '-y', '-i', file_path, '-an', '-vcodec', 'copy', thumb_path]
            subprocess.run(cmd_thumb, capture_output=True, creationflags=creationflags)
            
        if thumb_path and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            metadata['thumbnail'] = thumb_name
    except Exception as e:
        pass
        
    return metadata

def get_downloaded_files():
    """Trả về danh sách file mp3 kèm metadata để hiển thị lên Hub"""
    if not os.path.exists(DOWNLOADS_DIR):
        return []
    
    mp3_files = [f for f in os.listdir(DOWNLOADS_DIR) if f.endswith('.mp3')]
    
    # Sử dụng ThreadPool để xử lý metadata nhanh hơn cho danh sách dài
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(get_file_metadata, mp3_files))
    
    return results