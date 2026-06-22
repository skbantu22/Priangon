import { Truck } from "lucide-react";
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ShippingForm({
  form,
  onSubmit,
  MediaModal,
  open,
  setOpen,
  selectedMedia,
  setSelectedMedia,
}) {
  return (
    <div className=" border bg-white">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <Truck size={16} />
        <p className="font-semibold">Shipping Address</p>
      </div>

      <div className="p-5">
        <Form {...form}>
          <form
            id="checkout-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-5"
          >
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <Label>Full Name</Label>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="phone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <Label>Phone</Label>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="address"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <Label>Address</Label>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              name="city"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <Label>City</Label>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              name="note"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <Label>Note</Label>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="border px-3 py-2"
            >
              Select Media
            </button>
          </form>
        </Form>

        <MediaModal
          open={open}
          setOpen={setOpen}
          selectedMedia={selectedMedia}
          setSelectedMedia={setSelectedMedia}
          isMultiple
        />
      </div>
    </div>
  );
}
