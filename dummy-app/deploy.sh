#!/usr/bin/env bash
# Quick deploy script for the dummy target app
# Usage: ./deploy.sh

set -euo pipefail

RG="Ai-Observability"
ACR="aiobservabilityneu"
IMAGE="dummy-target-app"
TAG="latest"

echo "==> Building & pushing image to ACR..."
az acr login --name "$ACR"
ACR_SERVER=$(az acr show --name "$ACR" --query loginServer -o tsv)

docker build -t "${ACR_SERVER}/${IMAGE}:${TAG}" .
docker push "${ACR_SERVER}/${IMAGE}:${TAG}"

echo "==> Deploying infrastructure with Terraform..."
cd infra
terraform init
terraform apply -auto-approve \
  -var="resource_group_name=${RG}" \
  -var="acr_name=${ACR}" \
  -var="dummy_app_image=${ACR_SERVER}/${IMAGE}:${TAG}"

echo ""
echo "=== Deployment Complete ==="
terraform output

echo ""
echo "Copy these values to your main AI observability app .env:"
echo "  AZURE_LOG_ANALYTICS_WORKSPACE_ID=$(terraform output -raw log_analytics_workspace_id)"
echo ""
echo "To run load tests:"
echo "  pip install locust"
echo "  locust -f ../locustfile.py --host $(terraform output -raw dummy_app_url)"
