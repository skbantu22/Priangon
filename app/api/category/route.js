 import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";

import CategoryModel from "@/models/category.model"; // ✅ your model path

export async function GET(request) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
const start = parseInt(searchParams.get('start') || 0, 10)
const size = parseInt(searchParams.get('size') || 10, 10)
const filters = JSON.parse(searchParams.get('filters') || "[]")
const globalFilter = searchParams.get('globalFilter') || ""
const sorting = JSON.parse(searchParams.get('sorting') || "[]")
const deleteType = searchParams.get('deleteType')
const showroomId = searchParams.get('showroomId') || ""
// Build match query
let matchQuery = {}

if (deleteType === 'SD') {
  matchQuery = { deletedAt: null }
} else if (deleteType === 'PD') {
  matchQuery = { deletedAt: { $ne: null } }
}
// One showroom's own categories (older ones without an owner are the warehouse's)
if (showroomId && showroomId !== 'all') {
  if (showroomId === 'warehouse') {
    matchQuery.showroomId = { $in: ['warehouse', null, ''] }
  } else {
    matchQuery.showroomId = showroomId
  }
}
// ?active=true leaves out deactivated categories (product / sub category forms)
if (searchParams.get('active') === 'true') {
  matchQuery.isActive = { $ne: false }
}
// Global search
if (globalFilter) {
  matchQuery["$or"] = [
    { name: { $regex: globalFilter, $options: 'i' } },
    { slug: { $regex: globalFilter, $options: 'i' } },
  ]
}
// Sorting
let sortQuery = {}

sorting.forEach(sort => {
  sortQuery[sort.id] = sort.desc ? -1 : 1
});
const aggregatePipeline = [
  { $match: matchQuery },
  {
    $sort: Object.keys(sortQuery).length
      ? sortQuery
      : { createdAt: -1 },
  },
  { $skip: start },
  { $limit: size },
  {
    $project: {
      _id: 1,
      name: 1,
      slug: 1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: 1,
      showroomId: 1,
      isActive: 1,
    },
  },
]
// Execute query
const getCategory = await CategoryModel.aggregate(aggregatePipeline)

// Get totalRowCount
const totalRowCount = await CategoryModel.countDocuments(matchQuery)

return NextResponse.json({
  success:true,
  data: getCategory,
  meta: { totalRowCount }
})


    
  } catch (error) {
    // If your catchError already returns NextResponse, keep it.
    // Otherwise fallback:
    // return NextResponse.json({ success:false, message:error?.message }, { status:500 })
    return catchError(error);
  }
}
