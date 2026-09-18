output "container_app_url" {
  description = "FQDN of the deployed Container App"
  value       = "https://${azurerm_container_app.app.ingress[0].fqdn}"
}

output "openai_endpoint" {
  description = "Azure OpenAI endpoint URL"
  value       = azurerm_cognitive_account.openai.endpoint
}

output "identity_client_id" {
  description = "Client ID of the managed identity"
  value       = azurerm_user_assigned_identity.identity.client_id
}

output "action_group_id" {
  description = "Resource ID of the Action Group"
  value       = azurerm_monitor_action_group.ag.id
}

output "acr_login_server" {
  description = "ACR login server FQDN"
  value       = data.azurerm_container_registry.acr.login_server
}

output "acr_name" {
  description = "ACR name"
  value       = data.azurerm_container_registry.acr.name
}

output "frontend_container_app_url" {
  description = "FQDN of the deployed frontend Container App"
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}
