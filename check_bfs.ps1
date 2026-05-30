$json = Get-Content "C:\Users\ALAC\Desktop\fluxtrap-v1.0\mapa.json" -Raw | ConvertFrom-Json

$solidTiles = @(1,5,6)

for ($z=0; $z -lt $json.Count; $z++) {
    $zone = $json[$z]
    $pw = $zone.pw; $ph = $zone.ph
    $map = $zone.map
    $sx = $zone.sx; $sy = $zone.sy

    $startCol = $sx; $startRow = $sy-1
    if ($startRow -lt 0 -or $startRow -ge $ph -or $startCol -lt 0 -or $startCol -ge $pw) {
        Write-Output "Zona $($z+1) (index $z): SPAWN OUT OF BOUNDS (col=$startCol, row=$startRow)"
        continue
    }

    $startIdx = $startRow * $pw + $startCol
    if ($startIdx -ge $map.Count) {
        Write-Output "Zona $($z+1) (index $z): SPAWN INDEX OUT OF RANGE (idx=$startIdx)"
        continue
    }

    $startTile = $map[$startIdx]
    $tileName = switch($startTile) { 0{"air"} 1{"solid"} 3{"spikes"} 4{"platform"} 5{"fake"} 6{"ghost"} 7{"gravity"} 8{"exit"} default {"unknown"} }
    Write-Output "Zona $($z+1) (index $z): pw=$pw ph=$ph spawn=($sx,$sy) body=($startCol,$startRow) tile=$startTile ($tileName)"

    if ($solidTiles -contains $startTile) {
        Write-Output "  >>> WARNING: Player spawns INSIDE solid tile!"
        continue
    }

    $queue = New-Object System.Collections.Queue
    $seen = @{}
    $queue.Enqueue("$startCol,$startRow")
    $seen["$startCol,$startRow"] = $true

    $exitReachable = $false
    $passableCount = 0

    while ($queue.Count -gt 0) {
        $pos = $queue.Dequeue()
        $parts = $pos -split ','
        $col = [int]$parts[0]; $row = [int]$parts[1]
        $passableCount++

        $idx = $row * $pw + $col
        if ($map[$idx] -eq 8) { $exitReachable = $true }

        $dirs = @((0,-1),(0,1),(-1,0),(1,0))
        foreach ($d in $dirs) {
            $nc = $col + $d[0]; $nr = $row + $d[1]
            if ($nc -lt 0 -or $nc -ge $pw -or $nr -lt 0 -or $nr -ge $ph) { continue }
            $key = "$nc,$nr"
            if ($seen.ContainsKey($key)) { continue }
            $nidx = $nr * $pw + $nc
            $ntile = $map[$nidx]
            if ($solidTiles -contains $ntile) { continue }
            $seen[$key] = $true
            $queue.Enqueue($key)
        }
    }

    $totalPassable = 0
    for ($i=0; $i -lt $map.Count; $i++) {
        if (-not ($solidTiles -contains $map[$i])) { $totalPassable++ }
    }

    $reachablePct = if ($totalPassable -gt 0) { [math]::Round($passableCount / $totalPassable * 100, 1) } else { 0 }
    Write-Output "  Reachable tiles: $passableCount / $totalPassable ($reachablePct%)"
    Write-Output "  Exit (tile 8) reachable: $(if($exitReachable){'YES'}else{'NO'})"

    if (-not $exitReachable) {
        Write-Output "  >>> CRITICAL: Exit is not reachable from spawn!"
    }
}
