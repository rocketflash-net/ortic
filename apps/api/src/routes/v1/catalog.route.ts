import { Router } from "express";
import * as catalog from "@controllers/catalog.controller";

// Katalog publik (toko ortic.id), tanpa login.
const router = Router();

router.get("/categories", catalog.categories);
router.get("/products", catalog.products);
router.get("/products/:slug", catalog.product);
router.get("/store", catalog.storeInfo);

export default router;
