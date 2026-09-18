# ---------------------------------------------------------------------------
# AI Observability PoC — Azure Infrastructure (Terraform)
#
# Deploys:
#   - Container App Environment + Container App
#   - Azure OpenAI account + GPT-4o deployment
#   - User-assigned Managed Identity with required roles
#   - Action Group with webhook to the Container App
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.5"

  backend "azurerm" {
    resource_group_name  = "Ai-Observability"
    storage_account_name = "tfstatepocobservability"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
    use_oidc             = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {
    cognitive_account {
      purge_soft_delete_on_destroy = false
    }
  }
}

provider "azapi" {}
