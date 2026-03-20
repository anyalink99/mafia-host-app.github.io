$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$iconsDir = Join-Path $root 'icons'
$srcPath = Join-Path $iconsDir 'icon.png'
$androidRes = Join-Path $root 'android\app\src\main\res'

if (-not (Test-Path -LiteralPath $srcPath)) {
  Write-Error "Missing source icon: $srcPath. Add icons\icon.png and run again."
}

New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null
Add-Type -AssemblyName System.Drawing

function New-BitmapCanvas {
  param([int]$W, [int]$H, [System.Drawing.Color]$ClearColor)
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($ClearColor)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Save-AndDispose {
  param($Canvas, [string]$OutPath)
  $dir = Split-Path -Parent $OutPath
  if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $Canvas.Bitmap.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
}

function Draw-ImageCenteredFit {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.Image]$Img,
    [int]$CanvasW,
    [int]$CanvasH,
    [double]$FillFraction
  )
  $box = [Math]::Min($CanvasW, $CanvasH) * $FillFraction
  $ratio = [Math]::Min($box / $Img.Width, $box / $Img.Height)
  $nw = [Math]::Max(1, [int][Math]::Round($Img.Width * $ratio))
  $nh = [Math]::Max(1, [int][Math]::Round($Img.Height * $ratio))
  $x = [int][Math]::Round(($CanvasW - $nw) / 2)
  $y = [int][Math]::Round(($CanvasH - $nh) / 2)
  $G.DrawImage($Img, $x, $y, $nw, $nh)
}

$bgApp = [System.Drawing.Color]::FromArgb(255, 12, 10, 9)
$src = [System.Drawing.Image]::FromFile($srcPath)

try {
  foreach ($pair in @(@{ W = 192; H = 192; Name = 'icon-192.png' }, @{ W = 512; H = 512; Name = 'icon-512.png' })) {
    $c = New-BitmapCanvas -W $pair.W -H $pair.H -ClearColor $bgApp
    Draw-ImageCenteredFit -G $c.Graphics -Img $src -CanvasW $pair.W -CanvasH $pair.H -FillFraction 1.0
    Save-AndDispose -Canvas $c -OutPath (Join-Path $iconsDir $pair.Name)
  }

  $densities = @(
    @{ Folder = 'mipmap-mdpi'; Mult = 1.0 },
    @{ Folder = 'mipmap-hdpi'; Mult = 1.5 },
    @{ Folder = 'mipmap-xhdpi'; Mult = 2.0 },
    @{ Folder = 'mipmap-xxhdpi'; Mult = 3.0 },
    @{ Folder = 'mipmap-xxxhdpi'; Mult = 4.0 }
  )

  foreach ($d in $densities) {
    $folder = Join-Path $androidRes $d.Folder
    New-Item -ItemType Directory -Force -Path $folder | Out-Null

    $legacy = [int][Math]::Round(48 * $d.Mult)
    $c1 = New-BitmapCanvas -W $legacy -H $legacy -ClearColor $bgApp
    Draw-ImageCenteredFit -G $c1.Graphics -Img $src -CanvasW $legacy -CanvasH $legacy -FillFraction 0.9
    Save-AndDispose -Canvas $c1 -OutPath (Join-Path $folder 'ic_launcher.png')

    $c2 = New-BitmapCanvas -W $legacy -H $legacy -ClearColor $bgApp
    Draw-ImageCenteredFit -G $c2.Graphics -Img $src -CanvasW $legacy -CanvasH $legacy -FillFraction 0.9
    Save-AndDispose -Canvas $c2 -OutPath (Join-Path $folder 'ic_launcher_round.png')

    $fg = [int][Math]::Round(108 * $d.Mult)
    $transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
    $c3 = New-BitmapCanvas -W $fg -H $fg -ClearColor $transparent
    Draw-ImageCenteredFit -G $c3.Graphics -Img $src -CanvasW $fg -CanvasH $fg -FillFraction 0.72
    Save-AndDispose -Canvas $c3 -OutPath (Join-Path $folder 'ic_launcher_foreground.png')
  }
}
finally {
  $src.Dispose()
}

Write-Host 'PWA icons ->' $iconsDir
Write-Host 'Android mipmaps ->' $androidRes
