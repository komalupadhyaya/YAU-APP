Azure Setup Guide for Outlook Email Integration
This guide will walk you through setting up an Azure AD Application to enable email sending via Microsoft Graph API.

Prerequisites
An active Azure account (Sign up for free)
An Outlook/Microsoft 365 email account
Admin permissions to create App Registrations (or request from your IT admin)
Step-by-Step Setup
1. Access Azure Portal
Go to Azure Portal
Sign in with your Microsoft account
2. Create an App Registration
In the Azure Portal, search for "App registrations" in the top search bar
Click "App registrations" from the results
Click "+ New registration" button
3. Configure App Registration
Fill in the registration form:

Name: Outlook Nodemailer Integration (or any name you prefer)
Supported account types: Select "Accounts in this organizational directory only" (Single tenant)
If using a personal Microsoft account, select "Accounts in any organizational directory and personal Microsoft accounts"
Redirect URI: Leave blank for now (not needed for this integration)
Click "Register"

4. Copy Application (Client) ID and Tenant ID
After registration, you'll see the app overview page:

Copy the Application (client) ID - You'll need this for AZURE_CLIENT_ID
Copy the Directory (tenant) ID - You'll need this for AZURE_TENANT_ID
💡 Tip: Keep these values in a secure note temporarily

5. Create a Client Secret
In the left sidebar, click "Certificates & secrets"
Click "+ New client secret"
Add a description: Nodemailer Integration Secret
Choose an expiration period (e.g., 24 months)
Click "Add"
IMPORTANT: Immediately copy the Value (not the Secret ID) - You'll need this for AZURE_CLIENT_SECRET
⚠️ Warning: This value is only shown once! If you lose it, you'll need to create a new secret
6. Configure API Permissions
In the left sidebar, click "API permissions"
Click "+ Add a permission"
Select "Microsoft Graph"
Select "Application permissions" (not Delegated permissions)
Search for and select the following permission:
Mail.Send - Allows the app to send mail as any user
Click "Add permissions"
7. Grant Admin Consent
⚠️ Important: This step requires admin privileges

After adding the permission, you'll see it listed with a status "Not granted"
Click "Grant admin consent for [Your Organization]"
Click "Yes" to confirm
The status should change to a green checkmark ✅
📝 Note: If you don't have admin rights, you'll need to request this from your IT administrator

8. Verify Configuration
Your app should now have:

✅ Application (client) ID
✅ Directory (tenant) ID
✅ Client secret value
✅ Mail.Send permission with admin consent granted
Configure Your Application
Backend Environment Variables
Navigate to the backend folder
Copy .env.example to .env:
cp .env.example .env
Edit .env and fill in your Azure credentials:
AZURE_CLIENT_ID=your-application-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-value-here
AZURE_TENANT_ID=your-directory-tenant-id-here
PORT=3000
Important Security Notes
🔒 Security Best Practices:

Never commit .env files to version control
Store secrets securely using environment variables or secret management services
Rotate client secrets before they expire
Use the principle of least privilege - only grant necessary permissions
Monitor app usage through Azure Portal logs
Troubleshooting
Error: "Insufficient privileges to complete the operation"
Solution: Make sure admin consent has been granted for the Mail.Send permission.

Error: "Failed to acquire access token"
Possible causes:

Incorrect Client ID, Client Secret, or Tenant ID
Client secret has expired
App registration was deleted
Solution: Verify all credentials in your .env file match the Azure Portal values.

Error: "The user or administrator has not consented to use the application"
Solution: Complete Step 7 (Grant Admin Consent) in the Azure Portal.

Email not appearing in Sent Items
Solution: Check the saveToSentItems option in AzureTransport configuration (default is true).

Additional Resources
Microsoft Graph API Documentation
Mail.Send Permission Reference
Azure App Registration Guide
Next Steps
Once you've completed this setup:

✅ Install backend dependencies: cd backend && npm install
✅ Install frontend dependencies: cd frontend && npm install
✅ Start the backend server: cd backend && npm run dev
✅ Start the frontend app: cd frontend && npm run dev
✅ Send your first email! 🚀