import {
  BRASS_API_BASE_URL as baseURL,
  BRASS_API_PATHS as PATH,
} from "../lib/contants";
import axios, { type AxiosInstance, AxiosError } from "axios";
import type { ConfirmAccountError, ConfirmAccountResponse } from "../lib/types";
import type { BrassPayable } from "../tools/processPayment";

export class BrassService {
  private readonly api: AxiosInstance;
  readonly brassToken: string | undefined;

  constructor() {
    this.brassToken = process.env.BRASS_TOKEN;
    this.api = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  async confirmAccount(
    bankCode: string,
    accountNumber: string,
    brassToken?: string
  ) {
    try {
      const options = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${brassToken}`,
        },
      };
      const response = await this.api.get<ConfirmAccountResponse>(
        `${PATH.resolveName}?bank=${bankCode}&account_number=${accountNumber}`,
        options
      );
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      // console.log('Confirmation Error', error);
      if (axios.isAxiosError<ConfirmAccountError>(error)) {
        const errorData = error.response?.data;

        if (errorData?.error.status === 422) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: errorData.error.description,
            },
          };
        }
      }
      // Handle unknown errors
      return {
        success: false,
        error: {
          code: "UKNOWN_ERROR",
          message: "An unexpected error occured",
        },
      };
    }
  }

  async createPayment(payable: BrassPayable, brassToken?: string) {
    try {
      const response = await this.api.post<{ data: object }>(
        PATH.createPayment,
        payable,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${brassToken}`,
          },
        }
      );

      const result = response.data.data;

      if (!result) return { success: false, message: "Error from request" };
      console.log("Payment Success", result);

      // return { success: true, data: result };
      return { success: true, data: {} };
    } catch (error) {
      console.log("Payment Failed");
      if (axios.isAxiosError<object>(error))
        console.log("Error Data", error.response?.data);
      return { success: false, message: "Error from request" };
    }
  }
}
