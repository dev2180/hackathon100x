import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const CLERK_THEME = {
  baseTheme: dark,
  variables: {
    fontFamily: "var(--font-sans)",
    colorPrimary: "#5fa324",
    colorBackground: "#0a0a0a",
    colorInputBackground: "rgba(255, 255, 255, 0.03)",
    colorInputText: "#fcfcfc",
    colorText: "#fcfcfc",
    colorTextSecondary: "#9e9e9e",
    colorLine: "#222222",
    borderRadius: "0px",
  },
  elements: {
    card: {
      border: "1px solid #222222",
      borderLeft: "5px solid #5fa324",
      background: "#0c0c0c",
      backdropFilter: "blur(12px)",
      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
      borderRadius: "0px !important",
    },
    formButtonPrimary: {
      background: "#5fa324",
      color: "#000000",
      fontWeight: "800",
      borderRadius: "0px !important",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      "&:hover": {
        filter: "brightness(1.1)",
      },
    },
    socialButtonsIconButton: {
      border: "1px solid #222222",
      background: "rgba(255, 255, 255, 0.03)",
      borderRadius: "0px !important",
      "&:hover": {
        background: "#5fa324",
        borderColor: "#5fa324",
      },
    },
    socialButtonsBlockButtonText: {
      textTransform: "uppercase",
      fontWeight: "700",
    },
    footerActionLink: {
      color: "#5fa324",
      textTransform: "uppercase",
      fontWeight: "700",
      "&:hover": {
        color: "#f0c243",
      },
    },
  },
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5">
      <SignIn appearance={CLERK_THEME as any} />
    </div>
  );
}
