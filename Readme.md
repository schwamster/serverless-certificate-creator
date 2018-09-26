# serverless-certificate-creator

this serverless plugin creates certificates that you need for your custom domains in API Gateway.

# Usage

        npm i serverless-certificate-creator --save-dev

open serverless.yml and add the following:

        plugins:
        - serverless-certificate-creator

        custom:
        customCertificate:
            certificateName: 'abc.somedomain.io' //required
            idempotencyToken: 'abcsomedomainio' //optional
            hostedZoneName: 'somedomain.io.' //required if hostedZoneId is not set
            hostedZoneId: 'XXXXXXXXX' //required if hostedZoneName is not set
            region: eu-west-1 // optional - default is us-east-1 which is required for custom api gateway domains of Type Edge (default)


now you can run:

        serverless create-cert