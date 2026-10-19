import Service from "@base/service.base";
import UserAddressDto from "@dto/user-address.dto";
import NotFoundException from "@exceptions/not-found.exception";
import ValidationException from "@exceptions/validation.exception";
import UserAddressRepository from "@repositories/user-address.repository";
import ResponseType from "@@types/response.type";
import { SaveAddressInputType } from "@validators/address.validator";

const MAX_ADDRESSES = 20;

// Buku alamat pembeli. Alamat pertama otomatis jadi alamat utama.
export default class UserAddressService extends Service {
  constructor(private readonly addressRepository: UserAddressRepository = new UserAddressRepository()) {
    super();
  }

  async list(userId: number): Promise<ResponseType> {
    return this.success(UserAddressDto.collection(await this.addressRepository.findByUser(userId)));
  }

  async store(userId: number, input: SaveAddressInputType): Promise<ResponseType> {
    const id = await this.addressRepository.transaction(async (tx) => {
      const repository = this.addressRepository.withTransaction(tx);
      const existing = await repository.findByUser(userId);
      if (existing.length >= MAX_ADDRESSES) throw new ValidationException([{ field: "address", message: `At most ${MAX_ADDRESSES} addresses` }]);

      const isDefault = input.is_default || existing.length === 0;
      const id = await repository.store({ userId, ...this.toColumns(input), isDefault });
      if (isDefault) await repository.clearDefault(userId, id);
      return id;
    });
    return this.created(UserAddressDto.fromEntity((await this.addressRepository.findOwned(userId, id))!), "Address saved");
  }

  async update(userId: number, id: number, input: SaveAddressInputType): Promise<ResponseType> {
    await this.addressRepository.transaction(async (tx) => {
      const repository = this.addressRepository.withTransaction(tx);
      const address = await repository.findOwned(userId, id);
      if (!address) throw new NotFoundException("Address not found");

      // Alamat utama tidak bisa "dilepas" tanpa memilih alamat lain sebagai utama.
      const isDefault = input.is_default || address.isDefault;
      await repository.update(id, { ...this.toColumns(input), isDefault });
      if (isDefault) await repository.clearDefault(userId, id);
    });
    return this.success(UserAddressDto.fromEntity((await this.addressRepository.findOwned(userId, id))!), "Address saved");
  }

  async destroy(userId: number, id: number): Promise<ResponseType> {
    await this.addressRepository.transaction(async (tx) => {
      const repository = this.addressRepository.withTransaction(tx);
      const address = await repository.findOwned(userId, id);
      if (!address) throw new NotFoundException("Address not found");
      await repository.destroy(id);

      // Pindahkan status utama ke alamat terbaru yang tersisa.
      if (address.isDefault) {
        const [next] = await repository.findByUser(userId);
        if (next) await repository.update(next.id, { isDefault: true });
      }
    });
    return this.success(null, "Address deleted");
  }

  private toColumns(input: SaveAddressInputType) {
    return {
      label: input.label,
      recipientName: input.recipient_name,
      phone: input.phone,
      address: input.address,
      province: input.province,
      city: input.city,
      district: input.district,
      postalCode: input.postal_code,
      biteshipAreaId: input.biteship_area_id,
      notes: input.notes,
    };
  }
}
