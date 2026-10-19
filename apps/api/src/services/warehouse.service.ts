import Service from "@base/service.base";
import WarehouseDto from "@dto/warehouse.dto";
import { AuditActionEnum } from "@enums/audit.enum";
import ConflictException from "@exceptions/conflict.exception";
import NotFoundException from "@exceptions/not-found.exception";
import WarehouseRepository from "@repositories/warehouse.repository";
import AuditLogService from "@services/audit-log.service";
import { AuditActorType } from "@@types/audit.type";
import { NewWarehouseType } from "@@types/entity.type";
import ResponseType from "@@types/response.type";
import { CreateWarehouseInputType, UpdateWarehouseInputType } from "@validators/warehouse.validator";

// Pengaturan gudang (Owner): alamat, titik koordinat, area Biteship, PIC, dan jam pickup.
export default class WarehouseService extends Service {
  constructor(
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly auditLogService: AuditLogService = new AuditLogService()
  ) {
    super();
  }

  async list(): Promise<ResponseType> {
    return this.success(WarehouseDto.collection(await this.warehouseRepository.findAll()));
  }

  async show(id: number): Promise<ResponseType> {
    return this.success(WarehouseDto.fromEntity(await this.findOrFail(id)));
  }

  async store(input: CreateWarehouseInputType, actor: AuditActorType): Promise<ResponseType> {
    const id = await this.warehouseRepository.transaction(async (tx) => {
      const repository = this.warehouseRepository.withTransaction(tx);
      if (await repository.findByCode(input.code)) throw new ConflictException(`Warehouse code ${input.code} is already used`);

      const id = await repository.store(this.toColumns(input) as NewWarehouseType);
      await this.auditLogService.record(tx, actor, { action: AuditActionEnum.warehouse_created, targetType: "warehouse", targetId: id, metadata: { after: input } });
      return id;
    });
    return this.created(WarehouseDto.fromEntity(await this.findOrFail(id)), "Warehouse created");
  }

  async update(id: number, input: UpdateWarehouseInputType, actor: AuditActorType): Promise<ResponseType> {
    await this.warehouseRepository.transaction(async (tx) => {
      const repository = this.warehouseRepository.withTransaction(tx);
      const before = await repository.findById(id);
      if (!before) throw new NotFoundException("Warehouse not found");
      if (input.code && input.code !== before.code && (await repository.findByCode(input.code))) {
        throw new ConflictException(`Warehouse code ${input.code} is already used`);
      }

      await repository.update(id, this.toColumns(input));
      await this.auditLogService.record(tx, actor, { action: AuditActionEnum.warehouse_updated, targetType: "warehouse", targetId: id, metadata: { changes: input } });
    });
    return this.success(WarehouseDto.fromEntity(await this.findOrFail(id)), "Warehouse updated");
  }

  private async findOrFail(id: number) {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundException("Warehouse not found");
    return warehouse;
  }

  // snake_case (request) -> camelCase (kolom). Field yang tidak dikirim tetap undefined supaya tidak ikut di-update.
  private toColumns(input: UpdateWarehouseInputType): Partial<NewWarehouseType> {
    return {
      code: input.code,
      name: input.name,
      address: input.address,
      province: input.province,
      city: input.city,
      district: input.district,
      postalCode: input.postal_code,
      biteshipAreaId: input.biteship_area_id,
      latitude: input.latitude,
      longitude: input.longitude,
      picName: input.pic_name,
      picPhone: input.pic_phone,
      pickupTime: input.pickup_time,
      isActive: input.is_active,
    };
  }
}
