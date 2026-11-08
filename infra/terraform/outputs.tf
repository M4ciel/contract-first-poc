output "inventory_api_id" {
  description = "HTTP API id (pinned with the ms-custom-id tag)."
  value       = aws_apigatewayv2_api.inventory.id
}

output "inventory_base_url" {
  description = "Base URL of the inventory API, as seen from the host."
  value       = "${var.aws_endpoint}/_aws/execute-api/${aws_apigatewayv2_api.inventory.id}"
}

output "library_books_table" {
  value = aws_dynamodb_table.books.name
}

output "library_loans_table" {
  value = aws_dynamodb_table.loans.name
}

output "library_event_bus" {
  value = aws_cloudwatch_event_bus.library.name
}

output "notifications_reminders_table" {
  value = aws_dynamodb_table.reminders.name
}
