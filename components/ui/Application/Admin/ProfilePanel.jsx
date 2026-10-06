"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { IoCamera, IoLanguage, IoLockClosed, IoLogOut, IoPerson } from "react-icons/io5";

import { showToast } from "@/lib/showToast";
import { WEBSITE_LOGIN } from "@/Route/Websiteroute";
import { login, logout } from "@/store/reducer/authReducer";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const Row = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const ProfilePanel = ({ open, onOpenChange }) => {
  const router = useRouter();
  const dispatch = useDispatch();

  const auth = useSelector((state) => state.authStore.auth);
  const user = auth?.data?.user || auth?.user;

  const { language, setLanguage } = useLanguage();

  const [shopName, setShopName] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || shopName) return;

    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (data?.success && data.data?.companyName) {
          setShopName(data.data.companyName);
        }
      })
      .catch(() => {
        // The panel works without it; only the heading is affected
      });
  }, [open, shopName]);

  const changePassword = async () => {
    if (!form.current || !form.next) {
      showToast("error", "Fill in both passwords");
      return;
    }

    if (form.next.length < 6) {
      showToast("error", "The new password must be at least 6 characters");
      return;
    }

    if (form.next !== form.confirm) {
      showToast("error", "The two new passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post("/api/profile/change-password", {
        currentPassword: form.current,
        newPassword: form.next,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not change the password");
        return;
      }

      showToast("success", data.message);
      setPasswordOpen(false);
      setForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not change the password",
      );
    } finally {
      setSaving(false);
    }
  };

  const photoInput = useRef(null);
  const [uploading, setUploading] = useState(false);

  // a new profile picture: saved on the login and kept in the session copy
  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Choose an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "The photo must be under 5 MB");
      return;
    }

    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const { data } = await axios.post("/api/profile/update", body);

      if (!data.success) {
        showToast("error", data.message || "Could not change the photo");
        return;
      }

      const avatar = data.data?.avatar?.url || "";
      const next = auth?.data?.user
        ? { ...auth, data: { ...auth.data, user: { ...auth.data.user, avatar } } }
        : { ...auth, user: { ...auth?.user, avatar } };
      dispatch(login(next));
      showToast("success", "Profile photo changed");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not change the photo");
    } finally {
      setUploading(false);
    }
  };

  const signOut = async () => {
    try {
      const { data } = await axios.post("/api/auth/logout");

      if (!data.success) throw new Error(data.message);

      dispatch(logout());
      showToast("success", data.message);
      router.push(WEBSITE_LOGIN);
    } catch (error) {
      showToast("error", error.message || "Could not sign out");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[min(90vw,24rem)] p-0 sm:max-w-sm"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-left">
              {shopName || user?.name || "Account"}
            </SheetTitle>
          </SheetHeader>

          {user && (
            <div className="flex flex-col items-center gap-2 border-b px-4 py-5">
              <div className="relative">
                <span className="flex size-24 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-3xl font-bold text-primary">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="size-full object-cover" />
                  ) : (
                    String(user.name || "?").trim().charAt(0).toUpperCase()
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-md hover:brightness-110 disabled:opacity-60"
                >
                  <IoCamera className="size-4" />
                </button>
              </div>
              <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={changePhoto} />
              <p className="text-xs text-muted-foreground">
                {uploading ? "Uploading..." : "Tap the camera to change your photo"}
              </p>
            </div>
          )}

          <div className="divide-y">
            {user && (
              <Row icon={IoPerson}>
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                  {user.role ? ` · ${user.role}` : ""}
                </p>
              </Row>
            )}

            <Row icon={IoLanguage}>
              <Label htmlFor="app-language" className="text-xs text-muted-foreground">
                Language
              </Label>
              <select
                id="app-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {Object.entries(LANGUAGES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label} — {item.sample}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Only on this device. The shop-wide default is in System
                Settings.
              </p>
            </Row>

            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="w-full text-left hover:bg-accent/50"
            >
              <Row icon={IoLockClosed}>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground">
                  Signs your other devices out
                </p>
              </Row>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full text-left hover:bg-destructive/10"
            >
              <Row icon={IoLogOut}>
                <p className="text-sm font-medium text-destructive">Logout</p>
              </Row>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-current">Current Password</Label>
              <Input
                id="pw-current"
                type="password"
                value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-next">New Password</Label>
              <Input
                id="pw-next"
                type="password"
                value={form.next}
                onChange={(e) => setForm({ ...form, next: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
              {form.confirm && form.confirm !== form.next && (
                <p className="text-xs text-destructive">
                  The two passwords do not match
                </p>
              )}
            </div>

            <p className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              Changing this signs you out on every other device.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>

            <Button onClick={changePassword} disabled={saving}>
              {saving ? "Saving..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePanel;
