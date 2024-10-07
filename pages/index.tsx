import { Box, useToast } from "@chakra-ui/react";
import SignClient from "@walletconnect/sign-client";
import { WalletConnectModal } from "@walletconnect/modal";
import type { NextPage } from "next";
import { useCallback, useEffect, useState } from "react";
import DefaultView from "../views/DefaultView";
import SignedInView from "../views/SignedInView";

// 1. Get projectID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
if (!projectId) {
  throw new Error("You need to provide NEXT_PUBLIC_PROJECT_ID env variable");
}

// 2. Configure WalletConnectModal with walletIds
const modal = new WalletConnectModal({
  projectId,
  // walletIds: [
  //   "427efc9169b13a348d98d34e40303546a3e7352d725c06b9356882a26773b1a3", // Multix wallet ID
  // ],
  chains: ["polkadot:91b171bb158e2d3848fa23a9f1c25182"], // Polkadot mainnet
  themeMode: "dark",
});

const Home: NextPage = () => {
  const [client, setClient] = useState<SignClient | null>(null);
  const [uri, setUri] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const toast = useToast();

  const onConnect = useCallback(async () => {
    if (!client) return;

    const connectParams = {
      requiredNamespaces: {
        polkadot: {
          chains: ["polkadot:91b171bb158e2d3848fa23a9f1c25182"],
          methods: ["polkadot_signTransaction", "polkadot_signMessage"],
          events: [],
        },
      },
    };

    try {
      const { uri, approval } = await client.connect(connectParams);

      if (uri) {
        setUri(uri);
      }

      const session = await approval();
      const accounts = session.namespaces.polkadot.accounts;
      // accounts is an array like ['polkadot:91b171bb158e2d3848fa23a9f1c25182:ADDRESS']
      const connectedAddress = accounts[0].split(":")[2];
      setAddress(connectedAddress);
    } catch (error) {
      console.error(error);
      toast({
        status: "error",
        title: "Failed to connect",
      });
    }
  }, [client, toast]);

  useEffect(() => {
    SignClient.init({
      relayUrl: process.env.NEXT_PUBLIC_RELAY_URL || "wss://relay.walletconnect.com",
      projectId,
      metadata: {
        name: "Your App Name",
        description: "Your App Description",
        url: window.location.host,
        icons: [],
      },
    })
      .then((signClient) => {
        setClient(signClient);
      })
      .catch((error) => {
        console.error(error);
        toast({
          status: "error",
          title: "Failed to initialize SignClient",
        });
      });
  }, [toast]);

  useEffect(() => {
    if (uri) {
      modal.openModal({ uri });
    }
  }, [uri]);

  useEffect(() => {
    if (address) {
      modal.closeModal();
    }
  }, [address]);

  return (
    <Box width="100%" height="100%">
      <DefaultView onClick={onConnect} hasInitialized={!!client} />
      {address && <SignedInView address={address} />}
    </Box>
  );
};

export default Home;
