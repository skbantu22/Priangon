
"use client"
import React, { useEffect, useState } from "react";
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD, ADMIN_MEDIA_SHOW } from "@/Route/Adminpannelroute";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import { Card,CardHeader,CardContent } from "@/components/ui/card";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Media from "@/components/ui/Application/Admin/Media";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Label } from "@radix-ui/react-label";
import { Checkbox } from "@/components/ui/checkbox";
import useDeleteMutation from "@/hook/useDeleteMutation";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { label: "Media" }, // ✅ no href for last item
];

const MediaPage = () => {

 const queryClient = useQueryClient()

 const [deleteType,setDeleteType]= useState('SD')
 const [selectedMedia, setSelectedMedia] = useState([]);
 const [selectAll,setSelectAll]=useState(false)
const searchParams = useSearchParams()

useEffect(() => {
  if (searchParams) {
    const trashOf = searchParams.get('trashof')
     setSelectedMedia([])
    if (trashOf) {
      setDeleteType('PD')
    } else {
      setDeleteType('SD')
    }
  }
}, [searchParams])


  const fetchMedia = async (page, deleteType) => {
  const { data: response } = await axios.get(`/api/media?page=${page}&&limit=10&&deleteType=${deleteType}`)
  console.log(response)
  return response
}

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['media-data',deleteType],
    queryFn: async({pageParam})=>await fetchMedia(pageParam,deleteType),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const nextpage=pages.length
    return lastPage.hasMore? nextpage : undefined
    }
       ,
  })

const deleteMutation = useDeleteMutation('media-data', '/api/media/delete')


const handleDelete = (ids,deleteType) => {
  let c = true

if (deleteType === "PD") {
  c = confirm("Are you sure you want to delete the data permanently?")
}

if (c) {
  deleteMutation.mutate({ids,deleteType})
}
}
const handleSelectAll = () => {
  
  setSelectAll(!selectAll)
}

useEffect(() => {
  if (selectAll) {
    const ids = data.pages.flatMap(page =>
      page.mediaData.map(media => media._id)
    );
    setSelectedMedia(ids);
  } else {
    setSelectedMedia([]);
  }
}, [selectAll]);





  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />
      <Card className="py-0 rounded shadow-sm">
  <CardHeader className="pt-2 px-3 border-b [..border-b]:pb-2">
    <div className="flex justify-between items-center">
      <h4 className="font-semibold text-xl uppercase">

          {deleteType === 'SD' ? 'Media' : 'Media Trash'}


      </h4>

      <div className="flex items-center gap-5">
{deleteType === 'SD' && (
  <UploadMedia isMultiple={true} queryClient={queryClient} />
)}

        <div className="flex gap-3">
  {deleteType === 'SD' ? (
    <Button type="button" variant="destructive">
      <Link href={`${ADMIN_MEDIA_SHOW}?trashof=media`}>
        Trash
      </Link>
    </Button>
  ) : (
    <Button type="button">
      <Link href={`${ADMIN_MEDIA_SHOW}`}>
        Back To Media
      </Link>
    </Button>
  )}
</div>

      </div>
    </div>
  </CardHeader>

  <CardContent>

    {selectedMedia.length > 0 && (
  <div className="py-2 px-3 bg-violet-200 mb-2 rounded flex justify-between items-center">
    <Label>
      <Checkbox
        checked={selectAll}
        onCheckedChange={handleSelectAll}
        className="border-primary"
      />
      Select All
    </Label>
    <div className="flex gap-2">
  {deleteType === 'SD' ? (
    <Button
      variant="destructive"
      onClick={() => handleDelete(selectedMedia, deleteType)} className="cursor-pointer"
    >
      Move Into Trash
    </Button>
  ) : (
    <>
      <Button
        className="bg-green-500 hover:bg-green-600"
        onClick={() => handleDelete(selectedMedia, "RSD")}
      >
        Restore
      </Button>

      <Button
        variant="destructive"
        onClick={() => handleDelete(selectedMedia, deleteType)}
      >
        Delete Permanently
      </Button>
    </>
  )}
</div>

  </div>
)}


 {status === 'pending' ? (
    <p>Loading...</p>
  ) : status === 'error' ? (
      <p>Error: {error.message}</p>
  ) : 
  <div className='grid lg:grid-cols-5 sm:grid-cols-3 grid-cols-2 gap-2 mb-5'>
  {
    data?.pages?.map((page, index) => (
      <React.Fragment key={index}>
        {
          page?.mediaData?.map((media) => (

             <Media key={media._id}
             media={media}
             handleDelete={handleDelete}
             deleteType={deleteType}
              selectedMedia={selectedMedia}
  setSelectedMedia={setSelectedMedia}         
             />

          ))
        }
      </React.Fragment>
    ))
  }
</div>

}

{hasNextPage && (
  <ButtonLoading
    type="button"
    loading={isFetching}
    onClick={() => fetchNextPage()}
    text="Load More"
  />
)}


  </CardContent>
</Card>
    </div>
  );
};

export default MediaPage;
