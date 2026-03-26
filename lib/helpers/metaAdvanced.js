export const getFBP = () => {
  let fbp = document.cookie
    .split("; ")
    .find((row) => row.startsWith("_fbp="))
    ?.split("=")[1];

  if (!fbp) {
    fbp = `fb.1.${Date.now()}.${Math.random().toString().substring(2)}`;
    document.cookie = `_fbp=${fbp}; path=/;`;
  }

  return fbp;
};

export const getFBC = () => {
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");

  if (!fbclid) return null;

  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  document.cookie = `_fbc=${fbc}; path=/;`;

  return fbc;
};
