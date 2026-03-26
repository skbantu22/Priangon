export const sendWithRetry = async (payload, retries = 3) => {
  try {
    await fetch("/api/meta/capi", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (retries > 0) {
      setTimeout(() => sendWithRetry(payload, retries - 1), 1000);
    } else {
      console.error("Meta event failed:", payload);
    }
  }
};
