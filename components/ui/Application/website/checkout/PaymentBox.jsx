import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";

export default function PaymentBox({
  value,
  setValue,
  userRole,
  transactionNumber,
  setTransactionNumber,
  shippingMethod,
}) {
  const isOutsideDhaka = shippingMethod === "outside_dhaka";

  // reset transaction number when payment method changes
  useEffect(() => {
    if (value !== "bkash") {
      setTransactionNumber("");
    }
  }, [value, setTransactionNumber]);

  return (
    <div className="space-y-4 border-b-2 border-black">
      <RadioGroup value={value} onValueChange={setValue}>
        {/* COD */}
        {!isOutsideDhaka && (
          <label className="flex items-center border border-black p-4 cursor-pointer">
            <RadioGroupItem value="cod" className="mr-3" />
            <span className="font-medium">Cash on Delivery</span>
          </label>
        )}

        {/* bKash */}
        <label
          className={`block border p-4 cursor-pointer transition ${
            value === "bkash" ? "border-pink-500 bg-pink-50" : "border-black"
          }`}
        >
          <div className="flex items-center">
            <RadioGroupItem value="bkash" className="mr-3" />
            <span className="font-medium">Pay with bKash</span>
          </div>

          {/* Dropdown content */}
          {value === "bkash" && (
            <div className="mt-4 text-sm text-gray-600 space-y-2 pl-6">
              <p>1. Open your bKash App</p>
              <p>2. Tap Make Payment </p>
              <p>
                3. Send to: <b>01877776095</b>
              </p>
              <p>4. Complete payment using PIN</p>
              <p>5. Copy TrxID</p>
              <p>6. Enter below</p>

              <Input
                value={transactionNumber || ""}
                onChange={(e) =>
                  setTransactionNumber(e.target.value.trimStart())
                }
                placeholder="Enter bKash TrxID"
                disabled={value !== "bkash"}
                className="mt-3 bg-white border border-black rounded-none focus-visible:ring-0"
              />
            </div>
          )}
        </label>
      </RadioGroup>

      {/* warning */}
      {isOutsideDhaka && (
        <p className="text-xs text-red-500">
          Cash on Delivery is not available outside Dhaka.
        </p>
      )}
    </div>
  );
}
