import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class OpenMageSoapApi implements ICredentialType {
  name = 'openMageSoapApi';
  displayName = 'OpenMage SOAP API';
  documentationUrl = 'https://www.openmage.org/documentation/';
  properties: INodeProperties[] = [
    {
      displayName: 'API URL',
      name: 'apiUrl',
      type: 'string',
      default: 'https://your-store.com/api/soap/?wsdl',
      placeholder: 'https://your-store.com/api/soap/?wsdl',
      required: true,
    },
    {
      displayName: 'Username',
      name: 'username',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
    },
    {
      displayName: 'WS-Compliance Mode',
      name: 'isWsComplianceMode',
      type: 'boolean',
      default: false,
      description: 'Enable this option for servers that fully comply with WS standards',
    },
    {
      displayName: 'SOAP Namespace',
      name: 'namespace',
      type: 'options',
      options: [
        {
          name: 'OpenMage',
          value: 'urn:OpenMage',
        },
        {
          name: 'Magento',
          value: 'urn:Magento',
        },
      ],
      default: 'urn:OpenMage',
      description: 'The namespace to use in SOAP requests',
    },
  ];
}
