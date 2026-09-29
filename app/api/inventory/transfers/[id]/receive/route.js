import mongoose from "mongoose";

import { NextResponse } from "next/server";



import { connectDB } from "@/lib/databaseconnection";

import { actorFullName, requireAnyPermission } from "@/lib/apiAuth";

import { SHOWROOM, applyStockChange } from "@/lib/stockService";

import { resolveTransferSource } from "@/lib/posTillAuth";



import StockTransfer from "@/models/StockTransfer.model";



/**

 * Confirms a pending transfer at the destination shop.

 *

 * New sends keep stock in transit until confirm. Legacy rows with

 * destinationStockApplied already true only flip status — no second stock move.

 */

export async function POST(req, { params }) {

  try {

    const auth = await requireAnyPermission(["stock.transfer", "stock.adjust"]);

    if (auth.response) return auth.response;



    await connectDB();



    const { id } = await params;



    if (!mongoose.isValidObjectId(id)) {

      return NextResponse.json(

        { success: false, message: "Unknown transfer" },

        { status: 400 },

      );

    }



    let body = {};



    try {

      body = await req.json();

    } catch {

      body = {};

    }



    const shop = await resolveTransferSource(auth, body.showroomId);



    if (shop.error) {

      return NextResponse.json({ success: false, message: shop.error }, { status: 400 });

    }



    const transfer = await StockTransfer.findById(id);



    if (!transfer) {

      return NextResponse.json(

        { success: false, message: "That transfer no longer exists" },

        { status: 404 },

      );

    }



    if (String(transfer.toId) !== String(shop.id)) {

      return NextResponse.json(

        { success: false, message: "This transfer is not for your shop" },

        { status: 403 },

      );

    }



    if (transfer.status === "received") {
      return NextResponse.json(
        { success: false, message: `${transfer.transferNumber} is already confirmed` },
        { status: 400 },
      );
    }

    if (transfer.status === "rejected") {
      return NextResponse.json(
        { success: false, message: `${transfer.transferNumber} was rejected` },
        { status: 400 },
      );
    }



    const confirmedBy = await actorFullName(auth);

    const note = `${transfer.transferNumber} confirmed at ${transfer.toName}`;

    const needsStock = !transfer.destinationStockApplied;

    const landed = [];



    if (needsStock) {

      try {

        for (const item of transfer.items) {

          await applyStockChange({

            locationType: SHOWROOM,

            locationId: String(transfer.toId),

            productId: item.productId,

            variantId: item.variantId,

            delta: item.quantity,

            type: "TRANSFER_IN",

            note,

            createdBy: confirmedBy,

            productName: item.productName,

          });



          landed.push(item);

        }

      } catch (moveError) {

        for (const item of landed) {

          await applyStockChange({

            locationType: SHOWROOM,

            locationId: String(transfer.toId),

            productId: item.productId,

            variantId: item.variantId,

            delta: -item.quantity,

            type: "TRANSFER_OUT",

            note: `${transfer.transferNumber} confirm reversed`,

            createdBy: confirmedBy,

            productName: item.productName,

          });

        }



        throw moveError;

      }

    }



    const saved = await StockTransfer.findOneAndUpdate(

      { _id: id, status: "pending" },

      {

        $set: {

          status: "received",

          receivedAt: new Date(),

          receivedBy: confirmedBy,

          destinationStockApplied: true,

        },

      },

      { new: true },

    );



    if (!saved) {

      if (needsStock && landed.length) {

        for (const item of landed) {

          await applyStockChange({

            locationType: SHOWROOM,

            locationId: String(transfer.toId),

            productId: item.productId,

            variantId: item.variantId,

            delta: -item.quantity,

            type: "TRANSFER_OUT",

            note: `${transfer.transferNumber} duplicate confirm reversed`,

            createdBy: confirmedBy,

            productName: item.productName,

          });

        }

      }



      const current = await StockTransfer.findById(id).lean();



      if (current?.status === "received") {

        return NextResponse.json(

          { success: false, message: `${transfer.transferNumber} is already confirmed` },

          { status: 400 },

        );

      }



      return NextResponse.json(

        { success: false, message: "Could not confirm this transfer" },

        { status: 409 },

      );

    }



    return NextResponse.json({

      success: true,

      message: `${saved.transferNumber} confirmed`,

      data: saved,

    });

  } catch (error) {

    console.error("TRANSFER RECEIVE ERROR:", error);



    return NextResponse.json(

      { success: false, message: error.message || "Could not confirm this transfer" },

      { status: 500 },

    );

  }

}

