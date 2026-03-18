"use client"
import axios from "axios";
import { useEffect, useState } from "react";

export default function useFetch(url, method = "GET", body = null) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        let res;

        if (method === "POST") {
          res = await axios.post(url, body);
        } else {
          res = await axios.get(url);
        }

        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url, method, JSON.stringify(body)]); // body dependency

  return { data, error };
}
