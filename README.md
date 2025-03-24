# n8n-nodes-openmage-soap

This is an n8n community node for integrating with OpenMage via SOAP API. It allows you to interact with your OpenMage store directly in your n8n workflows.

[OpenMage](https://www.openmage.org/) is a fork of Magento 1 that continues to be maintained and improved by the community, offering a robust and flexible e-commerce solution.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Prerequisites

- A running OpenMage installation with SOAP API access enabled
- Valid API credentials (username and API key)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```bash
pnpm i n8n-nodes-openmage-soap
```

## Operations

### sales_order.info

The node currently supports the operation to get detailed information about a specific order:

- **Increment ID**: Enter the increment ID of the order
- **Verify Customer Email**: Option to verify that the order belongs to a specific customer
  - **Customer Email**: Email of the customer to verify (if verification option is enabled)

## Additional Options

In the future, the node may support additional operations such as:
- Product management
- Customer management
- Order management
- Inventory management

## Credentials

To use this node, you need to configure credentials for your OpenMage instance:

1. **API URL**: The URL of your OpenMage SOAP endpoint (e.g., `https://your-store.com/api/soap/?wsdl`)
2. **Username**: Your API username
3. **API Key**: Your API key
4. **WS-Compliance Mode**: Enable this option for servers that fully comply with WS standards
5. **SOAP Namespace**: Choose between OpenMage (urn:OpenMage) or Magento (urn:Magento)

## Example Usage

1. Add the OpenMage SOAP node to your workflow
2. Configure your OpenMage credentials
3. Set up your operation parameters:
   ```json
   {
     "operation": "sales_order.info",
     "incrementId": "100000001",
     "checkCustomerEmail": true,
     "customerEmail": "customer@example.com"
   }
   ```

## Compatibility

- Requires Node.js version 18.10 or later
- Requires pnpm version 9.1 or later

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](LICENSE)

## Support

- Create an [issue](https://github.com/empiricompany/n8n-nodes-openmage-soap/issues)
- Review the [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [OpenMage Documentation](https://devdocs-openmage.org/guides/m1x/)
- [OpenMage/Magento SOAP API Documentation](https://devdocs-openmage.org/guides/m1x/api/soap/introduction.html#Introduction-SOAP)
