"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Barcode from "react-barcode";

const BarcodePrintPage = () => {
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [printQty, setPrintQty] = useState(1);
  const [labels, setLabels] = useState([]);

  // Fetch Variants
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const { data } = await axios.get("/api/product-variant?size=1000");

        if (data?.success) {
          setVariants(data.data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchVariants();
  }, []);

  // Generate Labels
  const generateLabels = () => {
    if (!selectedVariant) return;

    const newLabels = Array.from(
      { length: Number(printQty) },
      () => selectedVariant,
    );

    setLabels(newLabels);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black uppercase">Barcode Print Panel</h1>

        <button
          onClick={handlePrint}
          className="bg-black text-white px-6 py-3 uppercase font-bold"
        >
          Print
        </button>
      </div>

      {/* CONTROL PANEL */}
      <div className="bg-white border-2 border-black p-6 mb-8 space-y-5 print:hidden">
        {/* Variant Select */}
        <div>
          <label className="block text-xs font-bold uppercase mb-2">
            Select Variant
          </label>

          <select
            className="w-full border-2 border-black h-12 px-3"
            onChange={(e) => {
              const found = variants.find((v) => v._id === e.target.value);

              setSelectedVariant(found);
            }}
          >
            <option value="">Select Variant</option>

            {variants.map((variant) => (
              <option key={variant._id} value={variant._id}>
                {variant?.sku} | {variant?.color} | {variant?.size}
              </option>
            ))}
          </select>
        </div>

        {/* Print Quantity */}
        <div>
          <label className="block text-xs font-bold uppercase mb-2">
            Print Quantity
          </label>

          <input
            type="number"
            min={1}
            value={printQty}
            onChange={(e) => setPrintQty(e.target.value)}
            className="w-full border-2 border-black h-12 px-3"
          />
        </div>

        {/* Generate */}
        <button
          onClick={generateLabels}
          className="bg-black text-white px-6 py-3 uppercase font-bold"
        >
          Generate Barcode
        </button>
      </div>

      {/* PRINT AREA */}
      <div className="grid grid-cols-4 gap-4">
        {labels.map((item, index) => (
          <div
            key={index}
            className="bg-white border p-4 flex flex-col items-center"
          >
            {/* Product Info */}
            <h2 className="text-xs font-bold uppercase text-center">
              {item?.sku}
            </h2>

            <p className="text-[10px] uppercase mt-1">
              {item?.color} / {item?.size}
            </p>

            {/* Barcode */}
            <div className="mt-2">
              <Barcode
                value={item?.barcode}
                width={1.3}
                height={45}
                fontSize={12}
                margin={0}
              />
            </div>

            {/* Price */}
            <p className="font-bold text-sm mt-2">৳ {item?.sellingPrice}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarcodePrintPage;
