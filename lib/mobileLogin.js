/**
 * Logins sign in with their mobile number. The user record still needs an
 * email, so a login made without one gets a stand-in the screens never show.
 */
export const MOBILE_LOGIN_DOMAIN = "@mobile.login";

export const standInEmail = (phone) => `${phone}${MOBILE_LOGIN_DOMAIN}`;

/** The email to show: blank for a stand-in */
export const shownEmail = (email) => (String(email || "").endsWith(MOBILE_LOGIN_DOMAIN) ? "" : email || "");
