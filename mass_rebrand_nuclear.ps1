Add-Type -AssemblyName System.Drawing

function Resize-Png($src, $dest, $w, $h) {
    try {
        $img = [System.Drawing.Image]::FromFile($src)
        $newImg = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $w, $h)
        $newImg.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose(); $newImg.Dispose(); $img.Dispose()
        Write-Host "[OK] Resized: $dest"
    }
    catch { }
}

function Create-Bmp($logoPath, $dest, $w, $h, $bgColorHex, $isBanner) {
    try {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $bgColor = [System.Drawing.ColorTranslator]::FromHtml($bgColorHex)
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear($bgColor)
        $size = if ($isBanner) { [math]::Min($h * 0.8, $w * 0.1) } else { $w * 0.3 }
        $x = if ($isBanner) { ($w - $size - 10) } else { 20 }
        $g.DrawImage($logo, $x, 20, $size, $size)
        $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Bmp)
        $g.Dispose(); $bmp.Dispose(); $logo.Dispose()
        Write-Host "[OK] BMP: $dest"
    }
    catch { }
}

$root = "c:/Users/jobsb/Desktop/codesphere-IDE"
$variants = @(
    @{ name = "stable"; png = "$root/icons/stable/codesphere_512.png"; color = "#7C3AED" },
    @{ name = "insider"; png = "$root/icons/insider/codesphere_512.png"; color = "#0891B2" }
)

foreach ($v in $variants) {
    $resDir = "$root/src/$($v.name)/resources"
    $masterIco = "$root/icons/$($v.name)/code.ico"
    $masterIcns = "$root/icons/$($v.name)/code.icns"
    
    Write-Host "--- REBRANDING $($v.name) (Recursive) ---"
    
    if (Test-Path $resDir) {
        # 1. Recursive Icon Replacement
        Get-ChildItem -Path $resDir -Include "*.ico", "*.icns" -Recurse | ForEach-Object {
            $master = if ($_.Extension -eq ".ico") { $masterIco } else { $masterIcns }
            Copy-Item $master $_.FullName -Force
            Write-Host "  Replaced Icon: $($_.FullName)"
        }

        # 2. Specific PNG Tiles
        $tiles = @(
            "win32/code_150x150.png", "win32/code_70x70.png",
            "server/code-192.png", "server/code-512.png"
        )
        foreach ($t in $tiles) {
            $path = "$resDir/$t"
            if ($t -match "150") { Resize-Png $($v.png) $path 150 150 }
            elseif ($t -match "70") { Resize-Png $($v.png) $path 70 70 }
            elseif ($t -match "192") { Resize-Png $($v.png) $path 192 192 }
            elseif ($t -match "512") { Resize-Png $($v.png) $path 512 512 }
        }

        # 3. Recursive BMP Replacement
        Get-ChildItem -Path $resDir -Include "*.bmp" -Recurse | ForEach-Object {
            if ($_.Name -match "small") { Create-Bmp $($v.png) $_.FullName 55 55 $($v.color) $true }
            else { Create-Bmp $($v.png) $_.FullName 164 314 $($v.color) $false }
        }
    }
}
