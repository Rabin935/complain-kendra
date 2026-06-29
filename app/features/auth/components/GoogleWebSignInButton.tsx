export interface GoogleWebSignInButtonProps {
  mode: "login" | "register";
  loading: boolean;
  onSuccess: (idToken: string) => void;
  onError: (message: string) => void;
}

export default function GoogleWebSignInButton(_: GoogleWebSignInButtonProps) {
  return null;
}
