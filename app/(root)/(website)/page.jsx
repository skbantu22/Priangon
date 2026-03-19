import EmblaSlider from "@/components/ui/Application/website/EmblaSlider";
import Sharee from "@/components/ui/Application/website/Saree";
import dynamic from "next/dynamic";

// ✅ Lazy load heavy sections
const Featuredproducts = dynamic(
  () => import("@/components/ui/Application/website/Featuredproducts"),
  {
    loading: () => <div className="min-h-[200px]" />,
  }
);

// Uncomment any of these if you want them loaded
const MenProducts = dynamic(() => import("@/components/ui/Application/website/men"), {
  loading: () => <div className="min-h-[200px]" />,
});

const Womenproducts = dynamic(() => import("@/components/ui/Application/website/women"), {
  loading: () => <div className="min-h-[200px]" />,
});

const Jewelleryproducts = dynamic(() => import("@/components/ui/Application/website/Jewellery"), {
  loading: () => <div className="min-h-[200px]" />,
});

const BoxGift = dynamic(() => import("@/components/ui/Application/website/BoxGift"), {
  loading: () => <div className="min-h-[200px]" />,
});

const Threepis = dynamic(() => import("@/components/ui/Application/website/Threepis"), {
  loading: () => <div className="min-h-[200px]" />,
});

const Sharee = dynamic(() => import("@/components/ui/Application/website/Saree"), {
  loading: () => <div className="min-h-[200px]" />,
});

const Home = () => {
  return (
    <div>
      {/* ✅ LCP element should load first */}
    
       <EmblaSlider />
   

      <Featuredproducts />
    
      <Threepis />
      <Sharee />
      <Womenproducts />
      <Jewelleryproducts />
      <BoxGift />
      <MenProducts />
    </div>
  );
};

export default Home;