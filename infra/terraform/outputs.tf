output "inventory_api_id" {
  description = "HTTP API id (pinned with the ms-custom-id tag)."
  value       = aws_apigatewayv2_api.inventory.id
}

output "inventory_base_url" {
  description = "Base URL of the inventory API, as seen from the host."
  value       = "${var.aws_endpoint}/_aws/execute-api/${aws_apigatewayv2_api.inventory.id}"
}
