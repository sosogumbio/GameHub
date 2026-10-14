import type { Request, Response } from "express";
import { createProductSchema } from "../dto/CreateProductDTO";
import { ProductService } from "../../infra/services/ProductService";

export class ProductController {
  constructor(private readonly service = new ProductService()) {}

  list = async (request: Request, response: Response) => {
    let ids: number[] | undefined;
    if (request.query.ids !== undefined) {
      const rawIds = request.query.ids;
      if (typeof rawIds !== "string" || !/^\d+(,\d+)*$/.test(rawIds)) {
        response.status(400).json({ message: "A lista de IDs dos produtos é inválida." });
        return;
      }
      ids = rawIds.split(",").map(Number);
      if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        response.status(400).json({ message: "A lista de IDs dos produtos é inválida." });
        return;
      }
    }

    const result = await this.service.list({
      search: String(request.query.search ?? ""),
      category: String(request.query.category ?? ""),
      sort: String(request.query.sort ?? "name"),
      page: Number(request.query.page ?? 1),
      pageSize: Number(request.query.pageSize ?? 24),
      ids
    });
    response.json(result);
  };

  categories = async (_request: Request, response: Response) => {
    response.json(await this.service.categories());
  };

  create = async (request: Request, response: Response) => {
    const parsed = createProductSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        message: "Dados inválidos.",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const product = await this.service.create(parsed.data);
    response.status(201).json(product);
  };

  remove = async (request: Request, response: Response) => {
    await this.service.remove(Number(request.params.id));
    response.json({ message: "Produto excluído com sucesso." });
  };

  dashboard = async (_request: Request, response: Response) => {
    response.json(await this.service.dashboard());
  };
}
