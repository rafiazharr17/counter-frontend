import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery,
  tagTypes: ["Auth"],
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (body) => ({
        url: "auth/register",
        method: "POST",
        body,
      }),
      transformResponse: (response) => {
        // backend bisa mengembalikan access_token di root atau di data
        const token =
          response?.access_token ||
          response?.data?.access_token ||
          response?.token ||
          null;
        const user = response?.user || response?.data?.user || response || null;

        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        return response;
      },
    }),

    login: builder.mutation({
      query: (body) => ({
        url: "auth/login",
        method: "POST",
        body,
      }),
      transformResponse: (response) => {
        const token =
          response?.access_token ||
          response?.data?.access_token ||
          response?.token ||
          null;
        const user = response?.user || response?.data?.user || response || null;

        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        return response;
      },
    }),

    guestLogin: builder.mutation({
      query: () => ({
        url: "auth/guest-login",
        method: "POST",
      }),
      transformResponse: (response) => {
        const token =
          response?.access_token ||
          response?.data?.access_token ||
          response?.token ||
          null;
        const user = response?.user || response?.data?.user || response || null;

        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        return response;
      },
    }),

    logout: builder.mutation({
      query: () => ({
        url: "auth/logout",
        method: "POST",
      }),
      transformResponse: (response) => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return response;
      },
    }),

    getCurrentUser: builder.query({
      query: () => "auth/me",
      transformResponse: (response) => {
        if (response) {
          // keep localStorage user in sync if backend returns user object
          const user = response?.data || response;
          localStorage.setItem("user", JSON.stringify(user));
        }
        return response;
      },
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGuestLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
} = authApi;
