export interface PayHereParams {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
}

export const generatePayHereHash = (
  merchantId: string,
  orderId: string,
  amount: number,
  currency: string,
  merchantSecret: string
) => {
  // This should ideally be done on the server to keep the secret hidden
  // But for this demo, we'll show how it's calculated
  // Hash = UpperCase(Md5(MerchantID + OrderID + Amount + Currency + UpperCase(Md5(MerchantSecret))))
  
  // Note: We'd need an MD5 library here. For now, this is a placeholder.
  return "GENERATED_HASH";
};

export const initiatePayHerePayment = (params: PayHereParams) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://sandbox.payhere.lk/pay/checkout'; // Use sandbox for testing

  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value.toString();
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};
