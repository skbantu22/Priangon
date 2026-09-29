import Showroom from "@/models/Showroom.model";

async function saleCenter() {
  return Showroom.findOne({ isSaleCenter: true })
    .sort({ createdAt: 1 })
    .select("_id name")
    .lean();
}

const warehouseTill = () => ({
  isWarehouse: true,
  showroomId: "warehouse",
  locationType: "WAREHOUSE",
  locationId: null,
  soldFrom: "WAREHOUSE",
  locationName: "Warehouse",
  orderShowroomId: null,
});

const showroomTill = (id, name) => ({
  isWarehouse: false,
  showroomId: id ? String(id) : "",
  locationType: "SHOWROOM",
  locationId: id ? String(id) : null,
  soldFrom: "SHOWROOM",
  locationName: name || "Sale Center",
  orderShowroomId: id || null,
});

async function ownShowroomTill(showroomId) {
  const own = await Showroom.findById(showroomId).select("name").lean();
  return showroomTill(showroomId, own?.name || "Showroom");
}

/**
 * Shop the stock transfer leaves from.
 *
 * An admin moves stock out of the shop selected in the top branch switch.
 * Anyone else is locked to the shop on their login, even if the request
 * names a different one. The warehouse is not a transfer source.
 */
export async function resolveTransferSource(auth, requested) {
  if (auth?.role !== "admin") {
    const id = String(auth?.showroomId || "");

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return { error: "Your login is not tied to a shop" };
    }

    const shop = await Showroom.findOne({ _id: id, isActive: { $ne: false } })
      .select("name")
      .lean();

    if (!shop) return { error: "Your shop is not available" };

    return { id, name: shop.name };
  }

  const id = String(requested || "");

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return { error: "Switch to a shop before transferring stock" };
  }

  const shop = await Showroom.findOne({ _id: id, isActive: { $ne: false } })
    .select("name")
    .lean();

  if (!shop) return { error: "That shop is not available" };

  return { id, name: shop.name };
}

/** Admin may pick Warehouse or any showroom. Every other login is locked
 * to their own branch. A showroom id in the query is ignored for them. */
export async function resolveLockedTill(auth, requested) {
  if (auth?.role !== "admin") {
    if (auth?.posTill === "warehouse") return warehouseTill();
    if (auth?.showroomId && /^[a-f\d]{24}$/i.test(String(auth.showroomId))) {
      return ownShowroomTill(auth.showroomId);
    }
    const center = await saleCenter();
    return showroomTill(center?._id, center?.name);
  }

  const requestedId = requested == null ? "" : String(requested);

  if (requestedId && requestedId !== "all") {
    if (requestedId === "warehouse" || requestedId.toUpperCase() === "WAREHOUSE") {
      return warehouseTill();
    }
    if (/^[a-f\d]{24}$/i.test(requestedId)) {
      const chosen = await Showroom.findById(requestedId).select("name").lean();
      if (chosen) return showroomTill(requestedId, chosen.name);
    }
  }

  return warehouseTill();
}
