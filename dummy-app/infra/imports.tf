# One-time import — delete after successful apply.

import {
  to = azurerm_container_app.dummy_app
  id = "${data.azurerm_resource_group.rg.id}/providers/Microsoft.App/containerApps/ca-dummy-target"
}
