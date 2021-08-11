import "../styles/globals.css";
import type { AppProps } from "next/app";
import React from "react";
import {
  Web3ConfigProvider,
} from "@zoralabs/simple-wallet-provider";

const CLIENT_INFO = {
  name: "zuactioneer",
  url: "http://zauctioneer.vercel.app/",
  description: "zauctioneer",
  icons: [],
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3ConfigProvider
      rpcUrl={process.env.NEXT_PUBLIC_RPC_URL}
      networkId={1}
      clientInfo={CLIENT_INFO}
    >
      <Component {...pageProps} />
    </Web3ConfigProvider>
  );
}

export default MyApp;
