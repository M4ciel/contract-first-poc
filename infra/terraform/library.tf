# Library backend resources: catalog and loans tables, and the event bus with the notifications
# consumer. The backend itself runs as a container (compose.yaml); in AWS it would be ECS or App
# Runner with an IAM role for these resources. Feature flags live in Flagsmith (compose.yaml).

locals {
  # Single seed for the catalog and the stock. apps/api tests check that the in-memory catalog
  # (SEED_BOOKS) matches it.
  seed_books = { for book in jsondecode(file("${path.module}/seed/books.json")) : book.id => book }
}

# ---------------------------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------------------------

resource "aws_dynamodb_table" "books" {
  name         = "acme-library-books"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_dynamodb_table_item" "books" {
  for_each   = local.seed_books
  table_name = aws_dynamodb_table.books.name
  hash_key   = aws_dynamodb_table.books.hash_key

  item = jsonencode({
    id          = { S = each.value.id }
    title       = { S = each.value.title }
    authors     = { L = [for author in each.value.authors : { S = author }] }
    publishedAt = { S = each.value.publishedAt }
    createdAt   = { S = each.value.createdAt }
  })
}

resource "aws_dynamodb_table" "loans" {
  name         = "acme-library-loans"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# ---------------------------------------------------------------------------------------------
# Domain events: backend → EventBridge → SQS (+ DLQ) → notifications Lambda
# ---------------------------------------------------------------------------------------------

resource "aws_cloudwatch_event_bus" "library" {
  name = "acme-library"
}

resource "aws_sqs_queue" "loan_events_dlq" {
  name                      = "acme-notifications-loan-events-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "loan_events" {
  name                       = "acme-notifications-loan-events"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.loan_events_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_cloudwatch_event_rule" "loan_created" {
  name           = "acme-notifications-loan-created"
  event_bus_name = aws_cloudwatch_event_bus.library.name
  event_pattern = jsonencode({
    source        = ["acme.library"]
    "detail-type" = ["loan.created.v1"]
  })
}

resource "aws_cloudwatch_event_target" "loan_created" {
  rule           = aws_cloudwatch_event_rule.loan_created.name
  event_bus_name = aws_cloudwatch_event_bus.library.name
  arn            = aws_sqs_queue.loan_events.arn
}

resource "aws_sqs_queue_policy" "loan_events" {
  queue_url = aws_sqs_queue.loan_events.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.loan_events.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_cloudwatch_event_rule.loan_created.arn } }
    }]
  })
}

resource "aws_dynamodb_table" "reminders" {
  name         = "acme-notifications-reminders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

data "archive_file" "notifications" {
  type        = "zip"
  source_dir  = "${var.bundles_dir}/notifications/dist"
  output_path = "${path.module}/.build/notifications.zip"
  excludes    = ["index.mjs.map"]
}

resource "aws_iam_role" "notifications" {
  name = "acme-notifications-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "notifications" {
  name = "queue-and-table"
  role = aws_iam_role.notifications.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = aws_sqs_queue.loan_events.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.reminders.arn
      },
    ]
  })
}

resource "aws_lambda_function" "notifications" {
  function_name    = "acme-notifications"
  role             = aws_iam_role.notifications.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.notifications.output_path
  source_code_hash = data.archive_file.notifications.output_base64sha256
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      REMINDERS_TABLE  = aws_dynamodb_table.reminders.name
      AWS_ENDPOINT_URL = var.lambda_aws_endpoint
    }
  }
}

resource "aws_lambda_event_source_mapping" "loan_events" {
  event_source_arn        = aws_sqs_queue.loan_events.arn
  function_name           = aws_lambda_function.notifications.arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
}
