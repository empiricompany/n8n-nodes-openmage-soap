import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  NodeConnectionType,
} from 'n8n-workflow';
import { OpenMageSoapClient } from './utils';

export class OpenMageSoap implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenMage SOAP',
    name: 'openMageSoap',
    icon: 'file:images/openmage.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Connect to OpenMage via SOAP API',
    codex: {
      categories: ['Sales', 'E-Commerce'],
      alias: ['magento', 'openmage', 'soap'],
      subcategories: {
        Sales: ['E-Commerce'],
      },
    },
    defaults: {
      name: 'OpenMage SOAP',
    },
		// @ts-ignore - node-class-description-outputs-wrong
		inputs: [{ type: NodeConnectionType.Main }],
		// @ts-ignore - node-class-description-outputs-wrong
		outputs: [{ type: NodeConnectionType.Main }],
		usableAsTool: true,
    credentials: [
      {
        name: 'openMageSoapApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'sales_order.info',
            value: 'sales_order.info',
            description: 'Get detailed information about a specific order by increment ID',
						action: 'Get detailed information about a specific order by increment ID',
          },
        ],
        default: 'sales_order.info',
        noDataExpression: true,
        required: true,
      },
      {
        displayName: 'Increment ID',
        name: 'incrementId',
        type: 'string',
        default: '',
        description: 'Increment ID of the order',
        required: true,
      },
      {
        displayName: 'Verify Customer Email',
        name: 'checkCustomerEmail',
        type: 'boolean',
        default: false,
        description: 'Whether to verify that the order belongs to a specific customer',
      },
      {
        displayName: 'Customer Email',
        name: 'customerEmail',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            checkCustomerEmail: [true],
          },
        },
        description: 'Email of the customer to verify',
        required: true,
      },
    ],
  };

  // @ts-ignore
  async execute(this: IExecuteFunctions): Promise<any> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('openMageSoapApi');

    if (!credentials) {
      throw new NodeOperationError(this.getNode(), 'No credentials found!');
    }

    // Crea il client SOAP
    const soapClient = new OpenMageSoapClient();

    try {

      await soapClient.initialize({
        apiUrl: credentials.apiUrl as string,
        username: credentials.username as string,
        apiKey: credentials.apiKey as string,
        isWsComplianceMode: credentials.isWsComplianceMode as boolean,
        namespace: credentials.namespace as string
      });

			// Execute operations for each input item
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        try {
          const resourcePath = this.getNodeParameter('operation', itemIndex) as string;
          const incrementId = this.getNodeParameter('incrementId', itemIndex) as string;
          const checkCustomerEmail = this.getNodeParameter('checkCustomerEmail', itemIndex, false) as boolean;
          let customerEmail = '';

          if (checkCustomerEmail) {
            customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
          }

          const args = incrementId;
          const jsonData = await soapClient.call(resourcePath, args);

          if (checkCustomerEmail && customerEmail) {
            const verification = soapClient.verifyCustomerEmail(jsonData, customerEmail);

            if (!verification.isValid) {
              returnData.push({
                json: {
                  success: false,
                  message: verification.message,
                  data: null
                },
              });
              continue;
            }
          }

          returnData.push({
            json: {
              success: true,
              data: jsonData
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex: 0 });
    }

    return [returnData];
  }
}
