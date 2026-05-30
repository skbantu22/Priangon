// store/notificationSlice.js

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  orderCount: 0,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    incrementOrderNotification: (state) => {
      state.orderCount += 1;
    },

    resetOrderNotification: (state) => {
      state.orderCount = 0;
    },
  },
});

export const { incrementOrderNotification, resetOrderNotification } =
  notificationSlice.actions;

export default notificationSlice.reducer;
