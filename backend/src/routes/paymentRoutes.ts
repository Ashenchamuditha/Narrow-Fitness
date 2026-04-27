import { Router } from "express";
import { query } from '../index.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { sendWhatsAppMessage, generateReceiptPDF } from '../services/notificationService.js';

const paymentRouter = Router();

// PayHere Credentials
const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '';
const MERCHANT_SECRET = process.env.PAYHERE_SECRET || '';

// --- HELPER: CALCULATE EXPIRY DATE ---
const calculateExpiry = (duration: string) => {
  const date = new Date();
  if (duration === 'Month') date.setMonth(date.getMonth() + 1);
  else if (duration === 'Year') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1); // Default 1 month
  return date;
};

// --- PAYHERE HASH GENERATION ---
paymentRouter.post("/payhere/hash", (req, res) => {
  const { order_id, amount, currency } = req.body;
  const hash = crypto
    .createHash('md5')
    .update(
      MERCHANT_ID +
      order_id +
      amount +
      currency +
      crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase()
    )
    .digest('hex')
    .toUpperCase();
  res.json({ hash });
});

// --- PAYHERE WEBHOOK ---
paymentRouter.post("/payhere/notify", async (req, res) => {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
    custom_1, // userId
    custom_2, // packageId
    payment_id,
    method
  } = req.body;

  // Verify Hash
  const localMd5sig = crypto
    .createHash('md5')
    .update(
      merchant_id +
      order_id +
      payhere_amount +
      payhere_currency +
      status_code +
      crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase()
    )
    .digest('hex')
    .toUpperCase();

  if (localMd5sig !== md5sig) {
    return res.status(400).send("Invalid signature");
  }

  if (status_code === '2') { // Success
    const userId = parseInt(custom_1);
    const packageId = parseInt(custom_2);

    try {
      // 1. Get Package Details
      const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
      if (pkgRes.rows.length === 0) throw new Error("Package not found");
      const pkg = pkgRes.rows[0];

      const balance_due = parseFloat(pkg.price) - parseFloat(payhere_amount);

      // 2. Insert Payment
      const payRes = await query(
        `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, payhere_payment_id)
         VALUES ($1, $2, $3, $4, $5, 'completed', $6) RETURNING id`,
        [userId, packageId, payhere_amount, balance_due, method, payment_id]
      );
      const paymentId = payRes.rows[0].id;

      // 3. Update Membership
      const expiry = calculateExpiry(pkg.duration);
      await query(
        `INSERT INTO memberships (userid, package_id, last_payment_id, start_date, expiry_date, status)
         VALUES ($1, $2, $3, CURRENT_DATE, $4, 'active')
         ON CONFLICT (userid) DO UPDATE SET
           package_id = EXCLUDED.package_id,
           last_payment_id = EXCLUDED.last_payment_id,
           expiry_date = EXCLUDED.expiry_date,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP`,
        [userId, packageId, paymentId, expiry]
      );

      // 4. Update User's package_id
      await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);

      // 5. Generate Receipt & Send WhatsApp
      const pdfLink = await generateReceiptPDF(paymentId);
      const userRes = await query("SELECT email, name FROM users WHERE id = $1", [userId]);
      // Assuming phone number is stored somewhere, if not we use a placeholder or need to add it to schema
      // For now, let's assume we might have it or just log it
      await sendWhatsAppMessage("REPLACE_WITH_USER_PHONE", `Hi ${userRes.rows[0].name}, your payment of LKR ${payhere_amount} was successful. Download receipt: http://localhost:5000/uploads/${pdfLink}`);

    } catch (err) {
      console.error("Webhook Error:", err);
    }
  }

  res.send("OK");
});

// --- MANUAL CASH PAYMENT (ADMIN) ---
paymentRouter.post("/manual-cash", async (req, res) => {
  const { userId, packageId, amountPaid } = req.body;

  try {
    const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
    if (pkgRes.rows.length === 0) return res.status(404).json({ message: "Package not found" });
    const pkg = pkgRes.rows[0];

    const balance_due = parseFloat(pkg.price) - parseFloat(amountPaid);

    const payRes = await query(
      `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, source)
       VALUES ($1, $2, $3, $4, 'cash', 'completed', 'admin_manual') RETURNING id`,
      [userId, packageId, amountPaid, balance_due]
    );
    const paymentId = payRes.rows[0].id;

    const expiry = calculateExpiry(pkg.duration);
    await query(
      `INSERT INTO memberships (userid, package_id, last_payment_id, start_date, expiry_date, status)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 'active')
       ON CONFLICT (userid) DO UPDATE SET
         package_id = EXCLUDED.package_id,
         last_payment_id = EXCLUDED.last_payment_id,
         expiry_date = EXCLUDED.expiry_date,
         status = 'active',
         updated_at = CURRENT_TIMESTAMP`,
      [userId, packageId, paymentId, expiry]
    );

    await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);

    const pdfLink = await generateReceiptPDF(paymentId);
    // await sendWhatsAppMessage(...)

    res.json({ message: "Cash payment recorded and membership activated", receipt: pdfLink });
  } catch (err: any) {
    res.status(500).json({ message: "Error recording cash payment", error: err.message });
  }
});

// --- RECEIPT DOWNLOAD ---
paymentRouter.get("/receipt/:id", async (req, res) => {
  try {
    const filename = `receipt_${req.params.id}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', filename);

    // Regenerate if not exists
    if (!fs.existsSync(filePath)) {
       await generateReceiptPDF(parseInt(req.params.id));
    }

    res.sendFile(filePath);
  } catch (err: any) {
    res.status(404).send("Receipt not found");
  }
});

// --- WALL QR IDENTIFICATION ---
paymentRouter.post("/wall-qr/identify", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query("SELECT id, name, email FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Error identifying user" });
  }
});

export default paymentRouter;
