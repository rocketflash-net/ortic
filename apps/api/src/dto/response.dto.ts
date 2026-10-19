import ResponseCodeEnum from "@enums/response-code.enum";

export default class ResponseDto<TData = unknown> {
  responseCode: string;
  responseMessage: string;
  data: TData | null;
  additionalInfo: unknown;

  constructor() {
    this.responseCode = ResponseCodeEnum.success;
    this.responseMessage = "Success";
    this.data = null;
    this.additionalInfo = null;
  }

  setResponseCode(value: string) {
    this.responseCode = value;
    return this;
  }

  getResponseCode() {
    return this.responseCode;
  }

  setResponseMessage(value: string) {
    this.responseMessage = value;
    return this;
  }

  getResponseMessage() {
    return this.responseMessage;
  }

  setData(value: TData | null) {
    this.data = value;
    return this;
  }

  getData() {
    return this.data;
  }

  setAdditionalInfo(value: unknown) {
    this.additionalInfo = value;
    return this;
  }

  getAdditionalInfo() {
    return this.additionalInfo;
  }

  toArray(): object {
    return {
      responseCode: this.getResponseCode(),
      responseMessage: this.getResponseMessage(),
      data: this.getData(),
      additionalInfo: this.getAdditionalInfo(),
    };
  }
}
