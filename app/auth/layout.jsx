import Footer from "@/components/ui/Application/website/Footer";
import Header from "@/components/ui/Application/website/Header";
import React from "react";
import { ToastContainer } from "react-toastify";

const layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col ">
      <Header />
    

      {children}
         <ToastContainer/>
          <Footer />
    </div>

  );
};

export default layout;
