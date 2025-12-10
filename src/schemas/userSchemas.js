import { z } from "zod";

// Schema untuk membuat user baru
export const userCreateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role_id: z.string().min(1, "Role harus dipilih"),
});

// Schema untuk update user (versi lengkap)
export const userUpdateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
  role_id: z.string().min(1, "Role harus dipilih").optional(),
});

// Schema khusus untuk edit profile user (lebih fleksibel)
export const userProfileUpdateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
}).refine(
  (data) => {
    // Minimal ada satu field yang diisi (selain password jika kosong)
    const hasName = data.name && data.name.trim() !== '';
    const hasEmail = data.email && data.email.trim() !== '';
    const hasPassword = data.password && data.password.trim() !== '';
    
    return hasName || hasEmail || hasPassword;
  },
  {
    message: "Minimal satu field harus diisi",
    path: ["form"]
  }
);

// Schema sederhana untuk update (tanpa validasi minimal satu field)
export const simpleUserUpdateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
});

export const userUpdateRoleSchema = z.object({
  role_id: z.union([
    z.number().min(1, "Role wajib dipilih"),
    z
      .string()
      .min(1, "Role wajib dipilih")
      .transform((val) => parseInt(val, 10)),
  ]),
});

// Update schema untuk multiple counters
export const userAssignCounterSchema = z.object({
  counter_ids: z.array(
    z.union([
      z.number().min(1, "Loket wajib dipilih"),
      z
        .string()
        .min(1, "Loket wajib dipilih")
        .transform((val) => parseInt(val, 10)),
    ])
  ).min(1, "Pilih minimal satu loket"),
});

export const userUnassignCounterSchema = z.object({
  counter_id: z.union([
    z.number().min(1, "Loket wajib dipilih"),
    z
      .string()
      .min(1, "Loket wajib dipilih")
      .transform((val) => parseInt(val, 10)),
  ]),
});

export const userSearchSchema = z.object({
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  archived: z.number().min(0).max(1).optional().default(0),
  page: z.number().min(1).optional().default(1),
});

export const counterCreateSchema = z.object({
  name: z.string().min(2, "Nama loket minimal 2 karakter"),
  code: z.string().min(1, "Kode loket wajib diisi"),
  prefix: z.string().optional(),
  quota: z.number().min(1, "Kuota minimal 1").optional(),
  description: z.string().optional(),
});

export const counterUpdateSchema = z.object({
  name: z.string().min(2, "Nama loket minimal 2 karakter").optional(),
  code: z.string().min(1, "Kode loket wajib diisi").optional(),
  prefix: z.string().optional(),
  quota: z.number().min(1, "Kuota minimal 1").optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2, "Nama role minimal 2 karakter"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});