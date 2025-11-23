# Script de build et push vers AWS ECR
# Usage: .\build-and-push-ecr.ps1 [region] [repository-name] [tag]

param(
    [string]$Region = "eu-west-1",
    [string]$RepositoryName = "iot-playground-front",
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Build et Push vers ECR - Application Angular" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Récupérer l'Account ID AWS
Write-Host "📋 Récupération de l'Account ID AWS..." -ForegroundColor Yellow
$AccountId = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la récupération de l'Account ID" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Account ID: $AccountId" -ForegroundColor Green
Write-Host ""

# 2. Construire l'URL complète du repository ECR
$EcrUrl = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$FullImageName = "$EcrUrl/${RepositoryName}:${Tag}"

Write-Host "🏷️  Image: $FullImageName" -ForegroundColor Cyan
Write-Host ""

# 3. Authentification à ECR
Write-Host "🔐 Authentification à ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUrl
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'authentification à ECR" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Authentification réussie" -ForegroundColor Green
Write-Host ""

# 4. Vérifier si le repository existe, sinon le créer
Write-Host "📦 Vérification du repository ECR..." -ForegroundColor Yellow
$RepoExists = aws ecr describe-repositories --repository-names $RepositoryName --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Repository '$RepositoryName' n'existe pas, création..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $RepositoryName --region $Region --image-scanning-configuration scanOnPush=true
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la création du repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Repository créé" -ForegroundColor Green
} else {
    Write-Host "✅ Repository existe déjà" -ForegroundColor Green
}
Write-Host ""

# 5. Build de l'image Docker
Write-Host "🔨 Build de l'image Docker..." -ForegroundColor Yellow
Write-Host "   Cela peut prendre plusieurs minutes..." -ForegroundColor Gray
docker build -t $RepositoryName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build Docker" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build réussi" -ForegroundColor Green
Write-Host ""

# 6. Tag de l'image
Write-Host "🏷️  Tag de l'image..." -ForegroundColor Yellow
docker tag "${RepositoryName}:latest" $FullImageName
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du tag de l'image" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tag réussi" -ForegroundColor Green
Write-Host ""

# 7. Push vers ECR
Write-Host "⬆️  Push de l'image vers ECR..." -ForegroundColor Yellow
Write-Host "   Cela peut prendre plusieurs minutes..." -ForegroundColor Gray
docker push $FullImageName
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du push vers ECR" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Push réussi" -ForegroundColor Green
Write-Host ""

# 8. Récapitulatif
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 Déploiement terminé avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Informations:" -ForegroundColor Cyan
Write-Host "   • Region:     $Region" -ForegroundColor White
Write-Host "   • Repository: $RepositoryName" -ForegroundColor White
Write-Host "   • Tag:        $Tag" -ForegroundColor White
Write-Host "   • Image:      $FullImageName" -ForegroundColor White
Write-Host ""
Write-Host "📝 Commande pour pull l'image:" -ForegroundColor Cyan
Write-Host "   docker pull $FullImageName" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Commande pour run l'image:" -ForegroundColor Cyan
Write-Host "   docker run -d -p 80:80 --name iot-front $FullImageName" -ForegroundColor Yellow
Write-Host ""

