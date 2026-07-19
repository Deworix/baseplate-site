// Site configuration — the ONLY file you edit when wiring real Stripe & downloads.
// See docs/STRIPE.md in the repo for the full step-by-step.
window.BASEPLATE_SITE = {
  // Stripe Payment Links (Dashboard → Payment links → New). One per plan+period.
  // Until these are set, the buy buttons scroll to the download section instead.
  stripe: {
    pro: {
      monthly: 'https://buy.stripe.com/cNi6oJbsJ9heePH4AO4wM03',
      yearly: 'https://buy.stripe.com/bJe6oJgN3dxufTLgjw4wM04',
    },
    studio: {
      // NOTE: the original Studio-monthly link was deactivated in Stripe (duplicate);
      // this is the ACTIVE replacement (plink_1TrnKXROKtY6LNEEOmc9GWGw).
      monthly: 'https://buy.stripe.com/dRmdRbbsJctqdLD6IW4wM01',
      yearly: 'https://buy.stripe.com/14AdRbdAR0KIbDv4AO4wM02',
    },
  },

  // Installer downloads (GitHub Releases assets — the public releases repo).
  downloads: {
    win: 'https://github.com/Deworix/Baseplate/releases/latest',
    mac: 'https://github.com/Deworix/Baseplate/releases/latest',
  },

  // Stripe Customer Portal login link — how customers cancel or change their plan
  // themselves. Get it in Stripe: Dashboard → Settings → Billing → Customer portal →
  // activate → copy the login page URL (https://billing.stripe.com/p/login/…). Until this
  // is set, the "Manage subscription" links point at support instead, so nobody is stranded.
  manage: '',
};
