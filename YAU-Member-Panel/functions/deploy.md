# Firebase Functions Deploy (Windows / PowerShell)

This project deploys the backend from the `functions/` folder.

## Prereqs

- Node.js installed (LTS recommended)
- Firebase CLI installed

## Environment Variables Setup

Before deploying, set up the required environment variables:

### Using Firebase CLI (Recommended for production):
```powershell
# Twilio SMS Configuration - API Key Authentication (Recommended)
firebase functions:config:set twilio.api_key="your_twilio_api_key_here"
firebase functions:config:set twilio.api_secret="your_twilio_api_secret_here"
firebase functions:config:set twilio.account_sid="your_twilio_account_sid_here"
firebase functions:config:set twilio.phone_number="your_twilio_phone_number_here"

# Zapier Integration
firebase functions:config:set zapier.webhook_url="your_zapier_webhook_url"

# Stripe Configuration
firebase functions:config:set stripe.secret_key="your_stripe_secret_key"
firebase functions:config:set stripe.webhook_secret="your_stripe_webhook_secret"

# Frontend URL
firebase functions:config:set app.frontend_url="https://your-frontend-domain.com"

# Constant Contact
firebase functions:config:set constant_contact.client_id="your_constant_contact_client_id"
```

### Alternative: Using .env file (for local development):
Create a `.env` file in the `functions/` directory with:
```
# Twilio SMS Configuration - API Key Authentication (Recommended)
TWILIO_API_KEY=your_twilio_api_key_here
TWILIO_API_SECRET=your_twilio_api_secret_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
ZAPIER_WEBHOOK_URL=your_zapier_webhook_url_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
FRONTEND_URL=https://your-frontend-domain.com
CONSTANT_CONTACT_CLIENT_ID=your_constant_contact_client_id_here
```

**Note**: For production deployment, use Firebase CLI config as shown above. The .env file is only for local development with the emulator.

Install Firebase CLI (one-time):

```powershell
npm i -g firebase-tools
```

Login (one-time per machine):

```powershell
firebase login
```

## Deploy Functions (production)

From `d:\client\John\yau-member-panel\functions`:

```powershell
cd "d:\client\John\yau-member-panel\functions"
npm install
firebase use yau-app
firebase deploy --only functions
```

Notes:
- `firebase use yau-app` selects the Firebase project alias `yau-app` (adjust if your alias differs).
- This repo exports the Functions entrypoint from `functions/index.js` (Express app exported as `apis`).

## Deploy only one function (faster)

If you only want to deploy the HTTP API function:

```powershell
cd "d:\client\John\yau-member-panel\functions"
firebase use yau-app
firebase deploy --only "functions:apis"
```

## Tail logs (after deploy)

```powershell
firebase functions:log
```

## Local emulator (optional)

Run functions emulator:

```powershell
cd "d:\client\John\yau-member-panel\functions"
npm install
firebase use yau-app
firebase emulators:start --only functions
```

Your HTTP function will be available under the emulator URL shown in the output (look for `apis`).

## Troubleshooting

- **Wrong project**: run `firebase projects:list` and then `firebase use <alias-or-projectId>`.
- **Deploy fails on Node version**: check `functions/package.json` `engines.node` and use a compatible Node version.

