# serverless-certificate-creator

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-certificate-creator.svg)](https://badge.fury.io/js/serverless-certificate-creator)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/amplify-education/serverless-domain-manager/master/LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/235fe249b8354a3db0cc5926dba47899)](https://www.codacy.com/app/CFER/serverless-certificate-creator?utm_source=github.com&utm_medium=referral&utm_content=schwamster/serverless-certificate-creator&utm_campaign=badger)
[![npm downloads](https://img.shields.io/npm/dt/serverless-certificate-creator.svg?style=flat)](https://www.npmjs.com/package/serverless-certificate-creator)

This serverless plugin creates certificates that you need for your custom domains in API Gateway.
Use this in your CICD flow to automatically create a certificate, create the necessary route53 recordsets to validate the certificate with Dns-Validation and finally wait until the certificate has been validated.

# Usage

        npm i serverless-certificate-creator --save-dev

open serverless.yml and add the following:

        plugins:
        - serverless-certificate-creator

        ...

        custom:
            customCertificate:
                certificateName: 'abc.somedomain.io' //required
                idempotencyToken: 'abcsomedomainio' //optional
                hostedZoneName: 'somedomain.io.' //required if hostedZoneId is not set
                hostedZoneId: 'XXXXXXXXX' //required if hostedZoneName is not set
                region: eu-west-1 // optional - default is us-east-1 which is required for custom api gateway domains of Type Edge (default)


now you can run:

        serverless create-cert

# Combine with serverless-domain-manager

If you combine this plugin with serverless-domain-manager you can automate the complete process of creating a custom domain with a certificate.
I found serverless-domain-manager very useful but i also wanted to be able to automatically create the certificate for the newly generated custom domain.


## Example

Install the plugins:

        npm i serverless-certificate-creator --save-dev
        npm i serverless-domain-manager --save-dev

Open serverless.yml and add the following:

        plugins:
        - serverless-certificate-creator
        - serverless-domain-manager

        ...

        custom:
            customDomain:
                domainName: abc.somedomain.io
                certificateName: 'abc.somedomain.io'
                basePath: ''
                stage: ${self:provider.stage}
                createRoute53Record: true
            customCertificate:
                certificateName: 'abc.somedomain.io' //required
                idempotencyToken: 'abcsomedomainio' //optional
                hostedZoneName: 'somedomain.io.' //required if hostedZoneId is not set
                hostedZoneId: 'XXXXXXXXX' //required if hostedZoneName is not set
                region: eu-west-1 // optional - default is us-east-1 which is required for custom api gateway domains of Type Edge (default)

Now you can run:

        serverless create-cert
        serverless create_domain
