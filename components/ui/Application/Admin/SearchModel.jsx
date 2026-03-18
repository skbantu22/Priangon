import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


import React, { useEffect, useState } from 'react'
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import searchData from "@/lib/search";
import Link from "next/link";

const SearchModel = ({ open, setOpen }) => {
const [query, setQuery] = useState('')
const [results, setResult] = useState([])


const options = {
  keys: ['label', 'description', 'keywords'],
  threshold: 0.3
}
const fuse = new Fuse(searchData, options)

useEffect(() => {
  if (query.trim() === "") {
    setResult([])
  }

    const res = fuse.search(query)

setResult(res.map((r) => r.item))
  
}, [query])





  return (
    <div>
      <Dialog open={open} onOpenChange={() => setOpen(!open)}  >
      <DialogContent>
    <DialogHeader>
      <DialogTitle>Quick Search </DialogTitle>
      <DialogDescription>
       Quickly search and navigate to products, orders, categories, or other admin tools.
      </DialogDescription>
    </DialogHeader>
          <Input
  placeholder="Search..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  autoFocus
/>

 
<ul className="mt-4 max-h-60 overflow-y-auto">
  {results.map((item, index) => (
    <li key={index}>
      <Link
        href={item.url}
        className="block py-2 px-3 rounded hover:bg-muted"
        onClick={()=>setOpen(false)}
      >
        <h4 className="font-medium">
          {item.label}
        </h4>

        <p className="text-sm text-muted-foreground">
          {item.description}
        </p>
      </Link>
    </li>
  ))}
</ul>


{query && results.length === 0 && (
  <div className="text-sm text-center text-muted-foreground mt-4">
    No Result Found.
  </div>
)}

  </DialogContent>
</Dialog>
    </div>
  )
}

export default SearchModel
