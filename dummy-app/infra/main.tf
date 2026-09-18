# ---------------------------------------------------------------------------
# Dummy Target App — Infrastructure
#
# Deploys:
#   - Log Analytics Workspace
#   - Application Insights (connected to LA workspace)
#   - Container App for the dummy target app
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.5"

  backend "azurerm" {
    resource_group_name  = "Ai-Observability"
    storage_account_name = "tfstatepocobservability"
    container_name       = "tfstate"
    key                  = "dummy-app.tfstate"
    use_oidc             = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  description = "Resource group (must already exist)"
  type        = string
  default     = "Ai-Observability"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "swedencentral"
}

variable "acr_name" {
  description = "Existing ACR name"
  type        = string
  default     = "aiobservabilityneu"
}

variable "dummy_app_image" {
  description = "Container image for the dummy app"
  type        = string
  default     = "aiobservabilityneu.azurecr.io/dummy-target-app:latest"
}

# ---------------------------------------------------------------------------
# Data sources
# ---------------------------------------------------------------------------

data "azurerm_resource_group" "rg" {
  name = var.resource_group_name
}

data "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = data.azurerm_resource_group.rg.name
}

# ---------------------------------------------------------------------------
# Log Analytics Workspace
# ---------------------------------------------------------------------------

resource "azurerm_log_analytics_workspace" "law" {
  name                = "law-observability-poc"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# ---------------------------------------------------------------------------
# Application Insights (workspace-based)
# ---------------------------------------------------------------------------

resource "azurerm_application_insights" "appinsights" {
  name                = "appi-dummy-target"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
}

# ---------------------------------------------------------------------------
# Managed Identity for the dummy app
# ---------------------------------------------------------------------------

resource "azurerm_user_assigned_identity" "dummy_identity" {
  name                = "dummy-app-identity"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.rg.name
}

resource "azurerm_role_assignment" "dummy_acr_pull" {
  scope                = data.azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.dummy_identity.principal_id
}

# ---------------------------------------------------------------------------
# Container App Environment + Dummy App
# ---------------------------------------------------------------------------

resource "azurerm_container_app_environment" "dummy_env" {
  name                       = "cae-dummy-target"
  location                   = var.location
  resource_group_name        = data.azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
}

resource "azurerm_container_app" "dummy_app" {
  name                         = "ca-dummy-target"
  container_app_environment_id = azurerm_container_app_environment.dummy_env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.dummy_identity.id]
  }

  registry {
    server   = data.azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.dummy_identity.id
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = "dummy-app"
      image  = var.dummy_app_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.appinsights.connection_string
      }
    }

    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = "100"
    }
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "dummy_app_url" {
  description = "Dummy app FQDN"
  value       = "https://${azurerm_container_app.dummy_app.ingress[0].fqdn}"
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID (use this in the main AI observability app .env)"
  value       = azurerm_log_analytics_workspace.law.workspace_id
}

output "appinsights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.appinsights.connection_string
  sensitive   = true
}

output "appinsights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.appinsights.instrumentation_key
  sensitive   = true
}
