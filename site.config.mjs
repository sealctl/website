// Site settings. Everything a page needs to say about releases, repositories and
// placeholders lives here, so a release or a filled-in seller block is one edit.

export default {
  origin: "https://sealctl.com",
  name: "sealctl",

  // While seller details are placeholders, every page carries
  // <meta name="robots" content="noindex"> and an X-Robots-Tag header.
  // Set to false once the placeholders in `seller` are filled in.
  prelaunch: true,

  // The release the site describes for installs today.
  release: {
    current: "0.5.0",
    // 0.6.0 adds `sealctl unseal --all`. Set to true when it is published on GitHub.
    unsealReleased: false,
    unsealVersion: "0.6.0",
    phoneVersion: "0.7",
  },

  // docs/protocol.md revision that /crypto describes.
  protocol: {
    rev: "6e606d1",
    sha: "6e606d1935a4a4d1300e61f45d1130e6aa1f0a85",
    base: "https://github.com/sealctl/sealctl/blob/6e606d1935a4a4d1300e61f45d1130e6aa1f0a85/docs/protocol.md",
  },

  github: {
    org: "https://github.com/sealctl",
    cli: "https://github.com/sealctl/sealctl",
    app: "https://github.com/sealctl/app",
    website: "https://github.com/sealctl/website",
    releases: "https://github.com/sealctl/sealctl/releases/latest",
    advisory: "https://github.com/sealctl/sealctl/security/advisories/new",
    securityPolicy: "https://github.com/sealctl/.github/blob/main/SECURITY.md",
    issues: "https://github.com/sealctl/sealctl/issues",
  },

  relay: "https://relay.sealctl.com",

  email: {
    support: "support@sealctl.com",
    security: "security@sealctl.com",
    privacy: "privacy@sealctl.com",
  },

  // Filled in by the seller only. Shown as visible placeholders until then.
  seller: {
    legalName: "[Seller legal name — to be filled before launch]",
    tradingName: "[Trading name, if any — to be filled before launch]",
    address: "[Seller address — to be filled before launch], Poland",
    registration: "[NIP and REGON, if registered — to be filled before launch]",
  },

  paddle: {
    // Public client-side tokens, read from Pages environment variables at build time.
    liveTokenVar: "PADDLE_CLIENT_TOKEN_LIVE",
    sandboxTokenVar: "PADDLE_CLIENT_TOKEN_SANDBOX",
    script: "https://cdn.paddle.com/paddle/v2/paddle.js",
  },

  nav: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/security", label: "Security" },
    { href: "/pricing", label: "Pricing" },
    { href: "/docs/", label: "Docs" },
  ],

  footer: [
    { href: "/docs/", label: "Docs" },
    { href: "/security", label: "Security" },
    { href: "/crypto", label: "Cryptography" },
    { href: "/status", label: "Status" },
    { href: "https://github.com/sealctl", label: "GitHub" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/refunds", label: "Refunds" },
    { href: "/contact", label: "Contact" },
  ],
};
