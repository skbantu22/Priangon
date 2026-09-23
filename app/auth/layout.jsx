import React from "react";
import { ToastContainer } from "react-toastify";

// Sign-in pages stand on their own: no storefront header / footer
const layout = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col [&>*:first-child]:flex-1">
      {children}
      <ToastContainer />
    </div>
  );
};

export default layout;
