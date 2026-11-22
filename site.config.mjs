// Site settings. Everything a page needs to say about releases, repositories and
// placeholders lives here, so a release or a filled-in seller block is one edit.

export default {
  origin: "https://sealctl.com",
  name: "sealctl",

  // While seller details are placeholders, every page carries
  // <meta name="robots" content="noindex"> and an X-Robots-Tag header.
  // Set to false once the placeholders in `seller` are filled in.
  prelaunch: true,

  // App links: https://sealctl.com/p#... opens the app (pairing). Android checks
  // /.well-known/assetlinks.json for these signing certificates. Today only the debug
  // certificate of the development builds; add the Play app signing certificate at release.
  // iOS needs apple-app-site-association with the Apple team id, which does not exist yet.
  appLinks: {
    androidPackage: "com.sealctl.app",
    androidCertSha256: [
      "AB:00:C5:B7:78:17:6C:14:D4:7F:7E:EC:E6:55:97:3A:EB:1F:90:65:37:03:77:61:26:C8:7C:DE:8C:15:20:08",
    ],
  },

  // The release the site describes. While `released` is false, the status strip says it
  // is in development; set it to true when it is published on GitHub.
  release: {
    released: false,
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
    { href: "/docs", label: "Docs" },
  ],

  footer: [
    { href: "/docs", label: "Docs" },
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
