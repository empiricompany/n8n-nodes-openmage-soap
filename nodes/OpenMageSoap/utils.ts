import * as soap from 'soap';

/**
 * Interface for SOAP client
 */
interface SoapClient {
  [method: string]: any;
  login(args: any, callback: (err: Error | null, result: any) => void): void;
}

/**
 * Interfaccia per le credenziali OpenMage SOAP
 */
interface OpenMageSoapCredentials {
  apiUrl: string;
  username: string;
  apiKey: string;
  isWsComplianceMode?: boolean;
  namespace?: string;
}

export class OpenMageSoapClient {
  private client: SoapClient | null = null;
  private sessionId: string | null = null;
  private apiEndpoint: string | null = null;
  private serviceName: string | null = null;
  private portName: string | null = null;
  private credentials: OpenMageSoapCredentials | null = null;

	/**
	 * Initialize the SOAP API connection
	 */
  async initialize(credentials: OpenMageSoapCredentials): Promise<void> {
    try {
      this.credentials = credentials;
      const soapClient = await soap.createClientAsync(credentials.apiUrl);
      this.client = soapClient as unknown as SoapClient;
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error connecting to SOAP API: ${errorMessage}`);
    }
  }

	/**
	 * Performs login and obtains a sessionId
	 */
  private async login(username: string, apiKey: string): Promise<void> {
    if (!this.client || !this.serviceName || !this.portName) {
      throw new Error('SOAP client not initialized');
    }

    try {
      const loginResult = await new Promise<string>((resolve, reject) => {
        this.client![this.serviceName!][this.portName!].login({
          username,
          apiKey
        }, (err: Error | null, result: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if (!loginResult) {
        throw new Error('Authentication error with SOAP API');
      }

      this.sessionId = loginResult;

      if (typeof loginResult === 'object' && loginResult !== null) {
        const sessionObj = loginResult as any;
        if (sessionObj.loginReturn && sessionObj.loginReturn['$value']) {
          this.sessionId = sessionObj.loginReturn['$value'];
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Login error: ${errorMessage}`);
    }
  }

	/**
	 * Executes a SOAP API call
	 */
  async call(resourcePath: string, args: any): Promise<any> {
    if (!this.client || !this.sessionId || !this.apiEndpoint) {
      throw new Error('SOAP client not initialized or invalid session');
    }

    const isWsComplianceMode = this.credentials?.isWsComplianceMode || false;
    const soapEnvelope = this.createSoapEnvelope(this.sessionId, resourcePath, args);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    try {
      const headers: Record<string, string> = {
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
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`SOAP call timeout: operation took more than 30 seconds to complete`);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Error in SOAP call: ${errorMessage}`);
      }
    }
  }

	/**
	 * Verifies if the customer email matches the order email
	 */
  verifyCustomerEmail(jsonData: any, customerEmail: string): { isValid: boolean; orderEmail: string | null; message: string | null } {
    let orderEmail = null;

    if (jsonData?.Body?.['ns1:salesOrderInfoResponse']?.result?.customer_email) {
      orderEmail = jsonData.Body['ns1:salesOrderInfoResponse'].result.customer_email;
    } else if (jsonData?.result?.customer_email) {
      orderEmail = jsonData.result.customer_email;
    } else if (jsonData?.customer_email) {
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
        message: `The order does not belong to the customer with email ${customerEmail}.`
      };
    }

    return {
      isValid: true,
      orderEmail,
      message: null
    };
  }

	/**
	 * Converts a SOAP XML response to a JSON object
	 */
  private xmlToJson(xml: string): any {
    try {
      const callReturnMatch = xml.match(/<callReturn[^>]*>([\s\S]*?)<\/callReturn>/);
      if (!callReturnMatch) return { success: false, error: 'No callReturn found in XML' };

      const itemRegex = /<item>[\s\S]*?<key[^>]*>([\s\S]*?)<\/key>[\s\S]*?<value[^>]*>([\s\S]*?)<\/value>[\s\S]*?<\/item>/g;
      const callReturnContent = callReturnMatch[1];

      let match;
      const result: Record<string, any> = {};

      while ((match = itemRegex.exec(callReturnContent)) !== null) {
        const key = match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const value = match[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim();

        if (value === '' || value.includes('xsi:nil="true"')) {
          result[key] = null;
        } else if (value.includes('<item>')) {
          result[key] = this.xmlToJson(`<callReturn>${value}</callReturn>`);
        } else {
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      return { success: false, error: 'Error converting XML to JSON' };
    }
  }

	/**
	 * Prepares XML arguments for a SOAP request
	 */
  private prepareArgsXml(args: any, resourcePath?: string): string {
    if (typeof args === 'string') {
      return `<args>${args}</args>`;
    } else if (typeof args === 'object' && args !== null) {
      if (resourcePath === 'sales_order.list' && args.complex_filter) {
        const filtersXml = `
        <args>
          <filters>
            <complex_filter>
              ${args.complex_filter.map((filter: any) => `
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
	 * Creates a SOAP request for the call method
	 */
  private createSoapEnvelope(sessionId: string, resourcePath: string, args: any): string {
    const argsXml = this.prepareArgsXml(args, resourcePath);
    const isWsComplianceMode = this.credentials?.isWsComplianceMode || false;
    const namespace = this.credentials?.namespace || 'urn:OpenMage';

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
    } else {
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
