import { z } from 'zod';

export const userCreateSchema = z.object({
  name: z.string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  email: z.string()
    .email('Email tidak valid')
    .min(1, 'Email wajib diisi'),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter'),
  role_id: z.union([
    z.number().min(1, 'Role wajib dipilih'),
    z.string().min(1, 'Role wajib dipilih').transform(val => parseInt(val, 10))
  ]),
  counter_id: z.union([
    z.number().optional().nullable(),
    z.string().optional().nullable().transform(val => val ? parseInt(val, 10) : null)
  ]),
});

export const userUpdateRoleSchema = z.object({
  role_id: z.union([
    z.number().min(1, 'Role wajib dipilih'),
    z.string().min(1, 'Role wajib dipilih').transform(val => parseInt(val, 10))
  ]),
});

export const userAssignCounterSchema = z.object({
  counter_id: z.union([
    z.number().min(1, 'Loket wajib dipilih'),
    z.string().min(1, 'Loket wajib dipilih').transform(val => parseInt(val, 10))
  ]),
});

export const userSearchSchema = z.object({
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  archived: z.number().min(0).max(1).optional().default(0),
  page: z.number().min(1).optional().default(1),
});