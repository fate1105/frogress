import os
import json
import re
import sys

def set_version(new_version):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Cập nhật version.json
    v_json = os.path.join(base_dir, 'version.json')
    try:
        with open(v_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data['version'] = new_version
        with open(v_json, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"[*] Cập nhật {v_json} thành công.")
    except Exception as e:
        print(f"[!] Lỗi khi cập nhật {v_json}: {e}")

    # 2. Cập nhật config.py
    config_py = os.path.join(base_dir, 'config.py')
    try:
        with open(config_py, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'CURRENT_VERSION\s*=\s*".*?"', f'CURRENT_VERSION = "{new_version}"', content)
        with open(config_py, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[*] Cập nhật {config_py} thành công.")
    except Exception as e:
        print(f"[!] Lỗi khi cập nhật {config_py}: {e}")

    # 3. Cập nhật build.py
    build_py = os.path.join(base_dir, 'build.py')
    try:
        with open(build_py, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'VERSION\s*=\s*".*?"', f'VERSION = "{new_version}"', content)
        with open(build_py, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[*] Cập nhật {build_py} thành công.")
    except Exception as e:
        print(f"[!] Lỗi khi cập nhật {build_py}: {e}")

    # 4. Cập nhật web/index.html
    index_html = os.path.join(base_dir, 'web', 'index.html')
    try:
        with open(index_html, 'r', encoding='utf-8') as f:
            content = f.read()
        # Thay thế <p class="text-sm text-dim font-bold mb-0.5">v1.3</p>
        content = re.sub(
            r'(<p class="text-sm text-dim font-bold mb-0.5">)v.*?(</p>)',
            rf'\g<1>v{new_version}\g<2>',
            content
        )
        with open(index_html, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[*] Cập nhật {index_html} thành công.")
    except Exception as e:
        print(f"[!] Lỗi khi cập nhật {index_html}: {e}")

if __name__ == "__main__":
    import sys
    
    # Sửa lỗi Unicode trên Windows Terminal
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
        
    if len(sys.argv) < 2:
        print("Sử dụng: python set_version.py <version_mới>")
        print("Ví dụ: python set_version.py 1.4")
        sys.exit(1)
    
    new_version = sys.argv[1]
    print(f"Đang đồng bộ version {new_version} cho toàn bộ project...\n")
    set_version(new_version)
    print(f"\n[+] Đã đồng bộ version {new_version} thành công ở tất cả các file!")
