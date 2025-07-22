# Compress all .pbf files to gzip
Get-ChildItem -Recurse -Filter *.pbf | ForEach-Object {
    Write-Host "🔁 Compressing $($_.FullName)..."
    & "C:\Program Files\Git\usr\bin\gzip.exe" -f $_.FullName
}

# Rename .pbf.gz to .pbf
Get-ChildItem -Recurse -Filter *.pbf.gz | ForEach-Object {
    $newName = $_.FullName -replace '\.pbf\.gz$', '.pbf'
    Rename-Item $_.FullName $newName -Force
    Write-Host "✅ Renamed to $newName"
}
