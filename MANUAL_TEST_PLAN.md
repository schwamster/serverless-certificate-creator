# Manual Test Plan - Serverless Certificate Creator

This document provides a step-by-step manual test plan for verifying the functionality of serverless-certificate-creator plugin.

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed (`node --version`)
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials (`aws configure`)
- **Serverless Framework** installed globally (`npm install -g serverless`)
- **A Route53 Hosted Zone** for your domain (e.g., `example.com`)
- **Domain name** you want to create a certificate for (e.g., `test.example.com`)

## Test Setup

### 1. Create a Test Serverless Application

```bash
# Create a new directory for testing
mkdir test-certificate-creator
cd test-certificate-creator

# Initialize a new serverless project
serverless create --template aws-nodejs --name test-cert-app
```

### 2. Install the Plugin

```bash
# Install serverless-certificate-creator
npm init -y
npm install serverless-certificate-creator --save-dev
```

### 3. Configure serverless.yml

Edit your `serverless.yml` file to include the plugin and configuration:

```yaml
service: test-cert-app

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1  # Certificates for CloudFront/API Gateway must be in us-east-1

plugins:
  - serverless-certificate-creator

custom:
  customCertificate:
    certificateName: 'test.example.com'  # Replace with your domain
    hostedZoneNames: 'example.com.'      # Replace with your hosted zone (note the trailing dot)
    region: us-east-1                    # Required for API Gateway Edge certificates
    tags:
      Name: 'Test Certificate'
      Environment: 'test'

functions:
  hello:
    handler: handler.hello
```

**Important Configuration Notes:**
- `certificateName`: The domain name for your certificate
- `hostedZoneNames`: Your Route53 hosted zone name (must end with a dot)
- Alternatively, you can use `hostedZoneIds: 'Z1234567890ABC'` if you know your hosted zone ID
- `region: us-east-1` is required for API Gateway Edge-optimized endpoints

## Test Case 1: Create a Certificate

### Step 1: Run the create-cert command

```bash
serverless create-cert
```

**Expected Output:**
```
Serverless: Trying to create certificate for test.example.com in us-east-1 ...
Serverless: requested cert: arn:aws:acm:us-east-1:123456789:certificate/abc-123-def
Serverless: got cert info: arn:aws:acm:us-east-1:123456789:certificate/abc-123-def - PENDING_VALIDATION
Serverless: dns validation record(s) created - certificate is ready for use after validation has gone through
Serverless: waiting until certificate is validated...
Serverless: cert was successfully created and validated and can be used now
```

**What happens:**
1. Plugin checks if certificate already exists
2. Requests a new certificate from AWS ACM
3. Creates DNS validation records in Route53
4. Waits for AWS to validate the certificate (usually 5-10 minutes)

### Step 2: Verify in AWS Console

**ACM Console:**
1. Go to AWS Console → Certificate Manager (ACM)
2. Make sure you're in the correct region (`us-east-1`)
3. You should see your certificate with status "Issued"
4. Click on the certificate to see details
5. Verify the domain name matches `test.example.com`
6. Check the Tags section for the tags you configured

**Route53 Console:**
1. Go to AWS Console → Route53
2. Navigate to Hosted Zones → Your domain (`example.com`)
3. You should see a CNAME record for `_<random-string>.test.example.com`
4. This is the DNS validation record created by ACM

### Step 3: Verify with AWS CLI

```bash
# List certificates in ACM
aws acm list-certificates --region us-east-1

# Get detailed certificate info (replace with your certificate ARN)
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:123456789:certificate/abc-123-def --region us-east-1
```

**Expected:**
- Certificate status should be "ISSUED"
- Domain name should match your configured domain
- Validation method should be "DNS"

## Test Case 2: Idempotency - Run create-cert Again

### Step 1: Run create-cert again

```bash
serverless create-cert
```

**Expected Output:**
```
Serverless: Certificate for test.example.com in us-east-1 already exists with arn "arn:aws:acm:us-east-1:123456789:certificate/abc-123-def". Skipping certificate creation ...
```

**What to verify:**
- No new certificate is created
- Command completes successfully
- Existing certificate ARN is displayed

## Test Case 3: Certificate Info Summary

### Step 1: Deploy or run info command

```bash
serverless info
```

**Expected Output:**
```
Serverless Certificate Creator Summary
Certificate
  arn:aws:acm:us-east-1:123456789:certificate/abc-123-def => test.example.com
```

## Test Case 4: Remove the Certificate

### Step 1: Run the remove-cert command

```bash
serverless remove-cert
```

