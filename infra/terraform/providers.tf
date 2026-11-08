# Every AWS call goes to MiniStack (local emulator). The credentials are MiniStack's dummy values;
# against real AWS this block would drop the endpoints and use real credentials.
provider "aws" {
  region     = var.region
  access_key = "test"
  secret_key = "test"

  skip_metadata_api_check = true
  s3_use_path_style       = true

  endpoints {
    apigatewayv2 = var.aws_endpoint
    appconfig    = var.aws_endpoint
    dynamodb     = var.aws_endpoint
    eventbridge  = var.aws_endpoint
    iam          = var.aws_endpoint
    lambda       = var.aws_endpoint
    sqs          = var.aws_endpoint
    sts          = var.aws_endpoint
  }

  default_tags {
    tags = { project = "contract-first-poc" }
  }
}
