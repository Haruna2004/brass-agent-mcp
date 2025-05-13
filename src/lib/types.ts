export interface ConfirmAccountResponse {
  data: {
    account_name: string;
    account_number: string;
    bank: {
      data: {
        id: string;
        code: string;
        name: string;
        type: string;
      };
    };
  };
}

export interface ConfirmAccountError {
  error: {
    status: number;
    title: string;
    description: string;
    source: object;
  };
}
