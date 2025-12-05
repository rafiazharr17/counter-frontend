import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const userManagementApi = createApi({
  reducerPath: 'userManagementApi',
  baseQuery,
  tagTypes: ['User', 'Role'],
  endpoints: (builder) => ({
    // Get users with pagination and filters
    getUsers: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        if (params.search) queryParams.append('search', params.search);
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.order) queryParams.append('order', params.order);
        if (params.archived !== undefined) queryParams.append('archived', params.archived);
        if (params.page) queryParams.append('page', params.page);
        
        return `users?${queryParams.toString()}`;
      },
      transformResponse: (response) => {
        // Transform response to match expected structure
        return {
          data: response.data || [],
          meta: {
            total: response.total || 0,
            current_page: response.current_page || 1,
            last_page: response.last_page || 1,
            per_page: response.per_page || 20,
            from: response.from || 1,
            to: response.to || 0,
          }
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User', id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    // Get archived users (trashed)
    getArchivedUsers: builder.query({
      query: () => 'users/trashed',
      transformResponse: (response) => {
        // API trashed mengembalikan format yang berbeda
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['User'],
    }),

    // Get single user
    getUser: builder.query({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Create user
    createUser: builder.mutation({
      query: (userData) => ({
        url: 'users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    // Update user - TAMBAHKAN ENDPOINT INI
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: `users/${id}`,
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Update user role
    updateUserRole: builder.mutation({
      query: ({ id, role_id }) => ({
        url: `users/${id}/role`,
        method: 'PUT',
        body: { role_id },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Assign counter to user
    assignCounterToUser: builder.mutation({
      query: ({ id, counter_id }) => ({
        url: `users/${id}/assign-counter`,
        method: 'POST',
        body: { counter_id },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Archive user (soft delete)
    archiveUser: builder.mutation({
      query: (id) => ({
        url: `users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    // Restore user
    restoreUser: builder.mutation({
      query: (id) => ({
        url: `users/restore/${id}`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    // Force delete user
    forceDeleteUser: builder.mutation({
      query: (id) => ({
        url: `users/force/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    // Get all roles
    getRoles: builder.query({
      query: () => 'roles',
      transformResponse: (response) => {
        // Transform roles response
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['Role'],
    }),

    // Get all counters (untuk assign ke user)
    getCounters: builder.query({
      query: () => 'counters',
      transformResponse: (response) => {
        // Transform counters response
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['Counter'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetArchivedUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation, // TAMBAHKAN INI
  useUpdateUserRoleMutation,
  useAssignCounterToUserMutation,
  useArchiveUserMutation,
  useRestoreUserMutation,
  useForceDeleteUserMutation,
  useGetRolesQuery,
  useGetCountersQuery,
} = userManagementApi;