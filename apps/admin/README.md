# Ortic Admin

Dashboard admin (admin.ortic.id): gudang, pelanggan, admin; berikutnya produk, stok, pesanan.

Vue 3 + Vite + Nuxt UI v4 + Tailwind CSS v4 + Pinia + TanStack Query. Fitur ada di `src/features/<fitur>/` (routes, navigation, services/api, views, languages). Buat fitur baru: `npm run create-feature <nama>`.

```bash
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:4000/api/v1
npm run dev            # http://localhost:5700
```
