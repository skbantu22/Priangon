import { toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const showToast = (type, message, options = {}) => {
  const defaultOptions = {
    position: "top-right", // default top-right
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    transition: Bounce,
  };

  const toastOptions = { ...defaultOptions, ...options };

  if (type === "success") toast.success(message, toastOptions);
  else if (type === "error") toast.error(message, toastOptions);
  else if (type === "info") toast.info(message, toastOptions);
  else toast(message, toastOptions);
};