**Expected Output:**
```
Serverless: Trying to delete certificate for test.example.com in us-east-1 ...
Serverless: 1 dns validation record(s) deleted
Serverless: deleted cert: arn:aws:acm:us-east-1:123456789:certificate/abc-123-def
```

**What happens:**
1. Plugin finds the existing certificate
2. Deletes the DNS validation records from Route53
3. Deletes the certificate from ACM

### Step 2: Verify in AWS Console

**ACM Console:**
1. Go to AWS Console → Certificate Manager (ACM)
2. The certificate should no longer appear in the list

**Route53 Console:**
1. Go to AWS Console → Route53 → Hosted Zones → Your domain
2. The CNAME validation record should be deleted

### Step 3: Verify with AWS CLI

```bash
# List certificates - your certificate should not appear
aws acm list-certificates --region us-east-1

# Try to describe the certificate (should fail)
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:123456789:certificate/abc-123-def --region us-east-1
```

**Expected:**
- Certificate should not be in the list
- Describe command should return an error (ResourceNotFoundException)

## Test Case 5: Advanced - Multiple Certificates

### Step 1: Configure multiple certificates

Edit `serverless.yml`:

```yaml
custom:
  customCertificate:
    - certificateName: 'test1.example.com'
      hostedZoneNames: 'example.com.'
      region: us-east-1
      tags:
        Name: 'Test Certificate 1'
    - certificateName: 'test2.example.com'
      hostedZoneNames: 'example.com.'
      region: eu-west-1
      tags:
        Name: 'Test Certificate 2'
```

### Step 2: Create multiple certificates

```bash
serverless create-cert
```

**Expected:**
- Both certificates are created
- Each in their respective regions
- Both DNS validation records created in Route53

### Step 3: Verify both certificates

```bash
# Check us-east-1
aws acm list-certificates --region us-east-1

# Check eu-west-1
aws acm list-certificates --region eu-west-1
```

### Step 4: Remove multiple certificates

```bash
serverless remove-cert
```

**Expected:**
- Both certificates are deleted
- Both DNS validation records removed

## Test Case 6: Subject Alternative Names (SANs)

### Step 1: Configure with SANs

Edit `serverless.yml`:

```yaml
custom:
  customCertificate:
    certificateName: 'test.example.com'
    hostedZoneNames: 'example.com.'
    region: us-east-1
    subjectAlternativeNames:
      - 'www.test.example.com'
      - 'api.test.example.com'
```

### Step 2: Create certificate

```bash
serverless create-cert
```

### Step 3: Verify in ACM Console

**Expected:**
- Certificate covers all three domains:
  - test.example.com (primary)
  - www.test.example.com
  - api.test.example.com

## Troubleshooting

### Certificate validation taking too long

**Problem:** Certificate stays in "PENDING_VALIDATION" status for more than 10 minutes

**Solution:**
- Verify Route53 hosted zone name matches exactly (including trailing dot)
- Check that DNS records were created in Route53
- Ensure domain name servers point to AWS Route53

### Permission errors

**Problem:** AWS permission denied errors

**Solution:**
- Ensure your AWS credentials have permissions for:
  - ACM: RequestCertificate, DescribeCertificate, DeleteCertificate, AddTagsToCertificate
  - Route53: ListHostedZones, ChangeResourceRecordSets

### Certificate already in use

**Problem:** Cannot delete certificate - "Certificate is in use"

**Solution:**
- Certificate is attached to a CloudFront distribution or API Gateway
- Remove the certificate from those services first
- Then run `serverless remove-cert`

## Cleanup

After completing all tests:

```bash
# Remove any test certificates
serverless remove-cert

# Delete the test project
cd ..
rm -rf test-certificate-creator
```

## Test Checklist

- [ ] Create certificate successfully
- [ ] Certificate appears in ACM console
- [ ] DNS validation records created in Route53
- [ ] Certificate validates and becomes "ISSUED"
- [ ] Idempotency check - running create-cert again doesn't create duplicate
- [ ] Certificate info shows in serverless info
- [ ] Remove certificate successfully
- [ ] Certificate removed from ACM
- [ ] DNS validation records removed from Route53
- [ ] Multiple certificates (optional)
- [ ] Subject Alternative Names (optional)

## Expected Test Duration

- **Basic test (create + remove):** 10-15 minutes (mostly waiting for validation)
- **Full test suite:** 20-30 minutes

## Success Criteria

All tests pass if:
1. Certificates are created successfully in ACM
2. DNS validation completes automatically
3. Certificates can be listed and verified
4. Certificates can be removed cleanly
5. No resources are left behind after removal
