variable "base_name" {
  description = "Base name used to derive resource names"
  type        = string
  default     = "ai-obs-poc"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "swedencentral"
}

variable "resource_group_name" {
  description = "Name of the resource group to deploy into"
  type        = string
}

variable "acr_name" {
  description = "Name of the existing Azure Container Registry"
  type        = string
  default     = "aiobservabilityneu"
}

variable "container_image" {
  description = "Container image to deploy (ACR image reference)"
  type        = string
  default     = "mcr.microsoft.com/hello-world"
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID (GUID) for KQL queries"
  type        = string
}

variable "github_token" {
  description = "GitHub PAT for issue creation"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repo in owner/repo format"
  type        = string
}

variable "frontend_container_image" {
  description = "Container image for the React frontend (ACR image reference)"
  type        = string
  default     = "mcr.microsoft.com/hello-world"
}
variable "backend_container_image" {
  description = "Container image for the backend (ACR image reference)"
  type        = string
  default     = "mcr.microsoft.com/hello-world"
}