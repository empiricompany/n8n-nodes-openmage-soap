"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenMageSoap = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
class OpenMageSoap {
    constructor() {
        this.description = {
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
                color: '#FB0E70',
            },
            inputs: ["main" /* Main */],
            outputs: ["main" /* Main */],
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('openMageSoapApi');
        if (!credentials) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No credentials found!');
        }
        // Crea il client SOAP
        const soapClient = new utils_1.OpenMageSoapClient();
        try {
            // Inizializza il client con le credenziali
            await soapClient.initialize({
                apiUrl: credentials.apiUrl,
                username: credentials.username,
                apiKey: credentials.apiKey,
                isWsComplianceMode: credentials.isWsComplianceMode,
                namespace: credentials.namespace
            });
            // Esegui le operazioni per ogni elemento in input
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                try {
                    // Usa direttamente il valore di operation come resourcePath
                    const resourcePath = this.getNodeParameter('operation', itemIndex);
                    const incrementId = this.getNodeParameter('incrementId', itemIndex);
                    const checkCustomerEmail = this.getNodeParameter('checkCustomerEmail', itemIndex, false);
                    let customerEmail = '';
                    if (checkCustomerEmail) {
                        customerEmail = this.getNodeParameter('customerEmail', itemIndex);
                    }
                    // Imposta l'ID incrementale come argomento
                    const args = incrementId;
                    // Esegui la chiamata all'API SOAP
                    const jsonData = await soapClient.call(resourcePath, args);
                    // Se è richiesta la verifica dell'email del cliente, controlla che corrisponda
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
                    // Restituisci il risultato in formato JSON
                    returnData.push({
                        json: {
                            success: true,
                            data: jsonData
                        },
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), errorMessage, { itemIndex });
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), errorMessage, { itemIndex: 0 });
        }
        return [returnData];
    }
}
exports.OpenMageSoap = OpenMageSoap;
