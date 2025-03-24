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
export declare class OpenMageSoapClient {
    private client;
    private sessionId;
    private apiEndpoint;
    private serviceName;
    private portName;
    private credentials;
    /**
     * Inizializza la connessione con l'API SOAP
     */
    initialize(credentials: OpenMageSoapCredentials): Promise<void>;
    /**
     * Effettua il login e ottiene un sessionId
     */
    private login;
    /**
     * Esegue una chiamata all'API SOAP
     */
    call(resourcePath: string, args: any): Promise<any>;
    /**
     * Verifica se l'email del cliente corrisponde a quella dell'ordine
     */
    verifyCustomerEmail(jsonData: any, customerEmail: string): {
        isValid: boolean;
        orderEmail: string | null;
        message: string | null;
    };
    /**
     * Converte una risposta XML SOAP in un oggetto JSON
     */
    private xmlToJson;
    /**
     * Prepara gli argomenti XML per una richiesta SOAP
     */
    private prepareArgsXml;
    /**
     * Crea una richiesta SOAP per il metodo call
     */
    private createSoapEnvelope;
}
export {};
