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

/** Cashiers sell only from their own till. Admin keeps the requested till. */
export async function resolveLockedTill(auth, requested) {
  const requestedId = requested == null ? "" : String(requested);

  if (auth?.role && auth.role !== "admin") {
    if (auth.posTill === "warehouse") return warehouseTill();
    const center = await saleCenter();
    const id = auth.showroomId || center?._id;
    return showroomTill(id, center?.name);
  }

  if (
    requestedId === "warehouse" ||
    requestedId.toUpperCase() === "WAREHOUSE" ||
    !requestedId ||
    requestedId === "all"
  ) {
    return warehouseTill();
  }

  const center = await Showroom.findById(requestedId).select("name").lean();
  return showroomTill(requestedId, center?.name);
}
