# Generates the extension icons into icons/ from a single vector definition.
# Run this only when the mark changes -- the PNGs are committed to the repo.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'icons'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Draw once at 512 and downsample -- small sizes stay clean this way.
$S = 512
$master = New-Object System.Drawing.Bitmap($S, $S)
$g = [System.Drawing.Graphics]::FromImage($master)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.Clear([System.Drawing.Color]::Transparent)

# Rounded-square tile with the popup's indigo gradient.
$r = [int]($S * 0.22)
$tile = New-Object System.Drawing.Drawing2D.GraphicsPath
$tile.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
$tile.AddArc($S - $r * 2, 0, $r * 2, $r * 2, 270, 90)
$tile.AddArc($S - $r * 2, $S - $r * 2, $r * 2, $r * 2, 0, 90)
$tile.AddArc(0, $S - $r * 2, $r * 2, $r * 2, 90, 90)
$tile.CloseFigure()

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($S, $S)),
    [System.Drawing.Color]::FromArgb(129, 140, 248),
    [System.Drawing.Color]::FromArgb(79, 70, 229))
$g.FillPath($brush, $tile)

# Shield outline, as a fraction of the tile.
function P([double]$x, [double]$y) {
    New-Object System.Drawing.PointF([float]($x * $S), [float]($y * $S))
}
$shield = New-Object System.Drawing.Drawing2D.GraphicsPath
$shield.AddLine((P 0.50 0.17), (P 0.79 0.30))
$shield.AddLine((P 0.79 0.30), (P 0.79 0.52))
$shield.AddBezier((P 0.79 0.52), (P 0.79 0.70), (P 0.66 0.80), (P 0.50 0.85))
$shield.AddBezier((P 0.50 0.85), (P 0.34 0.80), (P 0.21 0.70), (P 0.21 0.52))
$shield.AddLine((P 0.21 0.52), (P 0.21 0.30))
$shield.CloseFigure()
$g.FillPath([System.Drawing.Brushes]::White, $shield)

# Keyhole, punched out in the tile's own gradient so it reads at 16px.
$cut = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = $S * 0.15
$cut.AddEllipse([float]($S * 0.5 - $d / 2), [float]($S * 0.36), [float]$d, [float]$d)
$cut.AddRectangle((New-Object System.Drawing.RectangleF(
    [float]($S * 0.5 - $S * 0.045), [float]($S * 0.45), [float]($S * 0.09), [float]($S * 0.17))))
$g.FillPath($brush, $cut)

$g.Dispose()

foreach ($size in 16, 32, 48, 128) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $gg = [System.Drawing.Graphics]::FromImage($bmp)
    $gg.InterpolationMode = 'HighQualityBicubic'
    $gg.PixelOffsetMode = 'HighQuality'
    $gg.SmoothingMode = 'AntiAlias'
    $gg.Clear([System.Drawing.Color]::Transparent)
    $gg.DrawImage($master, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
    $gg.Dispose()
    $path = Join-Path $outDir "icon$size.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "wrote $path"
}

$master.Dispose()
