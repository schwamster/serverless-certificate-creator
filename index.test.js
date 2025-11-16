const CreateCertificatePlugin = require('./index');

describe('CreateCertificatePlugin', () => {
  let plugin;
  let serverlessMock;
  let optionsMock;

  beforeEach(() => {
    // Mock serverless object
    serverlessMock = {
      service: {
        custom: {
          customCertificate: {
            certificateName: 'test.example.com',
            hostedZoneNames: 'example.com.',
            region: 'us-east-1'
          }
        }
      },
      providers: {
        aws: {
          getCredentials: jest.fn().mockReturnValue({}),
          sdk: {
            ACM: jest.fn(),
            Route53: jest.fn()
          }
        }
      },
      cli: {
        log: jest.fn(),
        consoleLog: jest.fn()
      }
    };

    optionsMock = {};
    plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
  });

  describe('isCustomCertificateArray', () => {
    test('should return false when customCertificate is an object', () => {
      expect(plugin.isCustomCertificateArray()).toBe(false);
    });

    test('should return true when customCertificate is an array', () => {
      serverlessMock.service.custom.customCertificate = [
        { certificateName: 'test1.example.com' },
        { certificateName: 'test2.example.com' }
      ];
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      expect(plugin.isCustomCertificateArray()).toBe(true);
      expect(plugin.certificateArrayLength).toBe(2);
    });

    test('should return false when customCertificate is not set', () => {
      serverlessMock.service.custom.customCertificate = null;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      expect(plugin.isCustomCertificateArray()).toBe(false);
    });
  });

  describe('getCustomCertificateDetails', () => {
    test('should return certificate details for single object config', () => {
      const details = plugin.getCustomCertificateDetails();

      expect(details).toBeDefined();
      expect(details.certificateName).toBe('test.example.com');
      expect(details.hostedZoneNames).toBe('example.com.');
    });

    test('should return null when customCertificate is not set', () => {
      serverlessMock.service.custom.customCertificate = null;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      expect(plugin.getCustomCertificateDetails()).toBeNull();
    });

    test('should return specific certificate when array index is set', () => {
      serverlessMock.service.custom.customCertificate = [
        { certificateName: 'test1.example.com', region: 'us-east-1' },
        { certificateName: 'test2.example.com', region: 'eu-west-1' }
      ];
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.certificateIndex = 1;

      const details = plugin.getCustomCertificateDetails();
      expect(details.certificateName).toBe('test2.example.com');
      expect(details.region).toBe('eu-west-1');
    });
  });

  describe('initializeVariables - array handling and lowercasing', () => {
    test('should lowercase hosted zone names', () => {
      serverlessMock.service.custom.customCertificate.hostedZoneNames = 'Example.COM.';
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(plugin.hostedZoneNames).toContain('example.com.');
    });

    test('should convert single hostedZoneId to array', () => {
      serverlessMock.service.custom.customCertificate.hostedZoneId = 'Z123456789';
      delete serverlessMock.service.custom.customCertificate.hostedZoneIds;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(Array.isArray(plugin.hostedZoneIds)).toBe(true);
      expect(plugin.hostedZoneIds).toContain('Z123456789');
    });

    test('should convert single hostedZoneName to array', () => {
      serverlessMock.service.custom.customCertificate.hostedZoneName = 'example.com.';
      delete serverlessMock.service.custom.customCertificate.hostedZoneNames;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(Array.isArray(plugin.hostedZoneNames)).toBe(true);
      expect(plugin.hostedZoneNames).toContain('example.com.');
    });

    test('should handle array of hostedZoneIds', () => {
      serverlessMock.service.custom.customCertificate.hostedZoneIds = ['Z111', 'Z222'];
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(plugin.hostedZoneIds).toEqual(['Z111', 'Z222']);
    });

    test('should handle array of hostedZoneNames and lowercase them', () => {
      serverlessMock.service.custom.customCertificate.hostedZoneNames = ['Example.COM.', 'Test.ORG.'];
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(plugin.hostedZoneNames).toEqual(['example.com.', 'test.org.']);
    });
  });

  describe('DNS record deduplication logic', () => {
    test('should deduplicate DNS validation records with same Type-Name', () => {
      // Simulate certificate with duplicate DNS validation records
      const certificate = {
        Certificate: {
          DomainValidationOptions: [
            {
              DomainName: 'test.example.com',
              ResourceRecord: {
                Type: 'CNAME',
                Name: '_abc123.test.example.com.',
                Value: '_xyz789.acm-validations.aws.'
              }
            },
            {
              DomainName: '*.test.example.com',
              ResourceRecord: {
                Type: 'CNAME',
                Name: '_abc123.test.example.com.', // Same as above
                Value: '_xyz789.acm-validations.aws.'
              }
            },
            {
              DomainName: 'other.example.com',
              ResourceRecord: {
                Type: 'CNAME',
                Name: '_def456.other.example.com.',
                Value: '_xyz789.acm-validations.aws.'
              }
            }
          ]
        }
      };

      // Test the deduplication logic directly
      const domainValidationOptions = certificate.Certificate.DomainValidationOptions;
      const uniqueRecords = Array.from(
        domainValidationOptions
          .reduce((map, record) =>
            map.set(`${record.ResourceRecord.Type}-${record.ResourceRecord.Name}`, record),
            new Map()
          )
          .values()
      );

      // Should deduplicate to 2 unique records
      expect(uniqueRecords.length).toBe(2);
      expect(uniqueRecords[0].ResourceRecord.Name).toBe('_abc123.test.example.com.');
      expect(uniqueRecords[1].ResourceRecord.Name).toBe('_def456.other.example.com.');
    });

    test('should keep records with different types but same name', () => {
      const records = [
        {
          ResourceRecord: {
            Type: 'A',
            Name: 'test.example.com.'
          }
        },
        {
          ResourceRecord: {
            Type: 'AAAA',
            Name: 'test.example.com.'
          }
        }
      ];

      const uniqueRecords = Array.from(
        records
          .reduce((map, record) =>
            map.set(`${record.ResourceRecord.Type}-${record.ResourceRecord.Name}`, record),
            new Map()
          )
          .values()
      );

      // Should keep both records as they have different types
      expect(uniqueRecords.length).toBe(2);
    });
  });

  describe('evaluateEnabled', () => {
    test('should return true when enabled is not explicitly set', () => {
      delete serverlessMock.service.custom.customCertificate.enabled;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      expect(plugin.evaluateEnabled()).toBe(true);
    });

    test('should return true when enabled is true', () => {
      serverlessMock.service.custom.customCertificate.enabled = true;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      expect(plugin.evaluateEnabled()).toBe(true);
    });

    test('should return false when enabled is false', () => {
      serverlessMock.service.custom.customCertificate.enabled = false;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      expect(plugin.evaluateEnabled()).toBe(false);
    });
  });

  describe('getCertificateProperty', () => {
    beforeEach(() => {
      plugin.listCertificates = jest.fn().mockResolvedValue([
        {
          DomainName: 'test.example.com',
          CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id'
        },
        {
          DomainName: 'other.example.com',
          CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/other-cert-id'
        }
      ]);
      plugin.initializeVariables();
    });

    test('should return certificate property when found', async () => {
      const result = await plugin.getCertificateProperty({
        address: 'CertificateArn',
        params: ['test.example.com']
      });

      expect(result.value).toBe('arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id');
    });

    test('should return null when certificate not found', async () => {
      const result = await plugin.getCertificateProperty({
        address: 'CertificateArn',
        params: ['nonexistent.example.com']
      });

      expect(result.value).toBeNull();
      expect(serverlessMock.cli.consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Returning a null value instead')
      );
    });

    test('should return null when property not found', async () => {
      const result = await plugin.getCertificateProperty({
        address: 'NonExistentProperty',
        params: ['test.example.com']
      });

      expect(result.value).toBeNull();
    });

    test('should handle array index parameter', async () => {
      serverlessMock.service.custom.customCertificate = [
        { certificateName: 'test1.example.com' },
        { certificateName: 'test2.example.com' }
      ];
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.listCertificates = jest.fn().mockResolvedValue([
        {
          DomainName: 'test2.example.com',
          CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test2-cert-id'
        }
      ]);

      const result = await plugin.getCertificateProperty({
        address: 'CertificateArn',
        params: ['test2.example.com', '1']
      });

      expect(plugin.certificateIndex).toBe(1);
      expect(result.value).toBe('arn:aws:acm:us-east-1:123456789012:certificate/test2-cert-id');
    });
  });
});
