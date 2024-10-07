import { Box, useToast } from "@chakra-ui/react";
import AuthClient, { generateNonce } from "@walletconnect/auth-client";
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
  //   "427efc9169b13a348d98d34e40303546a3e7352d725c06b9356882a26773b1a3", // Your specified wallet ID
  // ],
  chains: ["eip155:1329", "polkadot:91b171bb158e2d3848fa23a9f1c25182"], // Specify your chain ID
  themeMode: "dark", // Optional: 'dark' | 'light'
});

const Home: NextPage = () => {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [uri, setUri] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const toast = useToast();

  const onSignIn = useCallback(() => {
    if (!client) return;
    client
      .request({
        aud: window.location.href,
        domain: window.location.hostname.split(".").slice(-2).join("."),
        chainId: "eip155:1329", // Ensure this matches the chain ID in modal config
        type: "eip4361",
        nonce: generateNonce(),
        statement: "Sign in with wallet.",
      })
      .then(({ uri }) => {
        if (uri) {
          setUri(uri);
        }
      })
      .catch((error) => {
        console.error(error);
        toast({
          status: "error",
          title: "Failed to initiate sign-in request",
        });
      });
  }, [client, setUri, toast]);

  useEffect(() => {
    AuthClient.init({
      relayUrl:
        process.env.NEXT_PUBLIC_RELAY_URL || "wss://relay.walletconnect.com",
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      metadata: {
        name: "react-dapp-auth",
        description: "React Example Dapp for Auth",
        url: window.location.host,
        icons: [],
      },
    })
      .then((authClient) => {
        setClient(authClient);
        setHasInitialized(true);
      })
      .catch((error) => {
        console.error(error);
        toast({
          status: "error",
          title: "Failed to initialize AuthClient",
        });
      });
  }, [toast]);

  useEffect(() => {
    if (!client) return;

    client.on("auth_response", ({ params }) => {
      if ("code" in params) {
        console.error(params);
        modal.closeModal();
        return;
      }
      if ("error" in params) {
        console.error(params.error);
        if ("message" in params.error) {
          toast({
            status: "error",
            title: params.error.message,
          });
        }
        modal.closeModal();
        return;
      }
      toast({
        status: "success",
        title: "Auth request successfully approved",
        colorScheme: "whatsapp",
      });
      setAddress(params.result.p.iss.split(":")[4]);
    });
  }, [client, toast]);

  const [view, changeView] = useState<"default" | "qr" | "signedIn">("default");

  useEffect(() => {
    async function handleOpenModal() {
      if (uri) {
        await modal.openModal({
          uri,
        });
      }
    }
    handleOpenModal();
  }, [uri]);

  useEffect(() => {
    if (address) {
      modal.closeModal();
      changeView("signedIn");
    }
  }, [address]);

  return (
    <Box width="100%" height="100%">
      {view === "default" && (
        <DefaultView onClick={onSignIn} hasInitialized={hasInitialized} />
      )}
      {view === "signedIn" && <SignedInView address={address} />}
    </Box>
  );
};

export default Home;
