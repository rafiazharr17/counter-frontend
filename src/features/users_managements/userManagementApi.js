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
  tagTypes: ['User', 'Role', 'Counter'],
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
        return {
          data: response.data || response || [],
          meta: {
            total: response.total || response.meta?.total || 0,
            current_page: response.current_page || response.meta?.current_page || 1,
            last_page: response.last_page || response.meta?.last_page || 1,
            per_page: response.per_page || response.meta?.per_page || 20,
            from: response.from || response.meta?.from || 1,
            to: response.to || response.meta?.to || 0,
          }
        };
      },
      providesTags: (result) =>
        result?.data
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
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['User'],
    }),

    // Get single user
    getUser: builder.query({
      query: (id) => `users/${id}`,
      transformResponse: (response) => {
        return {
          data: response.data || response,
        };
      },
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

    // Update user
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

    // Assign SINGLE counter to user (sesuai dengan api.php)
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

    // Unassign counter from user (sesuai dengan api.php)
    unassignCounterFromUser: builder.mutation({
      query: (id) => ({
        url: `users/${id}/unassign-counter`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
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
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['Role'],
    }),

    // Get all counters
    getCounters: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        if (params.search) queryParams.append('search', params.search);
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.order) queryParams.append('order', params.order);
        if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
        
        const queryString = queryParams.toString();
        return `counters${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response) => {
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['Counter'],
    }),

    // Get available counters (not assigned to any user)
    getAvailableCounters: builder.query({
      query: () => 'counters?available=true',
      transformResponse: (response) => {
        return {
          data: response.data || response || [],
        };
      },
      providesTags: ['Counter'],
    }),

    // Get single counter
    getCounter: builder.query({
      query: (id) => `counters/${id}`,
      transformResponse: (response) => {
        return {
          data: response.data || response,
        };
      },
      providesTags: (result, error, id) => [{ type: 'Counter', id }],
    }),

    // Create counter
    createCounter: builder.mutation({
      query: (counterData) => ({
        url: 'counters',
        method: 'POST',
        body: counterData,
      }),
      invalidatesTags: [{ type: 'Counter', id: 'LIST' }],
    }),

    // Update counter
    updateCounter: builder.mutation({
      query: ({ id, ...counterData }) => ({
        url: `counters/${id}`,
        method: 'PUT',
        body: counterData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Counter', id },
        { type: 'Counter', id: 'LIST' },
      ],
    }),

    // Delete counter
    deleteCounter: builder.mutation({
      query: (id) => ({
        url: `counters/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Counter', id: 'LIST' }],
    }),

    // Get counters statistics
    getCounterStats: builder.query({
      query: () => 'counters/statistics',
      transformResponse: (response) => {
        return {
          data: response.data || response || {},
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
  useUpdateUserMutation,
  useUpdateUserRoleMutation,
  useAssignCounterToUserMutation,
  useUnassignCounterFromUserMutation,
  useArchiveUserMutation,
  useRestoreUserMutation,
  useForceDeleteUserMutation,
  useGetRolesQuery,
  useGetCountersQuery,
  useGetAvailableCountersQuery,
  useGetCounterQuery,
  useCreateCounterMutation,
  useUpdateCounterMutation,
  useDeleteCounterMutation,
  useGetCounterStatsQuery,
} = userManagementApi;