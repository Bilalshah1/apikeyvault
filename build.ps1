# Builds the unpacked extension into dist/ and zips it for the Chrome Web Store.
# No dependencies -- this is a copy, not a compile. MV3 loads the sources as-is.

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$dist = Join-Path $root 'dist'

# Everything the manifest actually references. public/fonts is unreferenced by
# any css/html/js, so it is deliberately left out of the package.
$include = @('manifest.json', 'popup', 'background', 'icons')

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null

foreach ($item in $include) {
    $src = Join-Path $root $item
    if (-not (Test-Path $src)) { throw "Missing: $item" }
    Copy-Item $src -Destination $dist -Recurse
}

$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
$zip = Join-Path $root "apikeyvault-$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

# Zip the contents of dist, not dist itself -- manifest.json must be at the root
# of the archive or the Web Store rejects it.
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip

Write-Host "dist/ ready  ->  $dist"
Write-Host "package      ->  $zip"
