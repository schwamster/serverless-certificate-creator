# Serverless Certificate Creator Example

This example shows a common way to use this plugin. 
It creates a lambda fronted by an api gateway. The basepath is mapped to the configured
domain (this is done with the [serverless-domain-manager](https://github.com/amplify-education/serverless-domain-manager)). The required certificate is then created with the serverless-certificate-creator plugin.

# Table of Contents

- [Running](#running)
  * [Install the serverless framework](#install-the-serverless-framework)
  * [Install the dependencies](#install-the-dependencies)
  * [Change the config -> serverless.yml](#change-the-config---serverlessyml)
  * [Create the custom domain](#create-the-custom-domain)  * [Create the certificate](#create-the-certificate)  * [Deploy the function](#deploy-the-function)
  * [Test it out](#test-it-out)

# Running

## Install the serverless framework

You can install it like this:

```bash
# Install the serverless cli
npm install -g serverless

# Or, update the serverless cli from a previous version
npm update -g serverless
```

Check out their getting started guide for more information [here](https://serverless.com/framework/docs/getting-started/).

## Install the dependencies 


```bash

npm i serverless-certificate-creator --save-dev
npm i serverless-domain-manager --save-dev

```
## Change the config -> serverless.yml

Change the domain/certificate names in the custom section according to your available hosted zones.

customDomain->domainName
customDomain->certificateName

customCertificate->certificateName
customCertificate->idempotencyToken
customCertificate->hostedZoneName


## Create the custom domain

        serverless create_domain

!This may take up to 40 minutes

For more info please check out the plugins [github page](https://github.com/amplify-education/serverless-domain-manager)

## Create the certificate

        serverless create-cert

## Deploy the function

        serverless deploy

## Test it out

After the custom domain is created, the certificate created and the function deployed you should be able to reach your function via your custom domain: https://yourdomain.com/example/something
