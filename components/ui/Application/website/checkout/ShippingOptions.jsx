import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ShippingOptions({ value, onChange }) {
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-3">Select Delivery Area</h2>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-0">
        {/* Inside Dhaka */}
        <label
          htmlFor="inside"
          className={`flex items-center p-4 border cursor-pointer ${value === "inside_dhaka" ? "border-black" : "border-gray-400"}`}
        >
          <RadioGroupItem value="inside_dhaka" id="inside" className="mr-3" />
          <span className="flex items-center gap-3 font-medium">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              <path d="M1 3h15v13H1z" />
              <path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Inside Dhaka <span className="font-bold">৳80</span>
          </span>
        </label>

        {/* Outside Dhaka */}
        <label
          htmlFor="outside"
          className={`flex items-center p-4 border cursor-pointer ${value === "outside_dhaka" ? "border-black" : "border-gray-400"}`}
        >
          <RadioGroupItem value="outside_dhaka" id="outside" className="mr-3" />
          <span className="flex items-center gap-3 font-medium">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path d="M15 17h-6" />
              <path d="M2 12h11l3-5h5" />
            </svg>
            Outside Dhaka <span className="font-bold">৳150</span>
          </span>
        </label>
      </RadioGroup>
    </div>
  );
}
