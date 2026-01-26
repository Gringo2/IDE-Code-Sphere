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
        Write-Host "  [OK] Resized: $dest"
    }
    catch { 
        Write-Warning "  [ERR] Resize-Png failed for $dest : $($_.Exception.Message)"
    }
}

$root = "c:/Users/jobsb/Desktop/codesphere-IDE"
$variants = @(
    @{ name = "stable"; png = "$root/icons/stable/codesphere_512.png"; ico = "$root/icons/stable/code.ico"; icns = "$root/icons/stable/code.icns" },
    @{ name = "insider"; png = "$root/icons/insider/codesphere_512.png"; ico = "$root/icons/insider/code.ico"; icns = "$root/icons/insider/code.icns" }
)

foreach ($v in $variants) {
    if (!(Test-Path $v.ico) -or !(Test-Path $v.icns)) {
        Write-Error "Master icons missing for $($v.name). Run build_master_icons.js first."
        continue
    }

    $resDir = "src/$($v.name)/resources"
    Write-Host ">>> REBRANDING DIST: $($v.name) in $resDir"

    # 1. Force overwrite ALL .ico files recursively
    Write-Host "   Overwriting all .ico files..."
    Get-ChildItem -Path $resDir -Filter "*.ico" -Recurse | ForEach-Object {
        Copy-Item $v.ico $_.FullName -Force
        Write-Host "      Replaced: $($_.FullName)"
    }

    # 2. Force overwrite ALL .icns files recursively
    Write-Host "   Overwriting all .icns files..."
    Get-ChildItem -Path $resDir -Filter "*.icns" -Recurse | ForEach-Object {
        Copy-Item $v.icns $_.FullName -Force
        Write-Host "      Replaced: $($_.FullName)"
    }

    # 3. Force overwrite ALL .bmp files recursively
    Write-Host "   Overwriting all .bmp files..."
    # (Using a solid color fill for BMPs since they are usually simple banners)
    $color = if ($v.name -eq "stable") { "#7C3AED" } else { "#0891B2" }
    Get-ChildItem -Path $resDir -Filter "*.bmp" -Recurse | ForEach-Object {
        # Recalling the simple BMP gen logic
        try {
            $logo = [System.Drawing.Image]::FromFile($v.png)
            $bgColor = [System.Drawing.ColorTranslator]::FromHtml($color)
            $canvas = New-Object System.Drawing.Bitmap(500, 500) # Temporary large canvas
            $g = [System.Drawing.Graphics]::FromImage($canvas)
            $g.Clear($bgColor)
            # Just a centered logo for generic BMP replacement
            $g.DrawImage($logo, 50, 50, 400, 400)
            
            # Now resize to the TARGET file's dimensions
            $actualTarget = [System.Drawing.Image]::FromFile($_.FullName)
            $w = $actualTarget.Width
            $h = $actualTarget.Height
            $actualTarget.Dispose()

            $finalBmp = New-Object System.Drawing.Bitmap($w, $h)
            $gFinal = [System.Drawing.Graphics]::FromImage($finalBmp)
            $gFinal.Clear($bgColor)
            
            # Simple heuristic for branding
            $logoSize = [math]::Min($w, $h) * 0.8
            $gFinal.DrawImage($logo, ($w - $logoSize) / 2, ($h - $logoSize) / 2, $logoSize, $logoSize)
            
            $finalBmp.Save($_.FullName, [System.Drawing.Imaging.ImageFormat]::Bmp)
            $gFinal.Dispose(); $finalBmp.Dispose(); $canvas.Dispose(); $logo.Dispose()
            Write-Host "      Rebranded BMP: $($_.FullName) ($w x $h)"
        }
        catch {
            Write-Warning "      [SKIP] BMP rebranding failed for $($_.FullName)"
        }
    }

    # 4. Handle specific PNG files that are usually logos/tiles
    Write-Host "   Updating PNG logos and tiles..."
    Get-ChildItem -Path $resDir -Filter "*.png" -Recurse | ForEach-Object {
        $path = $_.FullName
        # Heuristic: only replace if it looks like a logo or is high-res enough to be one
        $actualPng = [System.Drawing.Image]::FromFile($path)
        $w = $actualPng.Width
        $h = $actualPng.Height
        $actualPng.Dispose()

        if ($w -ge 32 -and $h -ge 32) {
            Resize-Png $v.png $path $w $h
            Write-Host "      Updated PNG: $path ($w x $h)"
        }
    }
}
