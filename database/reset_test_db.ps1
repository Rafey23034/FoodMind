param(
  [string]$Mysql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe',
  [string]$HostName = '127.0.0.1',
  [string]$User = $(if ($env:MYSQL_ROOT_USER) { $env:MYSQL_ROOT_USER } else { 'root' }),
  [string]$Password = $(if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { 'FoodMindRoot2026!' })
)

$ErrorActionPreference = 'Stop'
$schema = Join-Path $PSScriptRoot 'schema.sql'
$seed = Join-Path $PSScriptRoot 'seed.sql'
$db = 'foodmind_test'

& $Mysql -h $HostName -u $User "-p$Password" --default-character-set=utf8mb4 -e "DROP DATABASE IF EXISTS $db; CREATE DATABASE $db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
if ($LASTEXITCODE -ne 0) { throw 'Could not create foodmind_test.' }

& $Mysql -h $HostName -u $User "-p$Password" --default-character-set=utf8mb4 $db -e "source $($schema.Replace('\','/'))"
if ($LASTEXITCODE -ne 0) { throw 'Could not load schema.sql.' }

& $Mysql -h $HostName -u $User "-p$Password" --default-character-set=utf8mb4 $db -e "source $($seed.Replace('\','/'))"
if ($LASTEXITCODE -ne 0) { throw 'Could not load seed.sql.' }

Write-Host "foodmind_test reset."
