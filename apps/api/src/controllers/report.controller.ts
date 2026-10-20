import { Request, Response } from "express";
import ReportService from "@services/report.service";
import { getAuthUser } from "@utils/request.util";
import { reportQuerySchema } from "@validators/report.validator";

const service = new ReportService();

// GET /admin/dashboard -> ringkasan beranda dashboard.
const dashboard = async (req: Request, res: Response) => {
  const result = await service.dashboard(getAuthUser(req));
  res.status(result.status).json(result.data);
};

// GET /admin/reports/sales?date_from=&date_to=&warehouse_id=
const sales = async (req: Request, res: Response) => {
  const result = await service.sales(reportQuerySchema.parse(req.query), getAuthUser(req));
  res.status(result.status).json(result.data);
};

// GET /admin/reports/stock
const stock = async (req: Request, res: Response) => {
  const result = await service.stock(getAuthUser(req));
  res.status(result.status).json(result.data);
};

// GET /admin/reports/orders.csv?date_from=&date_to=&warehouse_id=
const exportOrders = async (req: Request, res: Response) => {
  const query = reportQuerySchema.parse(req.query);
  const csv = await service.exportCsv(query, getAuthUser(req));
  res
    .status(200)
    .set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pesanan-ortic-${query.date_from}-${query.date_to}.csv"` })
    .send(csv);
};

export { dashboard, sales, stock, exportOrders };
