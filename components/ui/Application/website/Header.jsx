import React from 'react'
import Navbar from './Navbar'

const Header = () => {
  return (
    <div className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md transition-shadow">
      <Navbar />
    </div>
  )
}

export default Header
