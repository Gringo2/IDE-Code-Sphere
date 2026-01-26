Add-Type -AssemblyName System.Drawing

function Create-MsiAssets($logoPath, $bannerPath, $dialogPath, $accentColorHex) {
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $accentColor = [System.Drawing.ColorTranslator]::FromHtml($accentColorHex)

    # 1. Create Banner (493x58)
    $banner = New-Object System.Drawing.Bitmap(493, 58)
    $g = [System.Drawing.Graphics]::FromImage($banner)
    $g.Clear([System.Drawing.Color]::FromArgb(30, 30, 30)) # Dark gray background

    # Logo on the right
    $logoSize = 48
    $destRect = New-Object System.Drawing.Rectangle(440, 5, $logoSize, $logoSize)
    $g.DrawImage($logo, $destRect)
    
    $banner.Save($bannerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    $g.Dispose()
    $banner.Dispose()

    # 2. Create Dialog (493x312)
    $dialog = New-Object System.Drawing.Bitmap(493, 312)
    $g = [System.Drawing.Graphics]::FromImage($dialog)
    $g.Clear([System.Drawing.Color]::White)

    # Accent bar on the left
    $brush = New-Object System.Drawing.SolidBrush($accentColor)
    $g.FillRectangle($brush, 0, 0, 164, 312)

    # Large logo on the accent bar
    $logoSizeLarge = 120
    $destRectLarge = New-Object System.Drawing.Rectangle(22, 20, $logoSizeLarge, $logoSizeLarge)
    $g.DrawImage($logo, $destRectLarge)

    $dialog.Save($dialogPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    $g.Dispose()
    $dialog.Dispose()
    $logo.Dispose()
}

# Stable
Create-MsiAssets `
    "c:/Users/jobsb/Desktop/codesphere-IDE/icons/stable/codesphere.png" `
    "c:/Users/jobsb/Desktop/codesphere-IDE/build/windows/msi/resources/stable/wix-banner.bmp" `
    "c:/Users/jobsb/Desktop/codesphere-IDE/build/windows/msi/resources/stable/wix-dialog.bmp" `
    "#7C3AED"

# Insider
Create-MsiAssets `
    "c:/Users/jobsb/Desktop/codesphere-IDE/icons/insider/codesphere-insiders.png" `
    "c:/Users/jobsb/Desktop/codesphere-IDE/build/windows/msi/resources/insider/wix-banner.bmp" `
    "c:/Users/jobsb/Desktop/codesphere-IDE/build/windows/msi/resources/insider/wix-dialog.bmp" `
    "#0891B2"
