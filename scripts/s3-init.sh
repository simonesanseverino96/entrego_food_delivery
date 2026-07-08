#!/usr/bin/env bash
# Creates local S3 buckets in LocalStack for development.
set -euo pipefail

ENDPOINT=http://localhost:4566

echo "Creating S3 buckets in LocalStack..."
aws --endpoint-url "$ENDPOINT" s3 mb s3://entrego-media-local 2>/dev/null || true
aws --endpoint-url "$ENDPOINT" s3 mb s3://entrego-docs-local 2>/dev/null || true
echo "Done."
