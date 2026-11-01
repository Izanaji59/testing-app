# Package the approved transparent artwork at browser icon sizes.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot -Parent
$publicRoot = Join-Path $projectRoot 'public'
$source = [System.Drawing.Bitmap]::FromFile((Join-Path $publicRoot 'images/slumbywise/logo.png'))
try {
  if ($source.GetPixel(0,0).A -ne 0) { throw 'The logo source must have a transparent background.' }
  $iconDir = Join-Path $publicRoot 'icons'
  New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
  foreach ($size in @(16,32,48,180,192,256,512)) {
    $bitmap = New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($source,0,0,$size,$size)
      $bitmap.Save((Join-Path $iconDir "slumbywise-$size.png"),[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
  }
  $sizes = @(16,32,48)
  $images = @($sizes | ForEach-Object { ,([System.IO.File]::ReadAllBytes((Join-Path $iconDir "slumbywise-$_.png"))) })
  $stream = [System.IO.File]::Create((Join-Path $publicRoot 'favicon.ico'))
  $writer = New-Object System.IO.BinaryWriter($stream)
  try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i=0; $i -lt $sizes.Count; $i++) {
      $writer.Write([byte]$sizes[$i]); $writer.Write([byte]$sizes[$i])
      $writer.Write([byte]0); $writer.Write([byte]0)
      $writer.Write([uint16]1); $writer.Write([uint16]32)
      $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset)
      $offset += $images[$i].Length
    }
    foreach ($bytes in $images) { $writer.Write([byte[]]$bytes) }
  } finally { $writer.Dispose(); $stream.Dispose() }
  Write-Output 'Transparent logo exported: PNG 16/32/48/180/192/256/512 and multi-size favicon.ico.'
} finally { $source.Dispose() }
