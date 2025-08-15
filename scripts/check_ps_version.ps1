$ErrorActionPreference = 'SilentlyContinue'
if ($PSVersionTable) {
    $v = $PSVersionTable.PSVersion
    Write-Output ("PSVersion=" + $v.ToString())
} else {
    Write-Output 'PSVersion='
}

