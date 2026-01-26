Add-Type -AssemblyName System.Drawing

function Resize-Png($src, $dest, $w, $h) {
    try {
        $img = [System.Drawing.Image]::FromFile($src)
        $newImg = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $w, $h)
        $newImg.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $newImg.Dispose()
        $img.Dispose()
        Write-Host "[OK] Resized PNG: $dest"
    }
    catch {
        Write-Warning "[FAIL] Resize-Png for $dest : $($_.Exception.Message)"
    }
}

function Create-Bmp($logoPath, $dest, $w, $h, $bgColorHex, $isBanner) {
    try {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $bgColor = [System.Drawing.ColorTranslator]::FromHtml($bgColorHex)
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear($bgColor)

        if ($isBanner) {
            $size = [math]::Min($h * 0.8, $w * 0.1)
            $g.DrawImage($logo, ($w - $size - 10), ($h - $size) / 2, $size, $size)
        }
        else {
            $size = $w * 0.3
            $g.DrawImage($logo, 20, 20, $size, $size)
        }

        $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Bmp)
        $g.Dispose()
        $bmp.Dispose()
        $logo.Dispose()
        Write-Host "[OK] Generated BMP: $dest"
    }
    catch {
        Write-Warning "[FAIL] Create-Bmp for $dest : $($_.Exception.Message)"
    }
}

$root = "c:/Users/jobsb/Desktop/codesphere-IDE"
$variants = @(
    @{ name = "stable"; png = "$root/icons/stable/codesphere.png"; color = "#7C3AED" },
    @{ name = "insider"; png = "$root/icons/insider/codesphere-insiders.png"; color = "#0891B2" }
)

foreach ($v in $variants) {
    Write-Host "--- PROCESSING VARIANT: $($v.name) ---"
    $resDir = "$root/src/$($v.name)/resources"
    
    # Pre-resize source for icon tools (some tools dislike 1024)
    $smallPng = "$root/icons/$($v.name)/source_512.png"
    Resize-Png $($v.png) $smallPng 512 512

    # 1. Generate master icons
    $masterIco = "$root/icons/$($v.name)/code.ico"
    $masterIcns = "$root/icons/$($v.name)/code.icns"
    
    Write-Host "Generating master ICO/ICNS..."
    & npx -y png2icons $smallPng $masterIco ico
    & npx -y png2icons $smallPng $masterIcns icns

    # 2. Audit and Force Replace ALL in resources
    if (Test-Path $resDir) {
        # ICNS (Darwin)
        Write-Host "Replacing ICNS in $resDir/darwin..."
        Get-ChildItem -Path "$resDir" -Include "*.icns" -Recurse | ForEach-Object {
            Copy-Item $masterIcns $_.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "  Replaced: $($_.FullName)"
        }

        # ICO (Windows / Server)
        Write-Host "Replacing ICO in $resDir..."
        Get-ChildItem -Path "$resDir" -Include "*.ico" -Recurse | ForEach-Object {
            Copy-Item $masterIco $_.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "  Replaced: $($_.FullName)"
        }

        # Tiles/PNGs
        Write-Host "Updating PNG tiles..."
        Resize-Png $($v.png) "$resDir/win32/code_150x150.png" 150 150
        Resize-Png $($v.png) "$resDir/win32/code_70x70.png" 70 70
        Resize-Png $($v.png) "$resDir/server/code-192.png" 192 192
        Resize-Png $($v.png) "$resDir/server/code-512.png" 512 512

        # Inno BMPs
        Write-Host "Updating Inno BMPs..."
        Get-ChildItem -Path "$resDir/win32" -Include "*.bmp" -Recurse | ForEach-Object {
            if ($_.Name -match "small") {
                Create-Bmp $($v.png) $_.FullName 55 55 $($v.color) $true
            }
            else {
                Create-Bmp $($v.png) $_.FullName 164 314 $($v.color) $false
            }
        }
    }
}
