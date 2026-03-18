"use client";
import React from 'react'
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import  slider1 from '@/public/assets/banner1.jpg'
import  slider2 from '@/public/assets/banner2.png'
import  slider3 from '@/public/assets/slider3.png'

import Image from 'next/image';

const Mainslider = () => {
  const settings = {
  dots: true,
  infinite: true,
  speed: 500,
  autoplay: true,
}


  return (
    <div>
      <Slider {...settings}>
      <div>
  <Image
    src={slider1.src}
    width={slider1.width}
    height={slider1.height}
    alt="slider 1"
  />
</div>
<div>
  <Image
    src={slider2}
    width={slider2.width}
    height={slider2.height}
    alt="slider 2"
  />
</div>
<div>
  <Image
    src={slider3}
    width={slider3.width}
    height={slider3.height}
    alt="slider 3"
  />
</div>
<div>
  <Image
    src={slider1}
    width={slider1.width}
    height={slider1.height}
    alt="slider 1"
  />
</div>
<div>
  <Image
    src={slider1}
    width={slider1.width}
    height={slider1.height}
    alt="slider 1"
  />
</div>
</Slider>
    </div>
  )
}

export default Mainslider
