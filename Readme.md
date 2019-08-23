# serverless-certificate-creator

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-certificate-creator.svg)](https://badge.fury.io/js/serverless-certificate-creator)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/amplify-education/serverless-domain-manager/master/LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/235fe249b8354a3db0cc5926dba47899)](https://www.codacy.com/app/CFER/serverless-certificate-creator?utm_source=github.com&utm_medium=referral&utm_content=schwamster/serverless-certificate-creator&utm_campaign=badger)
[![npm downloads](https://img.shields.io/npm/dt/serverless-certificate-creator.svg?style=flat)](https://www.npmjs.com/package/serverless-certificate-creator)
[![CircleCI](https://circleci.com/gh/schwamster/serverless-certificate-creator/tree/master.svg?style=svg)](https://circleci.com/gh/schwamster/serverless-certificate-creator/tree/master)

# Table of Contents

- [Description](#description)
- [Serverless Framework](#serverless-framework)
- [Usage Requirements](#usage-requirements)
- [Usage](#usage)
- [Combine with serverless-domain-manager](#combine-with-serverless-domain-manager)
  * [Examples](#examples)
- [License](#license)

# Description

This serverless plugin creates certificates that you need for your custom domains in API Gateway.
Use this in your CICD flow to automatically create a certificate, create the necessary route53 recordsets to validate the certificate with Dns-Validation and finally wait until the certificate has been validated.

# Serverless Framework

This package is made for the [serverless framework](https://serverless.com).

You can install it like this:

```bash
# Install the serverless cli
npm install -g serverless

# Or, update the serverless cli from a previous version
npm update -g serverless
```

Check out their getting started guide for more information [here](https://serverless.com/framework/docs/getting-started/).

# Usage Requirements

Make sure you have the following installed before starting:
* [nodejs](https://nodejs.org/en/download/)
* [npm](https://www.npmjs.com/get-npm?utm_source=house&utm_medium=homepage&utm_campaign=free%20orgs&utm_term=Install%20npm)
* [serverless](https://serverless.com/framework/docs/providers/aws/guide/installation/)

# Usage

        npm i serverless-certificate-creator --save-dev

open serverless.yml and add the following:

        plugins:
        - serverless-certificate-creator

        ...

        custom:
            customCertificate:
                //required
                certificateName: 'abc.somedomain.io'
                //optional
                idempotencyToken: 'abcsomedomainio'
                //required if hostedZoneId is not set
                hostedZoneName: 'somedomain.io.' 
                //required if hostedZoneName is not set
                hostedZoneId: 'XXXXXXXXX'
                // optional default is false. if you set it to true you will get a new file (after executing serverless create-cert), that contains certificate info that you can use in your deploy pipeline
                writeCertInfoToFile: false 
                // optional, only used when writeCertInfoToFile is set to true. It sets the name of the file containing the cert info
                certInfoFileName: 'cert-info.yml' 
                // optional - default is us-east-1 which is required for custom api gateway domains of Type Edge (default)
                region: eu-west-1
                //optional - see SubjectAlternativeNames https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ACM.html#requestCertificate-property
                subjectAlternativeNames : 
                    - 'www.somedomain.io'
                    - 'def.somedomain.io'
                //optional - see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ACM.html#addTagsToCertificate-property
                //if you want to give your certificate a name that is shown in the ACM Console you can add a Tag with the key "Name"
                tags:
                    Name: 'somedomain.com'
                    Environment: 'prod'


now you can run:

        serverless create-cert

# Combine with serverless-domain-manager

If you combine this plugin with [serverless-domain-manager](https://github.com/amplify-education/serverless-domain-manager) you can automate the complete process of creating a custom domain with a certificate.
I found serverless-domain-manager very useful but i also wanted to be able to automatically create the certificate for the newly generated custom domain.


## Examples

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
                enabled: true // optional - default is true. For some stages you may not want to use certificates (and custom domains associated with it).

Now you can run:

        serverless create-cert
        serverless create_domain

Please make sure to check out the complete sample project [here](https://github.com/schwamster/serverless-certificate-creator/tree/master/examples/certificate-creator-example).

### License

Copyright (c) 2018 Bastian Töpfer, contributors.

Released under the [MIT license](https://tldrlegal.com/license/mit-license).
