"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenMageSoapClient = void 0;
const soap = __importStar(require("soap"));
class OpenMageSoapClient {
    constructor() {
        this.client = null;
        this.sessionId = null;
        this.apiEndpoint = null;
        this.serviceName = null;
        this.portName = null;
        this.credentials = null;
    }
    /**
     * Inizializza la connessione con l'API SOAP
     */
    async initialize(credentials) {
        try {
            this.credentials = credentials;
            const soapClient = await soap.createClientAsync(credentials.apiUrl);
            this.client = soapClient;
            this.apiEndpoint = credentials.apiUrl.replace(/\?wsdl=1|\?wsdl/, '');
            const services = this.client.describe();
            const serviceNames = Object.keys(services);
            if (serviceNames.length === 0) {
                throw new Error('No SOAP service found');
            }
            this.serviceName = serviceNames[0];
            const portNames = Object.keys(services[this.serviceName]);
            if (portNames.length === 0) {
                throw new Error(`No port found for service ${this.serviceName}`);
            }
            this.portName = portNames[0];
            await this.login(credentials.username, credentials.apiKey);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error connecting to SOAP API: ${errorMessage}`);
        }
    }
    /**
     * Effettua il login e ottiene un sessionId
     */
    async login(username, apiKey) {
        if (!this.client || !this.serviceName || !this.portName) {
            throw new Error('SOAP client not initialized');
        }
        try {
            const loginResult = await new Promise((resolve, reject) => {
                this.client[this.serviceName][this.portName].login({
                    username,
                    apiKey
                }, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
            if (!loginResult) {
                throw new Error('Authentication error with SOAP API');
            }
            this.sessionId = loginResult;
            if (typeof loginResult === 'object' && loginResult !== null) {
                const sessionObj = loginResult;
                if (sessionObj.loginReturn && sessionObj.loginReturn['$value']) {
                    this.sessionId = sessionObj.loginReturn['$value'];
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Login error: ${errorMessage}`);
        }
    }
    /**
     * Esegue una chiamata all'API SOAP
     */
    async call(resourcePath, args) {
        var _a;
        if (!this.client || !this.sessionId || !this.apiEndpoint) {
            throw new Error('SOAP client not initialized or invalid session');
        }
        const isWsComplianceMode = ((_a = this.credentials) === null || _a === void 0 ? void 0 : _a.isWsComplianceMode) || false;
        const soapEnvelope = this.createSoapEnvelope(this.sessionId, resourcePath, args);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
        try {
            const headers = {
                'Content-Type': 'text/xml;charset=UTF-8',
            };
            if (isWsComplianceMode) {
                headers['SOAPAction'] = 'urn:Action';
            }
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers,
                body: soapEnvelope,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseText = await response.text();
            if (responseText.includes('<faultcode>')) {
                throw new Error(`SOAP fault: ${responseText}`);
            }
            return this.xmlToJson(responseText);
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`SOAP call timeout: operation took more than 60 seconds to complete`);
            }
            else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Error in SOAP call: ${errorMessage}`);
            }
        }
    }
    /**
     * Verifica se l'email del cliente corrisponde a quella dell'ordine
     */
    verifyCustomerEmail(jsonData, customerEmail) {
        var _a, _b, _c, _d;
        let orderEmail = null;
        if ((_c = (_b = (_a = jsonData === null || jsonData === void 0 ? void 0 : jsonData.Body) === null || _a === void 0 ? void 0 : _a['ns1:salesOrderInfoResponse']) === null || _b === void 0 ? void 0 : _b.result) === null || _c === void 0 ? void 0 : _c.customer_email) {
            orderEmail = jsonData.Body['ns1:salesOrderInfoResponse'].result.customer_email;
        }
        else if ((_d = jsonData === null || jsonData === void 0 ? void 0 : jsonData.result) === null || _d === void 0 ? void 0 : _d.customer_email) {
            orderEmail = jsonData.result.customer_email;
        }
        else if (jsonData === null || jsonData === void 0 ? void 0 : jsonData.customer_email) {
            orderEmail = jsonData.customer_email;
        }
        if (!orderEmail) {
            return {
                isValid: false,
                orderEmail: null,
                message: `Unable to verify customer email: email not found in order data`
            };
        }
        if (orderEmail.toLowerCase() !== customerEmail.toLowerCase()) {
            return {
                isValid: false,
                orderEmail,
                message: `The order does not belong to the customer with email ${customerEmail}. Order email: ${orderEmail}`
            };
        }
        return {
            isValid: true,
            orderEmail,
            message: null
        };
    }
    /**
     * Converte una risposta XML SOAP in un oggetto JSON
     */
    xmlToJson(xml) {
        try {
            const callReturnMatch = xml.match(/<callReturn[^>]*>([\s\S]*?)<\/callReturn>/);
            if (!callReturnMatch)
                return { success: false, error: 'No callReturn found in XML' };
            const itemRegex = /<item>[\s\S]*?<key[^>]*>([\s\S]*?)<\/key>[\s\S]*?<value[^>]*>([\s\S]*?)<\/value>[\s\S]*?<\/item>/g;
            const callReturnContent = callReturnMatch[1];
            let match;
            const result = {};
            while ((match = itemRegex.exec(callReturnContent)) !== null) {
                const key = match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const value = match[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                if (value === '' || value.includes('xsi:nil="true"')) {
                    result[key] = null;
                }
                else if (value.includes('<item>')) {
                    result[key] = this.xmlToJson(`<callReturn>${value}</callReturn>`);
                }
                else {
                    result[key] = value;
                }
            }
            return result;
        }
        catch (error) {
            return { success: false, error: 'Error converting XML to JSON' };
        }
    }
    /**
     * Prepara gli argomenti XML per una richiesta SOAP
     */
    prepareArgsXml(args, resourcePath) {
        if (typeof args === 'string') {
            return `<args>${args}</args>`;
        }
        else if (typeof args === 'object' && args !== null) {
            if (resourcePath === 'sales_order.list' && args.complex_filter) {
                const filtersXml = `
        <args>
          <filters>
            <complex_filter>
              ${args.complex_filter.map((filter) => `
              <item>
                <key>${filter.key}</key>
                <value>
                  <key>${filter.value.key}</key>
                  <value>${filter.value.value}</value>
                </value>
              </item>`).join('')}
            </complex_filter>
          </filters>
        </args>`.replace(/\s+/g, ' ').trim();
                return filtersXml;
            }
            return `<args>${JSON.stringify(args)}</args>`;
        }
        return '';
    }
    /**
     * Crea una richiesta SOAP per il metodo call
     */
    createSoapEnvelope(sessionId, resourcePath, args) {
        var _a, _b;
        const argsXml = this.prepareArgsXml(args, resourcePath);
        const isWsComplianceMode = ((_a = this.credentials) === null || _a === void 0 ? void 0 : _a.isWsComplianceMode) || false;
        const namespace = ((_b = this.credentials) === null || _b === void 0 ? void 0 : _b.namespace) || 'urn:OpenMage';
        if (!isWsComplianceMode) {
            return `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${namespace}">
  <SOAP-ENV:Body>
    <ns1:call>
      <sessionId>${sessionId}</sessionId>
      <resourcePath>${resourcePath}</resourcePath>
      ${argsXml}
    </ns1:call>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
        }
        else {
            return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <call xmlns="${namespace}">
      <sessionId>${sessionId}</sessionId>
      <resourcePath>${resourcePath}</resourcePath>
      ${argsXml}
    </call>
  </soap:Body>
</soap:Envelope>`;
        }
    }
}
exports.OpenMageSoapClient = OpenMageSoapClient;
