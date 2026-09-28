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

/** Any staff login can sell from Warehouse or the sale center. A request
 * picks that till. With no request, the login's own till is the start. */
export async function resolveLockedTill(auth, requested) {
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

  if (auth?.role && auth.role !== "admin" && auth.posTill !== "warehouse") {
    const center = await saleCenter();
    const id = auth.showroomId || center?._id;
    return showroomTill(id, center?.name);
  }

  return warehouseTill();
}
