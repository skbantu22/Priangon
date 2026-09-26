import mongoose from "mongoose";

import { currentActor } from "@/lib/activityContext";

/**
 * Activity Log plugin, like 360's: one line on a schema and every create,
 * change and delete of that model is written down with who did it.
 *
 *   purchaseSchema.plugin(activityLog, { module: "Purchase", label: "purchaseNumber" });
 *
 * A soft delete (deletedAt set) is logged as "deleted". Logging never
 * waits on, or breaks, the save it describes.
 */

// never stored or shown
const SECRET = new Set(["password", "tokenVersion", "otp", "__v", "updatedAt", "createdAt"]);

const clean = (value) => {
  if (value === undefined) return undefined;
  const plain = JSON.parse(JSON.stringify(value ?? null));
  if (plain && typeof plain === "object" && !Array.isArray(plain)) {
    for (const key of Object.keys(plain)) if (SECRET.has(key)) delete plain[key];
  }
  return plain;
};

const topLevel = (paths) => [...new Set(paths.map((path) => path.split(".")[0]))].filter((p) => !SECRET.has(p));

const pick = (source, keys) => Object.fromEntries(keys.map((key) => [key, clean(source?.[key])]));

// the ActivityLog model is loaded lazily: it lives in the same mongoose
// instance and must not itself be watched
let LogModel = null;
const logModel = async () => {
  if (!LogModel) LogModel = (await import("@/models/ActivityLog.model")).default;
  return LogModel;
};

const actorName = async (actor) => {
  if (!actor?.userId) return "";
  if (actor.userName !== undefined) return actor.userName;
  try {
    const user = await mongoose.connection.db
      .collection("users")
      .findOne({ _id: new mongoose.Types.ObjectId(String(actor.userId)) }, { projection: { name: 1 } });
    actor.userName = user?.name || "";
  } catch {
    actor.userName = "";
  }
  return actor.userName;
};

function write(entry) {
  const actor = currentActor();

  // nothing to attribute outside a signed-in request (seed scripts, jobs)
  if (!actor) return;

  (async () => {
    const Log = await logModel();
    await Log.create({
      userId: mongoose.isValidObjectId(actor.userId) ? actor.userId : null,
      userName: await actorName(actor),
      role: actor.role || "",
      ...entry,
    });
  })().catch((error) => console.error("ACTIVITY LOG ERROR:", error.message));
}

export function activityLog(schema, { module, label = "name" }) {
  const labelOf = (doc) => String(doc?.[label] ?? doc?.name ?? "").slice(0, 120);

  // ---- doc.save()
  schema.pre("save", function () {
    this.$locals.activity = {
      isNew: this.isNew,
      paths: this.isNew ? [] : topLevel(this.modifiedPaths()),
      softDelete: !this.isNew && this.isModified("deletedAt") && this.deletedAt != null,
    };
  });

  schema.post("save", function (doc) {
    const info = doc.$locals.activity;
    if (!info) return;

    if (info.isNew) {
      write({ module, action: "created", docId: doc._id, label: labelOf(doc), changes: { new: clean(doc.toObject()) } });
    } else if (info.softDelete) {
      write({ module, action: "deleted", docId: doc._id, label: labelOf(doc), changes: { old: clean(doc.toObject()) } });
    } else if (info.paths.length) {
      write({ module, action: "updated", docId: doc._id, label: labelOf(doc), changes: { new: pick(doc, info.paths) } });
    }
  });

  // ---- Model.findOneAndUpdate / updateOne: keep the old values to show what changed
  const beforeUpdate = async function () {
    if (!currentActor()) return;
    try {
      this._activityOld = await this.model.findOne(this.getQuery()).lean();
    } catch {
      this._activityOld = null;
    }
  };

  const afterUpdate = function () {
    const old = this._activityOld;
    if (!old) return;

    const update = this.getUpdate() || {};
    const set = { ...(update.$set || {}), ...Object.fromEntries(Object.entries(update).filter(([k]) => !k.startsWith("$"))) };
    const keys = topLevel([...Object.keys(set), ...Object.keys(update.$inc || {}), ...Object.keys(update.$push || {}), ...Object.keys(update.$pull || {})]);
    if (!keys.length) return;

    const deleted = set.deletedAt != null && old.deletedAt == null;
    const changes = deleted
      ? { old: clean(old) }
      : { old: pick(old, keys), new: pick({ ...old, ...set }, keys) };

    write({ module, action: deleted ? "deleted" : "updated", docId: old._id, label: labelOf(old), changes });
  };

  schema.pre("findOneAndUpdate", beforeUpdate);
  schema.post("findOneAndUpdate", afterUpdate);
  schema.pre("updateOne", { document: false, query: true }, beforeUpdate);
  schema.post("updateOne", { document: false, query: true }, afterUpdate);

  // ---- hard deletes
  const beforeDelete = async function () {
    if (!currentActor()) return;
    try {
      this._activityOld = await this.model.findOne(this.getQuery()).lean();
    } catch {
      this._activityOld = null;
    }
  };

  const afterDelete = function () {
    const old = this._activityOld;
    if (old) write({ module, action: "deleted", docId: old._id, label: labelOf(old), changes: { old: clean(old) } });
  };

  schema.pre("findOneAndDelete", beforeDelete);
  schema.post("findOneAndDelete", afterDelete);
  schema.pre("deleteOne", { document: false, query: true }, beforeDelete);
  schema.post("deleteOne", { document: false, query: true }, afterDelete);
}
