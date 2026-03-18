import GlobalStoreProvider from '@/components/ui/Application/GlobalStoreProvider'
import Footer from '@/components/ui/Application/website/Footer'
import Header from '@/components/ui/Application/website/Header'
import MobileBottomNav from '@/components/ui/Application/website/MobileBottomNav'
import Navbar from '@/components/ui/Application/website/Navbar'

// 1. Change the import to Jost
import { Jost } from 'next/font/google' 
import React from 'react'
import { ToastContainer } from 'react-toastify'

// 2. Configure the Jost font
const jost = Jost({
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-jost',
})

const layout = ({children}) => {
  return (
    <GlobalStoreProvider>
      {/* 3. Apply the jost className here */}
      <div className={jost.className}>
          <Header />
          
           <main>
              {children}
           </main>

           <ToastContainer />
          <Footer />
           <MobileBottomNav />  
      </div>
    </GlobalStoreProvider>
  )
}

export default layout