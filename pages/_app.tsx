import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { PrivyProvider } from '@privy-io/react-auth';

export default function App({ Component, pageProps }: AppProps) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // During build time, Privy isn't needed (SSG/SSR)
  // Only initialize Privy in the browser
  if (typeof window === 'undefined') {
    return (
      <>
        <Head>
          <title>Maxxit - Agentic DeFi Trading Platform</title>
          <meta name="description" content="Deploy AI-powered trading agents that execute trades based on crypto Twitter signals" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} />
      </>
    );
  }

  // In browser, require valid Privy app ID
  if (!privyAppId) {
    console.error('NEXT_PUBLIC_PRIVY_APP_ID is not set');
    return (
      <>
        <Head>
          <title>Maxxit - Configuration Error</title>
        </Head>
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <h1>Configuration Error</h1>
          <p>NEXT_PUBLIC_PRIVY_APP_ID environment variable is not set.</p>
        </div>
      </>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e',
          logo: undefined,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <Head>
        <title>Maxxit - Agentic DeFi Trading Platform</title>
        <meta name="description" content="Deploy AI-powered trading agents that execute trades based on crypto Twitter signals" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </PrivyProvider>
  );
}
