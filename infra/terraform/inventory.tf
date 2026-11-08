# Inventory service: Lambda + HTTP API + two DynamoDB tables, seeded with the same book ids as
# the backend's catalog (apps/api/src/books/book.repository.ts).

locals {
  name = "acme-inventory"

  # Copies per book. Book 1 has two copies; book 2 has none left, to demo 409 book-unavailable.
  seed_books = merge(
    { "7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a" = 2 },
    { for n in range(2, 26) : format("00000000-0000-4000-8000-%012d", n) => n == 2 ? 0 : 3 },
  )
}

resource "aws_dynamodb_table" "stock" {
  name         = "${local.name}-stock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "bookId"

  attribute {
    name = "bookId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "reservations" {
  name         = "${local.name}-reservations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_dynamodb_table_item" "stock" {
  for_each   = local.seed_books
  table_name = aws_dynamodb_table.stock.name
  hash_key   = aws_dynamodb_table.stock.hash_key

  item = jsonencode({
    bookId         = { S = each.key }
    totalCopies    = { N = tostring(each.value) }
    reservedCopies = { N = "0" }
  })

  # Reservations change `reservedCopies` at runtime; Terraform only seeds the item.
  lifecycle {
    ignore_changes = [item]
  }
}

data "archive_file" "inventory" {
  type        = "zip"
  source_dir  = var.inventory_bundle_dir
  output_path = "${path.module}/.build/inventory.zip"
  excludes    = ["index.mjs.map"]
}

resource "aws_iam_role" "inventory" {
  name = "${local.name}-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "inventory" {
  name = "dynamodb"
  role = aws_iam_role.inventory.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
      Resource = [aws_dynamodb_table.stock.arn, aws_dynamodb_table.reservations.arn]
    }]
  })
}

resource "aws_lambda_function" "inventory" {
  function_name    = local.name
  role             = aws_iam_role.inventory.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.inventory.output_path
  source_code_hash = data.archive_file.inventory.output_base64sha256
  memory_size      = 256
  timeout          = 10

  environment {
    variables = {
      STOCK_TABLE        = aws_dynamodb_table.stock.name
      RESERVATIONS_TABLE = aws_dynamodb_table.reservations.name
      AWS_ENDPOINT_URL   = var.lambda_aws_endpoint
    }
  }
}

resource "aws_apigatewayv2_api" "inventory" {
  name          = local.name
  protocol_type = "HTTP"
  # MiniStack keeps this id across applies, so the invoke URL is stable:
  # <endpoint>/_aws/execute-api/inventory/...
  tags = { "ms-custom-id" = "inventory" }
}

resource "aws_apigatewayv2_integration" "inventory" {
  api_id                 = aws_apigatewayv2_api.inventory.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.inventory.invoke_arn
  payload_format_version = "2.0"
}

# One route per contract operation; anything else is answered by API Gateway with 404.
resource "aws_apigatewayv2_route" "inventory" {
  for_each  = toset(["GET /v1/inventories/{bookId}", "POST /v1/reservations"])
  api_id    = aws_apigatewayv2_api.inventory.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.inventory.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.inventory.execution_arn}/*/*"
}
