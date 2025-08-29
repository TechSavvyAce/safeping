# 🔧 Troubleshooting Guide

## Wallet Connection Issues

### Common Error: "Application error: a client-side exception has occurred while loading localhost"

This error typically occurs when there are issues with wallet connection configuration or missing environment variables.

#### Quick Fix

1. **Set up environment variables:**

   ```bash
   npm run setup:env
   ```

2. **Update the WalletConnect Project ID:**

   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project or use an existing one
   - Copy the Project ID
   - Update `.env.local`:
     ```env
     NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_actual_project_id_here"
     ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

#### Manual Environment Setup

If the automatic setup doesn't work, create a `.env.local` file manually:

```env
# Required for WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_walletconnect_project_id"

# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Database
DATABASE_URL="sqlite:./data/payments.db"

# Network Mode
NEXT_PUBLIC_NETWORK_MODE="testnet"

# Other variables can be left as defaults for now
```

#### What Each Fix Does

1. **Error Boundaries**: Added global error boundaries to catch and display errors gracefully
2. **Safe Configuration**: Modified wagmi and web3modal to handle missing WalletConnect configuration
3. **Better Error Handling**: Added try-catch blocks around wallet connection logic
4. **Environment Validation**: Added checks to ensure WalletConnect is properly configured

#### Still Having Issues?

1. **Check browser console** for specific error messages
2. **Verify WalletConnect Project ID** is correct and not the placeholder value
3. **Ensure MetaMask or other wallets** are properly installed
4. **Check network connectivity** - WalletConnect requires internet access
5. **Try different browsers** to rule out browser-specific issues

#### Development vs Production

- **Development**: WalletConnect will work with a valid Project ID
- **Production**: Ensure all environment variables are properly set on your hosting platform

#### Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify your WalletConnect Project ID is active
3. Ensure you're using the latest version of the wallet extensions
4. Try clearing browser cache and cookies
