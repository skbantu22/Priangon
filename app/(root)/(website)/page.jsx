import EmblaSlider from "@/components/ui/Application/website/EmblaSlider";

import dynamic from "next/dynamic";

import MenProducts from "@/components/ui/Application/website/men";
import ShowCategoryList from "@/components/ui/Application/website/ShowCategoryList";


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
    
    
      <MenProducts />
    
    </div>
  );
};

export default Home;