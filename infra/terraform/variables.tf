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

variable "inventory_bundle_dir" {
  description = "Folder with the inventory Lambda bundle (nx run @acme/inventory:build)."
  type        = string
  default     = "../../apps/inventory/dist"
}
