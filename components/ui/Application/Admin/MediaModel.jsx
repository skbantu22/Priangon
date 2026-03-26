import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import { Button } from "../../button";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import loadingIcon from "@/public/assets/loading.svg";
import Image from "next/image";
import axios from "axios";
import ModalMediaBlock from "./ModalMediaBlock";
import { showToast } from "@/lib/showToast";

const MediaModal = ({
  open,
  setOpen,
  selectedMedia,
  setSelectedMedia,
  isMultiple,
}) => {
  const [previouslySelected, setPreviouslySelected] = useState([]);

  // 1. Fetch function
  const fetchMedia = async (page) => {
    const { data: response } = await axios.get(
      `/api/media?page=${page}&limit=18&deleteType=SD`,
    );
    return response;
  };

  // 2. Infinite Query Setup
  const {
    isPending,
    isError,
    error,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["MediaModal"],
    queryFn: async ({ pageParam }) => await fetchMedia(pageParam),
    placeholderData: keepPreviousData,
    initialPageParam: 0, // Starts at page 0
    getNextPageParam: (lastPage, allPages) => {
      // If the last fetched page indicates there's more data,
      // the next page number is the total count of pages already fetched.
      return lastPage.hasMore ? allPages.length : undefined;
    },
  });

  const handleClear = () => {
    setSelectedMedia([]);
    showToast("success", "Media selection cleared.");
  };

  const handleClose = () => {
    // Revert to what was selected before opening the modal
    setSelectedMedia(previouslySelected);
    setOpen(false);
  };

  const handleSelect = () => {
    if (selectedMedia.length <= 0) {
      return showToast("error", "Please select at least one image.");
    }
    setPreviouslySelected(selectedMedia);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-[80%] h-screen p-0 py-10 bg-transparent border-0 shadow-none"
      >
        <DialogDescription className="hidden" />

        <div className="h-[90vh] bg-white p-3 rounded shadow flex flex-col">
          <DialogHeader className="h-8 border-b">
            <DialogTitle className="text-sm font-bold uppercase tracking-widest">
              Media Selection Library
            </DialogTitle>
          </DialogHeader>

          {/* Scrolling Content Area */}
          <div className="flex-1 overflow-auto py-4 px-1">
            {isPending ? (
              <div className="size-full flex justify-center items-center">
                <Image src={loadingIcon} alt="loading" height={60} width={60} />
              </div>
            ) : isError ? (
              <div className="size-full flex justify-center items-center text-red-500">
                {error.message || "Failed to load media"}
              </div>
            ) : (
              <>
                {/* Image Grid */}
                <div className="grid lg:grid-cols-6 md:grid-cols-4 grid-cols-3 gap-3">
                  {data?.pages?.map((page, index) => (
                    <React.Fragment key={index}>
                      {page?.mediaData?.map((media) => (
                        <ModalMediaBlock
                          key={media._id}
                          media={media}
                          selectedMedia={selectedMedia}
                          setSelectedMedia={setSelectedMedia}
                          isMultiple={isMultiple}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                {/* --- LOAD MORE BUTTON --- */}
                <div className="flex flex-col items-center justify-center mt-10 mb-6">
                  {hasNextPage ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="border-2 border-black rounded-none font-black uppercase text-[10px] tracking-tighter px-10 h-11 hover:bg-black hover:text-white transition-all active:scale-95"
                    >
                      {isFetchingNextPage
                        ? "Fetching More..."
                        : "Load More Media"}
                    </Button>
                  ) : (
                    <div className="py-4 border-t border-dashed border-gray-200 w-full text-center">
                      <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                        All Media Loaded
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer UI */}
          <div className="h-16 pt-3 border-t flex justify-between items-center bg-gray-50 px-2 -mx-3 -mb-3 rounded-b">
            <Button
              type="button"
              variant="destructive"
              onClick={handleClear}
              className="rounded-none font-bold uppercase text-[10px] h-9"
            >
              Clear Selection
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="rounded-none border-black font-bold uppercase text-[10px] h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSelect}
                className="rounded-none bg-black text-white hover:bg-zinc-800 font-bold uppercase text-[10px] h-9 px-6"
              >
                Confirm ({selectedMedia.length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;
