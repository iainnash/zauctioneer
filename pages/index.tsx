import Head from "next/head";
import {
  FullComponents,
  MediaConfiguration,
  NFTDataContext,
  NFTFullPage,
  NFTPreview,
  PreviewComponents,
} from "@zoralabs/nft-components";
import { useWeb3React } from "@web3-react/core";
import {
  useWalletButton,
  Web3ConfigProvider,
} from "@zoralabs/simple-wallet-provider";
import React, {
  Fragment,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { parseEther } from "@ethersproject/units";
import styles from "styles/Home.module.css";
import { Zora, AuctionHouse, addresses } from "@zoralabs/zdk";
import { useTokenApproval } from "hooks/useTokenApproval";
import { useContractTransaction } from "hooks/useContractTransaction";

function eth(num: number) {
  return parseEther(num.toString());
}

const ConnectTrigger = () => {
  const { buttonAction, actionText, connectedInfo } = useWalletButton();

  return (
    <Fragment>
      {connectedInfo}
      <button onClick={() => buttonAction()}>{actionText}</button>
    </Fragment>
  );
};

const CheckOwnerComponent = ({ wallet }: { wallet?: string | null }) => {
  const nftData = useContext(NFTDataContext);
  const owner = nftData.nft.data?.nft.owner;
  if (owner?.toLowerCase() === wallet?.toLowerCase()) {
    return (
      <div style={{ padding: 8, paddingLeft: 16, color: "green" }}>
        Yay! You own this NFT to auction off.
      </div>
    );
  }
  return (
    <div style={{ padding: 16, color: "red", fontWeight: "bold" }}>
      You need to own the token before auctioning it off :(
    </div>
  );
};



export default function Home() {
  return (
      <InnerHome />
  );
}

function InnerHome() {
  const { account, active, activate, deactivate, library } = useWeb3React();

  const [error, setError] = useState<string | undefined>();
  const [zid, setZid] = useState("");
  const [days, setDays] = useState(1);
  const [curatorFee, setCuratorFee] = useState(0);
  const [curator, setCurator] = useState("");
  const [amount, setAmount] = useState(1.0);
  const [network, setNetwork] = useState<{
    chainId: string | null;
    networkName: string | null;
  }>({ chainId: null, networkName: null });

  const [mediaContractAddress, setMediaContractAddress] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (library) {
      library.getNetwork().then(({ chainId }: { chainId: string }) => {
        const networkName = {
          "1": "mainnet",
          "4": "rinkeby",
        };
        setNetwork({
          chainId,
          networkName: (networkName as any)[chainId],
        });
      });
    }
  }, [library]);

  const [address, setAddress] = useState<null | {
    media: string;
    auctionHouse: string;
  }>(null);

  const {
    loading: approvalLoading,
    approved,
    approve,
    mutate,
    revalidate,
  } = useTokenApproval(mediaContractAddress, address?.auctionHouse);
  const { txInProgress, handleTx, txError } = useContractTransaction(10, () => {
    revalidate();
  });

  useEffect(() => {
    if (network.networkName !== null) {
      const auctionHouse = {
        mainnet: "0xE468cE99444174Bd3bBBEd09209577d25D1ad673",
        rinkeby: "0xE7dd1252f50B3d845590Da0c5eADd985049a03ce",
      };
      // @ts-ignore
      setAddress({
        ...addresses[network.networkName as any],
        // @ts-ignore
        auctionHouse: auctionHouse[network.networkName],
      });
    }
  }, [active, library, setAddress, network]);

  // const setApprove = useCallback(async () => {
  //   if (!library || !address?.auctionHouse) {
  //     return;
  //   }
  //   const zdk = new Zora(await library.getSigner(), network.chainId as any);
  //   await zdk.setApprovalForAll(address.auctionHouse, true);
  //   await getApproved(zid);
  // }, [library, zid, network, getApproved, address]);

  const [zoraTokenText, setZoraTokenText] = useState<string>("");

  const updateZoraToken = useCallback(
    (evt: any) => {
      const { value } = evt.target;
      if (value) {
        setZoraTokenText(value);

        if (value.match(/zora\.co/)) {
          const id = value.match(/\/([0-9]+)\/?$/);
          if (id && id[1]) {
            setZid(id[1]);
            setMediaContractAddress(address?.media);
          }
        }

        if (value.match(/opensea.io/)) {
          const uri = value.match(/opensea.io\/assets\/([^\/]+)\/([^\/]+)/);
          if (!uri) {
            return;
          }
          setMediaContractAddress(uri[1]);
          setZid(uri[2]);
        }
        if (value.match(/rarible.com/)) {
          const uri = value.match(/rarible.com\/token\/([^:]+):([^?]+)/);
          if (!uri) {
            return;
          }
          setMediaContractAddress(uri[1]);
          setZid(uri[2]);
        }
      }
      revalidate();
    },
    [setZid, revalidate, address]
  );

  const setupAuction = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        setError(undefined);
        if (!active) {
          throw new Error("no wallet brah");
        }

        const auctionHouse = new AuctionHouse(
          library.getSigner(),
          network.chainId as any
        );
        await auctionHouse.createAuction(
          parseInt(zid),
          Math.floor(days * 24 * 60 * 60),
          eth(amount),
          curator || "0x0000000000000000000000000000000000000000",
          curatorFee || 0,
          "0x0000000000000000000000000000000000000000",
          mediaContractAddress
        );
      } catch (err) {
        setError(err.message || "Unknown thing ggs ");
      }
    },
    [active, library, network && network.chainId, zid, amount, curator, days]
  );

  return (
    <>
      <Head>
        <title>ZAUCTIONEER</title>
        <meta
          name="description"
          content="So you wanna do some fancy auctions"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div style={{ padding: 20 }}>
          <h1
            style={{
              textTransform: "uppercase",
              fontWeight: "bold",
              fontSize: 75,
              padding: "0 20px",
            }}
          >
            zauctioneer
          </h1>
          <h3>
            step 0: connect metamask wallet
            <ConnectTrigger />
            <div>
              {/* {active ? (
                <button onClick={() => deactivate()}>Disconnect Wallet</button>
              ) : (
                <button onClick={() => activate(injectedConnector)}>
                  Connect Wallet
                </button>
              )} */}
            </div>
            <div>
              Connected to:{" "}
              {library && library.provider.chainId === "0x1" && "mainnet"}
              {library && library.provider.chainId === "0x4" && "rinkeby"}
            </div>
          </h3>
          <h3>
            step 1: paste a link to the zora or opensea mainnet 721 token you
            want to auction off
            <input
              type="text"
              value={zoraTokenText}
              onChange={updateZoraToken}
            />
          </h3>
          {zid && library && (
            <div>
              <MediaConfiguration
                networkId={(network.chainId || 1).toString() as any}
              >
                <NFTPreview id={zid} contract={mediaContractAddress}>
                  <PreviewComponents.MediaThumbnail />
                  <CheckOwnerComponent wallet={account} />
                </NFTPreview>
              </MediaConfiguration>
            </div>
          )}
        </div>
        {library && zid && (
          <div className={`${styles.approveContainer}`}>
            <h1 style={{ fontWeight: "bold" }}>
              step 2: approve token for auction house
            </h1>
            <div>
              Token is {approved ? "approved" : "not approved"} for auction
              house sales.
              <br />
              {!approved && <button onClick={approve}>Approve token</button>}
            </div>
          </div>
        )}
        {library && zid && approved && (
          <div className={`${styles.bidContainer}`}>
            <h1 style={{ fontWeight: "bold" }}>step 3: auction it off!</h1>

            <hr />

            <form style={{ margin: "40px 0" }} onSubmit={setupAuction}>
              <label
                style={{
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  fontSize: 14,
                }}
              >
                How many days
              </label>
              <input
                type="number"
                step={1}
                max={90}
                value={days}
                onChange={(e: any) => setDays(e.target.value)}
              />
              <br />
              What is the ETH reserve price:
              <input
                type="number"
                value={amount}
                step={0.01}
                onChange={(e: any) => setAmount(e.target.value)}
              />
              <br />
              Is there a curator? (optional)
              <input
                type="text"
                value={curator}
                onChange={(e) => setCurator(e.target.value)}
              />
              <br />
              {curator && (
                <div>
                  curator fee percentage (1-100):
                  <input
                    type="number"
                    disabled={!curator}
                    step={1}
                    max={100}
                    min={0}
                    value={curatorFee}
                    onChange={(e) => setCuratorFee(parseInt(e.target.value))}
                  />
                  <br />
                </div>
              )}
              <button disabled={!amount || !amount || !zid} type="submit">
                Set reserve price + auction
              </button>
            </form>

            <hr />

            <div style={{ color: "red", maxWidth: 400, textAlign: "center" }}>
              {error}
            </div>

            <div style={{ marginTop: "40px" }}>
              proof of concept.
              <br />
              please verify txns and report bugs on github
              <br />
              <br />
              <a
                rel="noreferrer"
                href="https://github.com/iainnash/zuctioneer"
                target="_blank"
              >
                github.com/iainnash/zuctioneer
              </a>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
