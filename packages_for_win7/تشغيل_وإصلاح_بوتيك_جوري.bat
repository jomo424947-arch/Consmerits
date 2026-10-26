@echo off
chcp 65001 >nul
title تشغيل وإصلاح برنامج بوتيك جوري - Windows 7
color 0A

echo ==============================================================
echo        أداة تشغيل وإصلاح برنامج بوتيك جوري لويندوز 7
echo ==============================================================
echo.

echo [1/3] فحص وإغلاق أي عمليات سابقة معلقة في الذاكرة...
taskkill /F /IM BoutiqueGouri.exe /T >nul 2>&1
taskkill /F /IM "Boutique Gouri - نظام بيع وجرد مستحضرات التجميل.exe" /T >nul 2>&1
taskkill /F /IM cosmetics-pos-system.exe /T >nul 2>&1
echo   -> تم تفريغ الذاكرة بنجاح.

echo.
echo [2/3] تنظيف الكاش الرسومي المؤقت (GPUCache)...
set USER_DATA=%APPDATA%\cosmetics-pos-system
if exist "%USER_DATA%\GPUCache" rd /s /q "%USER_DATA%\GPUCache" >nul 2>&1
if exist "%USER_DATA%\DawnCache" rd /s /q "%USER_DATA%\DawnCache" >nul 2>&1
if exist "%USER_DATA%\Code Cache" rd /s /q "%USER_DATA%\Code Cache" >nul 2>&1
if exist "%USER_DATA%\DawnGraphiteCache" rd /s /q "%USER_DATA%\DawnGraphiteCache" >nul 2>&1
if exist "%USER_DATA%\DawnWebGPUCache" rd /s /q "%USER_DATA%\DawnWebGPUCache" >nul 2>&1
if exist "%USER_DATA%\.session-active" del /f /q "%USER_DATA%\.session-active" >nul 2>&1
echo   -> تم تنظيف الكاش بنجاح.

echo.
echo [3/3] تشغيل البرنامج الآن...

set APP_PATH_1=%LOCALAPPDATA%\Programs\cosmetics-pos-system\BoutiqueGouri.exe
set APP_PATH_2=%LOCALAPPDATA%\Programs\cosmetics-pos-system\Boutique Gouri - نظام بيع وجرد مستحضرات التجميل.exe
set APP_PATH_3=C:\Program Files\cosmetics-pos-system\BoutiqueGouri.exe
set APP_PATH_4=C:\Program Files (x86)\cosmetics-pos-system\BoutiqueGouri.exe

if exist "%APP_PATH_1%" (
    start "" "%APP_PATH_1%" --disable-gpu --disable-gpu-shader-disk-cache --no-sandbox
    echo   -> تم تشغيل البرنامج بنجاح!
    timeout /t 3 >nul
    exit
)

if exist "%APP_PATH_2%" (
    start "" "%APP_PATH_2%" --disable-gpu --disable-gpu-shader-disk-cache --no-sandbox
    echo   -> تم تشغيل البرنامج بنجاح!
    timeout /t 3 >nul
    exit
)

if exist "%APP_PATH_3%" (
    start "" "%APP_PATH_3%" --disable-gpu --disable-gpu-shader-disk-cache --no-sandbox
    echo   -> تم تشغيل البرنامج بنجاح!
    timeout /t 3 >nul
    exit
)

if exist "%APP_PATH_4%" (
    start "" "%APP_PATH_4%" --disable-gpu --disable-gpu-shader-disk-cache --no-sandbox
    echo   -> تم تشغيل البرنامج بنجاح!
    timeout /t 3 >nul
    exit
)

echo   [تنبيه] لم يتم العثور على البرنامج في المسارات الافتراضية.
echo   يرجى تثبيت النسخة الجديدة Setup 1.0.2 أولاً.
pause
