import { connectDB } from "@/lib/databaseconnection";
import Showroom from "@/models/Showroom.model";
import WarehouseStock from "@/models/WarehouseStock.model";
import { actorFullName, requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import { SHOWROOM, WAREHOUSE, applyStockChange } from "@/lib/stockService";

// The shop had no branch, so opening stock sat in the warehouse and the POS
// called it out of stock. The first branch takes that quantity onto its shelf.
async function placeWarehouseOnFirstBranch(showroomId, createdBy) {
  const rows = await WarehouseStock.find({ stock: { $gt: 0 } }).lean();
  let moved = 0;

  for (const row of rows) {
    const qty = Number(row.stock) || 0;
    if (qty <= 0) continue;

    const shared = {
      productId: row.productId,
      variantId: row.variantId,
      createdBy,
      productName: "item",
    };

    await applyStockChange({
      ...shared,
      locationType: WAREHOUSE,
      locationId: null,
      delta: -qty,
      type: "TRANSFER_OUT",
      note: "Moved to the first branch",
    });

    try {
      await applyStockChange({
        ...shared,
        locationType: SHOWROOM,
        locationId: String(showroomId),
        delta: qty,
        type: "TRANSFER_IN",
        note: "Opening the first branch",
      });
    } catch (error) {
      await applyStockChange({
        ...shared,
        locationType: WAREHOUSE,
        locationId: null,
        delta: qty,
        type: "TRANSFER_IN",
        note: "Returned to the warehouse",
      });
      throw error;
    }

    moved += 1;
  }

  return moved;
}

// ================= GET ALL SHOWROOMS =================
export async function GET() {
  try {
    await connectDB();

    const showrooms = await Showroom.find().sort({ createdAt: -1 });

    return Response.json({
      success: true,
      showrooms,
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 },
    );
  }
}

// ================= CREATE SHOWROOM =================
export async function POST(req) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();

    const body = await req.json();

    if (!body.name) {
      throw new Error("Showroom name required");
    }

    const exists = await Showroom.findOne({
      name: body.name,
    });

    if (exists) {
      throw new Error("Showroom already exists");
    }

    const hadBranch = await Showroom.countDocuments();

    const showroom = await Showroom.create({
      name: body.name,
      address: body.address,
      phone: body.phone,
      email: String(body.email || "").trim(),
      website: String(body.website || "").trim(),
      logo: String(body.logo || "").trim(),
      isActive: body.isActive !== false,
    });

    const moved = hadBranch === 0 ? await placeWarehouseOnFirstBranch(showroom._id, await actorFullName(auth)) : 0;

    return Response.json({
      success: true,
      showroom,
      moved,
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 400 },
    );
  }
}
