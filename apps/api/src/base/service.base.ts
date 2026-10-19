import { StatusCodes } from "http-status-codes";
import ResponseDto from "@dto/response.dto";
import ResponseType from "@@types/response.type";

/**
 * Base class untuk semua service.
 * Menyediakan helper pembentuk response supaya format response konsisten.
 * Response DTO selalu dibuat baru per pemanggilan (tidak disimpan di instance) agar aman dipakai bersamaan oleh banyak request.
 */
export default abstract class Service {
  protected success<TData>(data: TData, message: string = "Success", status: number = StatusCodes.OK, additionalInfo: unknown = null): ResponseType {
    const response = new ResponseDto<TData>().setResponseMessage(message).setData(data).setAdditionalInfo(additionalInfo);
    return { status, data: response.toArray() };
  }

  protected created<TData>(data: TData, message: string = "Created"): ResponseType {
    return this.success(data, message, StatusCodes.CREATED);
  }
}
