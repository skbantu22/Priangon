import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Who is acting in the current request. requireRoles puts the signed-in
 * user here, and the Activity Log reads it from inside the model hooks,
 * which otherwise have no idea whose request they are part of.
 */
const store = globalThis.__activityActor || (globalThis.__activityActor = new AsyncLocalStorage());

export const setActor = (actor) => store.enterWith(actor);

export const currentActor = () => store.getStore() || null;
