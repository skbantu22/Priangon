import React from 'react'
import CountOverview from './CountOverview'
import QuickAdd from './QuickAdd'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { OderOverView } from './OderOverView'
import { OrderStatus } from './OrderStatus'
import LatestOrder from './LatestOrder'



const page = () => {
  return (
    <div>
    
    <CountOverview />
    <QuickAdd />
    <div className="mt-10 flex lg:flex-nowrap flex-wrap gap-10">
  
  <Card className="rounded-lg lg:w-[70%] w-full p-0">
    <CardHeader className="py-3">
      <div className="flex justify-between items-center">
        <span className='font-semibold'>Order Overview</span>
        <Button type="button">
          <Link href="">View All</Link>
        </Button>
      </div>
    </CardHeader>

    <CardContent>
<OderOverView />

    </CardContent>
  </Card>

  <Card className="rounded-lg lg:w-[30%] w-full p-0">
    <CardHeader className="py-3">
      <div className="flex justify-between items-center">
        <span className='font-semibold'>Orders Status</span>
        <Button type="button">
          <Link href="">View All</Link>
        </Button>
      </div>
    </CardHeader>
    <CardContent>


<OrderStatus />
</CardContent>
  </Card>

</div>




 <div className="mt-10 flex lg:flex-nowrap flex-wrap gap-10">
  
  <Card className="rounded-lg lg:w-[70%] w-full p-0">
    <CardHeader className="py-3">
      <div className="flex justify-between items-center">
        <span className='font-semibold'>Latest Order</span>
        <Button type="button">
          <Link href="">View All</Link>
        </Button>

      
      </div>
    </CardHeader>

    <CardContent>

  <LatestOrder />
    </CardContent>
  </Card>

  <Card className="rounded-lg lg:w-[30%] w-full p-0">
    <CardHeader className="py-3">
      <div className="flex justify-between items-center">
        <span className='font-semibold'>Orders Status</span>
        <Button type="button">
          <Link href="">View All</Link>
        </Button>
      </div>
    </CardHeader>
    <CardContent>



</CardContent>
  </Card>

</div>


    </div>
  )
}

export default page


