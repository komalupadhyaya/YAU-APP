const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch'); // Polyfill for fetch in Node.js environment

class AzureTransport {
  constructor(options) {
    this.options = options;
    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId: options.clientId,
        authority: `https://login.microsoftonline.com/${options.tenantId}`,
        clientSecret: options.clientSecret,
      },
    });
  }

  async getAccessToken() {
    const clientCredentialRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
    };
    try {
      const response = await this.cca.acquireTokenByClientCredential(clientCredentialRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Error acquiring access token:', error);
      throw new Error('Failed to acquire access token for Microsoft Graph API.');
    }
  }

  async send(mail, callback) {
    try {
      const accessToken = await this.getAccessToken();
      const client = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      const message = {
        subject: mail.data.subject,
        body: {
          contentType: mail.data.html ? 'Html' : 'Text',
          content: mail.data.html || mail.data.text,
        },
        toRecipients: mail.data.to.split(',').map((email) => ({
          emailAddress: {
            address: email.trim(),
          },
        })),
        from: {
          emailAddress: {
            address: mail.data.from.match(/<(.*?)>/)[1], // Extract email from "Name <email>"
          },
        },
      };

      const sendMail = {
        message: message,
        saveToSentItems: this.options.saveToSentItems !== false,
      };

      await client.api('/me/sendMail').post(sendMail);

      console.log('Azure Email sent successfully');
      callback(null, {
        envelope: mail.data.envelope || mail.message.from,
        messageId: message.id,
      });
    } catch (error) {
      console.error('Error sending email with Azure:', error);
      callback(error);
    }
  }
}

module.exports = AzureTransport;
