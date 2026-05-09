import os
import eel
import PyInstaller.__main__
import sys

# --- CẤU HÌNH PHIÊN BẢN ---
VERSION = "1.2"
# --------------------------

def update_version_info(version_str):
    """Tự động đồng bộ số Version vào file version_info.txt"""
    import re
    # Chuyển "1.0" thành "1.0.0.0" và (1, 0, 0, 0)
    parts = version_str.split('.')
    while len(parts) < 4:
        parts.append('0')
    full_version = ".".join(parts)
    tuple_version = "(" + ", ".join(parts) + ")"
    
    v_file = 'version_info.txt'
    if not os.path.exists(v_file): return

    with open(v_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Thay thế các cụm version bằng Regex
    content = re.sub(r'filevers=\(\d+, \d+, \d+, \d+\)', f'filevers={tuple_version}', content)
    content = re.sub(r'prodvers=\(\d+, \d+, \d+, \d+\)', f'prodvers={tuple_version}', content)
    content = re.sub(r"u'FileVersion', u'[\d\.]+'", f"u'FileVersion', u'{full_version}'", content)
    content = re.sub(r"u'ProductVersion', u'[\d\.]+'", f"u'ProductVersion', u'{full_version}'", content)
    
    with open(v_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[*] Đã đồng bộ Version {full_version} vào version_info.txt")

if __name__ == "__main__":
    print("===========================================")
    print(f"Frogress v{VERSION} - Build Script")
    print("===========================================")
    
    # Đồng bộ version trước khi build
    update_version_info(VERSION)
    print("Building application with PyInstaller (Size Optimized)...")

    # Path to eel.js
    eel_js_path = os.path.join(os.path.dirname(eel.__file__), "eel.js")
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # PyInstaller arguments
    pyinstaller_args = [
        '--noconfirm',
        '--onedir',  # Build thành thư mục thay vì 1 file để tránh bị diệt virus xóa
        '--windowed',
        '--add-data=web;web',
        '--add-data=modules;modules',
        '--add-data=data/fate_data.json;data',
        '--add-data=data/lifestyle_quests.json;data',
        f'--add-data={eel_js_path};eel',
        '--name=Frogress',
        '--version-file=version_info.txt',
        '--clean',
        # Exclude heavy modules for smaller size
        '--exclude-module=matplotlib',
        '--exclude-module=numpy',
        '--exclude-module=pandas',
        '--exclude-module=scipy',
        '--exclude-module=tkinter',
        '--exclude-module=IPython',
        '--exclude-module=notebook',
        '--exclude-module=jedi',
        '--exclude-module=PyQt5',
        '--exclude-module=PySide2',
        '--exclude-module=PySide6',
        '--exclude-module=PyQt6',
    ]
    
    # Icon processing
    icon_path = os.path.join(base_dir, "web", "icon.png")
    if os.path.exists(icon_path):
        try:
            print("[*] Optimizing Icon for Windows...")
            from PIL import Image, ImageOps
            img = Image.open(icon_path).convert("RGBA")
            
            # Crop transparency
            alpha_channel = img.split()[-1]
            bbox = alpha_channel.getbbox()
            if bbox:
                img = img.crop(bbox)
            
            # Pad to square
            img = ImageOps.pad(img, (256, 256), color=(0,0,0,0))
            
            # Save as ICO
            ico_dest = os.path.join(base_dir, "web", "app_icon.ico")
            img.save(ico_dest, format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
            
            pyinstaller_args.append(f'--icon={ico_dest}')
        except Exception as e:
            print(f"Icon optimization skipped: {e}")
            pyinstaller_args.append(f'--icon={icon_path}')
        
    pyinstaller_args.append('hub_eel.py')
    
    print("[*] Running PyInstaller...")
    PyInstaller.__main__.run(pyinstaller_args)
    
    # Pack into ZIP for safe distribution
    import shutil
    dist_dir = os.path.join(base_dir, "dist")
    app_name = "Frogress"
    versioned_folder = f"Frogress_v{VERSION}"
    zip_path = os.path.join(dist_dir, f"Frogress_v{VERSION}_Release")
    
    print(f"\n[*] Đóng gói {versioned_folder} thành file ZIP...")
    try:
        source_dir = os.path.join(dist_dir, app_name)
        target_dir = os.path.join(dist_dir, versioned_folder)
        
        # Đổi tên thư mục thành bản có version
        if os.path.exists(source_dir):
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
            os.rename(source_dir, target_dir)
            
            # Nén thư mục đã đổi tên
            shutil.make_archive(zip_path, 'zip', root_dir=dist_dir, base_dir=versioned_folder)
            print(f"[*] Đã tạo file ZIP: {zip_path}.zip")
    except Exception as e:
        print(f"[!] Lỗi khi nén thư mục: {e}")

    print("===========================================")
    print("BUILD COMPLETE!")
    print("===========================================")
    
    print("===========================================")
    print(f"SUCCESS! Ứng dụng bản v{VERSION} đã sẵn sàng trong thư mục /dist.")
    print(f"--> HÃY GỬI FILE [{os.path.basename(zip_path)}.zip] CHO NGƯỜI DÙNG <--")
    print(f"Người dùng chỉ cần giải nén file ZIP và chạy Frogress.exe (trong thư mục {versioned_folder})")
    print("Điều này giúp chống bị Windows Defender xóa mất file.")
    print("===========================================")
