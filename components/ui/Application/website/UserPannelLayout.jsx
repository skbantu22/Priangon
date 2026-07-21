import React from "react";
import UserPanelNavigation from "./UserPannelNavigation";

const UserPanelLayout = ({ children }) => {
  return (
    <div className="flex lg:flex-nowrap flex-wrap gap-4 lg:gap-10 lg:px-32 px-4 my-6 lg:my-20">
      <div className="lg:w-64 w-full">
        <UserPanelNavigation />
      </div>

      {/* এখানে relative এবং overflow-visible যোগ করা হয়েছে যাতে ড্রপডাউন বাইরে ভেসে থাকে */}
      <div className="lg:w-[calc(100%-16rem)] w-full relative overflow-visible">
        {children}
      </div>
    </div>
  );
};

export default UserPanelLayout;
