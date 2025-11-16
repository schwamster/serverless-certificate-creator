const CreateCertificatePlugin = require('./index');

describe('CreateCertificatePlugin', () => {
  let plugin;
  let serverlessMock;
  let optionsMock;
  let acmMock;
  let route53Mock;

  beforeEach(() => {
    // Mock ACM
    acmMock = {
      listCertificates: jest.fn(),
      describeCertificate: jest.fn(),
      requestCertificate: jest.fn(),
      deleteCertificate: jest.fn(),
      addTagsToCertificate: jest.fn(),
      listTagsForCertificate: jest.fn(),
      removeTagsFromCertificate: jest.fn(),
      waitFor: jest.fn()
    };

    // Mock Route53
    route53Mock = {
      listHostedZones: jest.fn(),
      listResourceRecordSets: jest.fn(),
      changeResourceRecordSets: jest.fn()
    };

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
            ACM: jest.fn(() => acmMock),
            Route53: jest.fn(() => route53Mock)
          }
        }
      },
      cli: {
        log: jest.fn(),
        consoleLog: jest.fn()
      },
      utils: {
        getVersion: jest.fn().mockReturnValue('3.0.0')
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

    test('should return false when custom is not set', () => {
      serverlessMock.service.custom = null;
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

    test('should return null when array index is out of bounds', () => {
      serverlessMock.service.custom.customCertificate = [
        { certificateName: 'test1.example.com' }
      ];
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.certificateIndex = 5;

      expect(plugin.getCustomCertificateDetails()).toBeNull();
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

    test('should set default region to us-east-1', () => {
      delete serverlessMock.service.custom.customCertificate.region;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(plugin.region).toBe('us-east-1');
    });

    test('should use custom region when specified', () => {
      serverlessMock.service.custom.customCertificate.region = 'eu-west-1';
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);
      plugin.initializeVariables();

      expect(plugin.region).toBe('eu-west-1');
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

  describe('listCertificates', () => {
    test('should list all certificates', async () => {
      const mockCertificates = [
        {
          CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test1',
          DomainName: 'test1.example.com'
        },
        {
          CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test2',
          DomainName: 'test2.example.com'
        }
      ];

      acmMock.listCertificates.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CertificateSummaryList: mockCertificates
        })
      });

      plugin.initializeVariables();
      const result = await plugin.listCertificates();

      expect(result).toEqual(mockCertificates);
      expect(acmMock.listCertificates).toHaveBeenCalled();
    });
  });

  describe('getExistingCertificate', () => {
    test('should return certificate when found', async () => {
      const mockCert = {
        CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test',
        DomainName: 'test.example.com',
        Status: 'ISSUED'
      };

      acmMock.listCertificates.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CertificateSummaryList: [mockCert]
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getExistingCertificate();

      expect(result).toEqual(mockCert);
      expect(acmMock.listCertificates).toHaveBeenCalled();
    });

    test('should return undefined when certificate not found', async () => {
      acmMock.listCertificates.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CertificateSummaryList: []
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getExistingCertificate();

      expect(result).toBeUndefined();
    });

    test('should return undefined when different certificate exists', async () => {
      const mockCert = {
        CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test',
        DomainName: 'other.example.com',
        Status: 'ISSUED'
      };

      acmMock.listCertificates.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CertificateSummaryList: [mockCert]
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getExistingCertificate();

      expect(result).toBeUndefined();
    });
  });

  describe('getHostedZoneIds', () => {
    test('should return hosted zones matching hostedZoneNames', async () => {
      route53Mock.listHostedZones.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          HostedZones: [
            { Id: '/hostedzone/Z123', Name: 'example.com.' },
            { Id: '/hostedzone/Z456', Name: 'other.com.' }
          ]
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getHostedZoneIds();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        hostedZoneId: 'Z123',
        Name: 'example.com'
      });
    });

    test('should return hosted zones matching hostedZoneIds', async () => {
      serverlessMock.service.custom.customCertificate.hostedZoneIds = ['Z123'];
      delete serverlessMock.service.custom.customCertificate.hostedZoneNames;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      route53Mock.listHostedZones.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          HostedZones: [
            { Id: '/hostedzone/Z123', Name: 'example.com.' },
            { Id: '/hostedzone/Z456', Name: 'other.com.' }
          ]
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getHostedZoneIds();

      expect(result).toHaveLength(1);
      expect(result[0].hostedZoneId).toBe('Z123');
    });

    test('should throw error when no hosted zone found', async () => {
      route53Mock.listHostedZones.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          HostedZones: [
            { Id: '/hostedzone/Z456', Name: 'other.com.' }
          ]
        })
      });

      plugin.initializeVariables();

      await expect(plugin.getHostedZoneIds()).rejects.toEqual('no hosted zone for domain found');
    });

    test('should strip trailing dot from zone name', async () => {
      route53Mock.listHostedZones.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          HostedZones: [
            { Id: '/hostedzone/Z123', Name: 'example.com.' }
          ]
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getHostedZoneIds();

      expect(result[0].Name).toBe('example.com');
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

  describe('getCertificatePropertyOld', () => {
    test('should return certificate property when found (legacy format)', async () => {
      // Use older version for legacy colon-separated format
      serverlessMock.utils.getVersion.mockReturnValue('2.72.0');
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      acmMock.listCertificates.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CertificateSummaryList: [
            {
              DomainName: 'test.example.com',
              CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test'
            }
          ]
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getCertificatePropertyOld('certificate:test.example.com:CertificateArn');

      expect(result).toBe('arn:aws:acm:us-east-1:123456789012:certificate/test');
    });

    test('should return null when certificate not found', async () => {
      serverlessMock.utils.getVersion.mockReturnValue('2.72.0');
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      acmMock.listCertificates.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CertificateSummaryList: []
        })
      });

      plugin.initializeVariables();
      const result = await plugin.getCertificatePropertyOld('certificate:nonexistent.example.com:CertificateArn');

      expect(result).toBeNull();
    });
  });

  describe('tagCertificate', () => {
    test('should add tags to certificate', async () => {
      serverlessMock.service.custom.customCertificate.tags = {
        Name: 'Test Certificate',
        Environment: 'production'
      };
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      acmMock.listTagsForCertificate.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Tags: []
        })
      });

      acmMock.addTagsToCertificate.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      plugin.initializeVariables();
      const certArn = 'arn:aws:acm:us-east-1:123456789012:certificate/test';
      await plugin.tagCertificate(certArn);

      expect(acmMock.addTagsToCertificate).toHaveBeenCalledWith({
        CertificateArn: certArn,
        Tags: expect.arrayContaining([
          { Key: 'Name', Value: 'Test Certificate' },
          { Key: 'Environment', Value: 'production' }
        ])
      });
    });

    test('should not call addTagsToCertificate when no tags specified', async () => {
      delete serverlessMock.service.custom.customCertificate.tags;
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      acmMock.listTagsForCertificate.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Tags: []
        })
      });

      plugin.initializeVariables();
      const certArn = 'arn:aws:acm:us-east-1:123456789012:certificate/test';
      await plugin.tagCertificate(certArn);

      expect(acmMock.addTagsToCertificate).not.toHaveBeenCalled();
    });

    test('should remove existing tags before adding new ones', async () => {
      serverlessMock.service.custom.customCertificate.tags = {
        Name: 'New Name'
      };
      plugin = new CreateCertificatePlugin(serverlessMock, optionsMock);

      acmMock.listTagsForCertificate.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Tags: [
            { Key: 'OldTag', Value: 'OldValue' }
          ]
        })
      });

      acmMock.removeTagsFromCertificate.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      acmMock.addTagsToCertificate.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      plugin.initializeVariables();
      const certArn = 'arn:aws:acm:us-east-1:123456789012:certificate/test';
      await plugin.tagCertificate(certArn);

      expect(acmMock.removeTagsFromCertificate).toHaveBeenCalled();
      expect(acmMock.addTagsToCertificate).toHaveBeenCalled();
    });
  });

  describe('reportDisabled', () => {
    test('should log disabled message', async () => {
      await plugin.reportDisabled();

      expect(serverlessMock.cli.log).toHaveBeenCalledWith(
        'serverless-certificate-creator: disabled.'
      );
    });
  });
});
