variable "region" {
  description = "AWS region emulated by MiniStack."
  type        = string
  default     = "us-east-1"
}

variable "aws_endpoint" {
  description = "MiniStack URL as seen by Terraform."
  type        = string
  default     = "http://localhost:4566"
}

variable "lambda_aws_endpoint" {
  description = "MiniStack URL as seen by the Lambda (it runs inside the MiniStack container)."
  type        = string
  default     = "http://localhost:4566"
}

variable "bundles_dir" {
  description = "Folder that holds the Lambda apps; each bundle is <app>/dist (nx run <app>:build)."
  type        = string
  default     = "../../apps"
}
