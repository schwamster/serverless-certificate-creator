'use strict';
const AWS = require('aws-sdk');
const delay = require('delay');

class CreateCertificatePlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.commands = {
      'create-cert': {
        usage: 'creates a certificate for an existing domain/hosted zone',
        lifecycleEvents: [
          'create'
        ]
      },
    };

    this.hooks = {
      'create-cert:create': this.createCertificate.bind(this),
    };
  }

  createCertificate() {
    let region = this.serverless.service.custom.customCertificate.region || 'us-east-1';
    let domain = this.serverless.service.custom.customCertificate.certificateName;
    let idempotencyToken = this.serverless.service.custom.customCertificate.idempotencyToken;


    this.serverless.cli.log(`Trying to create certificate for ${domain} in ${region} ...`);

    let acm = new AWS.ACM({ apiVersion: '2015-12-08', region: region });
    let params = {}
    return acm.listCertificates(params).promise().then(data => {

      if(data.CertificateSummaryList.filter(cert => cert.DomainName === domain).length > 0){
        this.serverless.cli.log(`Certificate for ${domain} in ${region} already exists. Skipping ...`);
        return;
      }

      let params = {
        DomainName: domain,
        ValidationMethod: 'DNS'
      };

      if (idempotencyToken) {
        Object.assign({}, params, { IdempotencyToken: idempotencyToken })
      }

      return acm.requestCertificate(params).promise().then(requestCertificateResponse => {
        this.serverless.cli.log('requested cert:' + JSON.stringify(requestCertificateResponse));

        var params = {
          CertificateArn: requestCertificateResponse.CertificateArn
        };

        return delay(10000).then(() => acm.describeCertificate(params).promise().then(certificate => {
          this.serverless.cli.log('got cert info: ' + JSON.stringify(certificate));

          var route53 = new AWS.Route53({ apiVersion: '2013-04-01' });
          var params = {
            ChangeBatch: {
              Changes: [
                {
                  Action: "CREATE",
                  ResourceRecordSet: {
                    Name: certificate.Certificate.DomainValidationOptions[0].ResourceRecord.Name,
                    ResourceRecords: [
                      {
                        Value: certificate.Certificate.DomainValidationOptions[0].ResourceRecord.Value
                      }
                    ],
                    TTL: 60,
                    Type: certificate.Certificate.DomainValidationOptions[0].ResourceRecord.Type
                  }
                }
              ],
              Comment: `DNS Validation for certificate ${certificate.Certificate.DomainValidationOptions[0].DomainName}`
            },
            HostedZoneId: this.serverless.service.custom.customCertificate.hostedZoneId
          };
          route53.changeResourceRecordSets(params).promise().then(recordSetResult => {
            this.serverless.cli.log('dns validation record created - soon the certificate is functional');
            console.log(JSON.stringify(recordSetResult));
          }).catch(error => {
            this.serverless.cli.log('could not create record set for dns validation', error);
            console.log('problem', error);
            throw error;
          });

        }).catch(error => {
          this.serverless.cli.log('could not get cert info', error);
          console.log('problem', error);
          throw error;
        }));


      }).catch(error => {
        this.serverless.cli.log('could not request cert', error);
        console.log('problem', error);
        throw error;
      });


    }).catch(error => {
      this.serverless.cli.log('could not get certs', error);
      console.log('problem', error);
      throw error;
    })
  }
}

module.exports = CreateCertificatePlugin;
