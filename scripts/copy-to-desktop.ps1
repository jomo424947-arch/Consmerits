$target = "c:\Users\jomo4\OneDrive\Desktop\محمد الجوكر"

if (-not (Test-Path $target)) {
    New-Item -ItemType Directory -Force -Path $target | Out-Null
}

$packagesDir = Join-Path $target "حزم ويندوز 7 الأساسية"
if (-not (Test-Path $packagesDir)) {
    New-Item -ItemType Directory -Force -Path $packagesDir | Out-Null
}

$portableDir = Join-Path $target "نسخة محمولة بدون تثبيت Win7-32bit"
if (-not (Test-Path $portableDir)) {
    New-Item -ItemType Directory -Force -Path $portableDir | Out-Null
}

Write-Host "1. نسخ ملف التثبيت المحدث 1.0.3..."
Copy-Item ".\release\Boutique Gouri - نظام بيع وجرد مستحضرات التجميل Setup 1.0.3.exe" -Destination (Join-Path $target "Boutique Gouri Setup 1.0.3 (نسخة ويندوز 7 المخصصة).exe") -Force

Write-Host "2. نسخ حزم مايكروسوفت..."
Copy-Item ".\packages_for_win7\VC_redist.x86.exe" -Destination (Join-Path $packagesDir "VC_redist.x86 (ضروري جداً).exe") -Force
Copy-Item ".\packages_for_win7\VC_redist.x64.exe" -Destination (Join-Path $packagesDir "VC_redist.x64.exe") -Force

Write-Host "3. نسخ أداة الصيانة ودليل التشغيل..."
Copy-Item ".\packages_for_win7\تشغيل_وإصلاح_بوتيك_جوري.bat" -Destination (Join-Path $target "تشغيل_وإصلاح_بوتيك_جوري.bat") -Force
Copy-Item ".\packages_for_win7\دليل_التشغيل_على_ويندوز_7.txt" -Destination (Join-Path $target "دليل_التشغيل_خطوة_بخطوة_لجهاز_العميل.txt") -Force

Write-Host "4. نسخ النسخة المحمولة (32-bit Portable)..."
Copy-Item -Recurse -Force ".\release\win-ia32-unpacked\*" $portableDir

Write-Host "اكتمل التجهيز بنجاح! محتويات المجلد:"
Get-ChildItem $target
