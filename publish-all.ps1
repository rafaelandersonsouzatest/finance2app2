<#
.SYNOPSIS
    Publica uma atualização OTA (EAS Update) para os apps meu-app, rafael e
    christian (ambiente de distribuição para convidados/testadores externos),
    sempre na branch "main".

.DESCRIPTION
    Pede a mensagem da release uma única vez e publica a mesma atualização
    para os três ambientes, definindo APP_ENV antes de cada publicação (é o
    que app.config.js usa para escolher projeto/ícone/updates.url por
    ambiente — ver app.config.js e ARQUITETURA.md). Ao final, sempre limpa a
    variável APP_ENV e mostra um relatório com o resultado de cada
    publicação.

.USAGE
    .\publish-all.ps1
#>

$ErrorActionPreference = "Stop"

$apps = @("meu-app", "rafael", "christian")
$branch = "main"
$resultados = @()

function Limpar-AppEnv {
    Remove-Item Env:\APP_ENV -ErrorAction SilentlyContinue
}

try {
    $mensagem = Read-Host "Mensagem da release"
    if ([string]::IsNullOrWhiteSpace($mensagem)) {
        Write-Host "Mensagem da release não pode ser vazia. Abortando." -ForegroundColor Red
        exit 1
    }

    foreach ($app in $apps) {
        Write-Host ""
        Write-Host "==> Publicando '$app' (branch '$branch')..." -ForegroundColor Cyan

        $env:APP_ENV = $app

        $saida = & npx eas update --branch $branch --message "$mensagem" --non-interactive 2>&1 | Out-String
        $sucesso = ($LASTEXITCODE -eq 0)

        if ($sucesso) {
            Write-Host "'$app' publicado com sucesso." -ForegroundColor Green
        }
        else {
            Write-Host "Erro ao publicar '$app' (código $LASTEXITCODE)." -ForegroundColor Red
        }

        $resultados += [PSCustomObject]@{
            App     = $app
            Branch  = $branch
            Sucesso = $sucesso
            Saida   = $saida.Trim()
        }
    }
}
finally {
    Limpar-AppEnv
}

Write-Host ""
Write-Host "=================== Relatório da publicação ===================" -ForegroundColor Yellow
foreach ($r in $resultados) {
    $status = if ($r.Sucesso) { "OK" } else { "ERRO" }
    $cor = if ($r.Sucesso) { "Green" } else { "Red" }
    Write-Host ""
    Write-Host "[$status] $($r.App) (branch: $($r.Branch))" -ForegroundColor $cor
    Write-Host $r.Saida
}
Write-Host "================================================================="

$falhas = $resultados | Where-Object { -not $_.Sucesso }
if ($falhas.Count -gt 0) {
    Write-Host "Publicação concluída com $($falhas.Count) erro(s). Revise o relatório acima." -ForegroundColor Red
}
else {
    Write-Host "Publicação concluída com sucesso para todos os apps." -ForegroundColor Green
}
