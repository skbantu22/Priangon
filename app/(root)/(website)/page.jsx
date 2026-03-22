import EmblaSlider from "@/components/ui/Application/website/EmblaSlider";

import dynamic from "next/dynamic";

import MenProducts from "@/components/ui/Application/website/men";
import ShowCategoryList from "@/components/ui/Application/website/ShowCategoryList";
import BottomCategoryList from "@/components/ui/Application/website/bottomcategory";

import Mobilefooter from "@/components/ui/Application/website/mobilefooter";
import TrustSection from "@/components/ui/Application/website/TrustSection";

// ✅ Lazy load heavy sections
const Featuredproducts = dynamic(
  () => import("@/components/ui/Application/website/Featuredproducts"),
  {
    loading: () => <div className="min-h-[200px]" />,
  }
);



const Womenproducts = dynamic(() => import("@/components/ui/Application/website/women"), {
  loading: () => <div className="min-h-[200px]" />,
});





const Home = () => {
  return (
    <div>
      {/* ✅ LCP element should load first */}
    
       <EmblaSlider />
      <ShowCategoryList />
   

      <Featuredproducts />
 

   <BottomCategoryList />
    
    
      <MenProducts />
      <TrustSection />
    
    
    </div>
  );
};

export default Home;