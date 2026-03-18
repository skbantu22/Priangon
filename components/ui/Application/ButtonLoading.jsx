"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
const ButtonLoading = ({ type , text, className, loading, onClick, ...props }) => {
  return (
    <Button
      type={type}
      disabled={loading}
      onClick={onClick}
      className={cn("", className)}

      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {text}
    </Button>
  )
}

export default ButtonLoading
