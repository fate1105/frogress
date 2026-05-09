@echo off
echo ===========================================
echo Personal Utilities Hub - SMART BUILD SCRIPT
echo ===========================================

echo [1/3] Khoi tao Moi truong ao (Virtual Environment) de giam dung luong...
python -m venv build_env

echo [2/3] Dang cai dat cac thu vien vao moi truong sach...
call build_env\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo [3/3] Dang thuc thi dong goi ung dung...
echo Dung tat cua so nay. Chuyen sang che do tu dong tim duong dan Eel...
python build.py

echo.
echo Don dep moi truong...
deactivate
rmdir /S /Q build_env

pause
