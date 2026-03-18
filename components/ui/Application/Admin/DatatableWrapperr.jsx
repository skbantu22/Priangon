"use client";
import { darkTheme, lightTheme } from "@/lib/materialTheme";
import { ThemeProvider } from "@mui/material";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Datatable from "./Datatable";

const DatatableWrapperr = ({
  queryKey,
  fetchUrl,
  columnsConfig,
  initialPageSize = 10,
  exportEndpoint,
  deleteEndpoint,
  deleteType,
  trashView,
  createAction,
}) => {


  const { resolvedTheme } = useTheme();

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);
if (!mounted) return null
  return (
    
<ThemeProvider theme={resolvedTheme === 'dark' ? darkTheme : lightTheme}>
  <Datatable
    queryKey={queryKey}
    fetchUrl={fetchUrl}
    columnsConfig={columnsConfig}
    initialPageSize={initialPageSize}
    exportEndpoint={exportEndpoint}
    deleteEndpoint={deleteEndpoint}
    deleteType={deleteType}
    trashView={trashView}
    createAction={createAction}
  />
</ThemeProvider>
  );
};

export default DatatableWrapperr;
