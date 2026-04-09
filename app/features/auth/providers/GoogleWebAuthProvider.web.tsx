import { GoogleOAuthProvider } from "@react-oauth/google";
import type { PropsWithChildren } from "react";
import { getGoogleWebClientId } from "../../../../src/features/auth/config/google.config";

export default function GoogleWebAuthProvider({ children }: PropsWithChildren) {
  return (
    <GoogleOAuthProvider clientId={getGoogleWebClientId()}>
      {children}
    </GoogleOAuthProvider>
  );
}
