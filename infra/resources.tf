data "azurerm_resource_group" "rg" {
  name = var.resource_group_name
}

# ---------------------------------------------------------------------------
# Managed Identity
# ---------------------------------------------------------------------------

resource "azurerm_user_assigned_identity" "identity" {
  name                = "${var.base_name}-identity"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.rg.name
}

# ---------------------------------------------------------------------------
# Container Registry (pre-existing)
# ---------------------------------------------------------------------------

data "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = data.azurerm_resource_group.rg.name
}

# ---------------------------------------------------------------------------
# Azure OpenAI
# ---------------------------------------------------------------------------

resource "azurerm_cognitive_account" "openai" {
  name                  = "${var.base_name}-aoai"
  location              = var.location
  resource_group_name   = data.azurerm_resource_group.rg.name
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = "${var.base_name}-aoai"

  network_acls {
    default_action = "Allow"
  }
}

resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = "gpt-4o"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "gpt-4o"
    version = "2024-11-20"
  }

  sku {
    name     = "Standard"
    capacity = 30
  }
}

# ---------------------------------------------------------------------------
# Role Assignments
# ---------------------------------------------------------------------------

# Cognitive Services OpenAI User
resource "azurerm_role_assignment" "openai_user" {
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_user_assigned_identity.identity.principal_id
}

# Monitoring Reader
resource "azurerm_role_assignment" "monitor_reader" {
  scope                = data.azurerm_resource_group.rg.id
  role_definition_name = "Monitoring Reader"
  principal_id         = azurerm_user_assigned_identity.identity.principal_id
}

# Log Analytics Reader
resource "azurerm_role_assignment" "log_analytics_reader" {
  scope                = data.azurerm_resource_group.rg.id
  role_definition_name = "Log Analytics Reader"
  principal_id         = azurerm_user_assigned_identity.identity.principal_id
}

# AcrPull — allow Container App to pull images
resource "azurerm_role_assignment" "acr_pull" {
  scope                = data.azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.identity.principal_id
}

# ---------------------------------------------------------------------------
# Container App Environment + Container App
# ---------------------------------------------------------------------------

resource "azurerm_container_app_environment" "env" {
  name                = "${var.base_name}-env"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.rg.name
}

resource "azurerm_container_app" "app" {
  name                         = "${var.base_name}-app"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.identity.id]
  }

  secret {
    name  = "github-token"
    value = var.github_token
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server   = data.azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.identity.id
  }

  template {
    min_replicas = 0
    max_replicas = 3

    container {
      name   = "app"
      image  = var.container_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "AZURE_LOG_ANALYTICS_WORKSPACE_ID"
        value = var.log_analytics_workspace_id
      }
      env {
        name  = "AZURE_OPENAI_ENDPOINT"
        value = azurerm_cognitive_account.openai.endpoint
      }
      env {
        name  = "AZURE_OPENAI_DEPLOYMENT"
        value = "gpt-4o"
      }
      env {
        name        = "GITHUB_TOKEN"
        secret_name = "github-token"
      }
      env {
        name  = "GITHUB_REPO"
        value = var.github_repo
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.identity.client_id
      }
    }

    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = "50"
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }
}

# ---------------------------------------------------------------------------
# Frontend Container App
# ---------------------------------------------------------------------------

resource "azurerm_container_app" "frontend" {
  name                         = "${var.base_name}-frontend"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.identity.id]
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server   = data.azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.identity.id
  }

  template {
    min_replicas = 0
    max_replicas = 3

    container {
      name   = "frontend"
      image  = var.frontend_container_image
      cpu    = 0.25
      memory = "0.5Gi"

      liveness_probe {
        path      = "/healthz"
        port      = 80
        transport = "HTTP"
      }
    }

    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = "20"
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }
}

# ---------------------------------------------------------------------------
# Backend Container App
# ---------------------------------------------------------------------------

resource "azurerm_container_app" "backend" {
  name                         = "${var.base_name}-backend"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.identity.id]
  }

  ingress {
    external_enabled = true
    target_port      = 5000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server   = data.azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.identity.id
  }

  template {
    min_replicas = 0
    max_replicas = 3

    container {
      name   = "backend"
      image  = var.backend_container_image
      cpu    = 0.25
      memory = "0.5Gi"

      startup_probe {
        path                    = "/api/health"
        port                    = 5000
        transport               = "HTTP"
        interval_seconds        = 5
        failure_count_threshold = 10
      }

      liveness_probe {
        path                    = "/api/health"
        port                    = 5000
        transport               = "HTTP"
        initial_delay           = 10
        interval_seconds        = 10
        failure_count_threshold = 3
      }
    }

    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = "20"
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }
}
# ---------------------------------------------------------------------------
# Action Group — webhook to the Container App
# ---------------------------------------------------------------------------

resource "azurerm_monitor_action_group" "ag" {
  name                = "${var.base_name}-ag"
  resource_group_name = data.azurerm_resource_group.rg.name
  short_name          = "ai-obs"
  enabled             = true

  webhook_receiver {
    name                    = "ai-obs-webhook"
    service_uri             = "https://${azurerm_container_app.app.ingress[0].fqdn}/webhook/alert"
    use_common_alert_schema = true
  }
}
