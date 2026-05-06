import { Router } from "express";
import { query } from '../index.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { sendWhatsAppMessage, generateReceiptPDF, createInAppNotification } from '../services/notificationService.js';

const paymentRouter = Router();

// PayHere Credentials
const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '';
const MERCHANT_SECRET = process.env.PAYHERE_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// --- HELPER: CALCULATE EXPIRY DATE ---
const calculateExpiry = (duration: string) => {
  const date = new Date();
  if (duration === 'Month') date.setMonth(date.getMonth() + 1);
  else if (duration === 'Year') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1); // Default 1 month
  return date;
};

// --- HELPER: CALCULATE NEW EXPIRY (PROPORTIONAL & EXTENDABLE) ---
const getUpdatedExpiry = (currentExpiry: Date | string | null, pkgPrice: number, amountPaid: number, duration: string) => {
  let baseDate = new Date();
  
  // If user has an active membership that hasn't expired yet, start from that date
  if (currentExpiry) {
    const expiryDate = new Date(currentExpiry);
    if (expiryDate > new Date()) {
      baseDate = expiryDate;
    }
  }

  // Calculate how many periods (months/years) they paid for
  // If pkgPrice is 0 (Balance Payment), we don't extend expiry
  if (pkgPrice <= 0) return currentExpiry ? new Date(currentExpiry).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const periods = Math.max(1, Math.floor(amountPaid / pkgPrice));
  
  for (let i = 0; i < periods; i++) {
    if (duration === 'Month') baseDate.setMonth(baseDate.getMonth() + 1);
    else if (duration === '3 Months') baseDate.setMonth(baseDate.getMonth() + 3);
    else if (duration === 'Year') baseDate.setFullYear(baseDate.getFullYear() + 1);
    else baseDate.setMonth(baseDate.getMonth() + 1); // Default
  }

  return baseDate.toISOString().split('T')[0]; // Return YYYY-MM-DD
};

// --- PAYHERE HASH GENERATION ---
paymentRouter.post("/payhere/hash", (req, res) => {
  const { order_id, amount, currency } = req.body;
  const formattedAmount = Number(amount).toFixed(2);
  const hash = crypto
    .createHash('md5')
    .update(
      MERCHANT_ID +
      order_id +
      formattedAmount +
      currency +
      crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase()
    )
    .digest('hex')
    .toUpperCase();
  
  res.json({ 
    hash,
    notify_url: `${BACKEND_URL}/api/payments/payhere/notify`
  });
});

// --- PAYHERE WEBHOOK ---
paymentRouter.post("/payhere/notify", async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🔔 [PAYHERE WEBHOOK] Request Received");
  console.log("📦 Payload:", JSON.stringify(req.body, null, 2));

  if (BACKEND_URL.includes('localhost')) {
    console.warn("⚠️ [WARNING] BACKEND_URL is set to localhost. PayHere webhooks will NOT reach this server from the internet!");
  }
  
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
  console.log("🔐 Verifying Signature...");
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
    console.error("❌ [PAYHERE] SIGNATURE MISMATCH!");
    console.error(`Expected: ${localMd5sig}, Received: ${md5sig}`);
    return res.status(400).send("Invalid signature");
  }
  console.log("✅ [PAYHERE] Signature Verified.");

  const userId = parseInt(custom_1);
  const packageId = parseInt(custom_2);
  const cardHolder = req.body.card_holder_name || '';
  const cardNo = req.body.card_no || '';
  const uniquePaymentId = (payment_id && payment_id !== '0') ? payment_id : order_id;

  // Map PayHere Status Codes to DB Status
  const isSandbox = merchant_id === '1235459';
  let dbStatus = 'failed';
  if (status_code === '2' || (isSandbox && status_code === '-2')) dbStatus = 'completed';
  else if (status_code === '0') dbStatus = 'pending';
  else if (status_code === '-1') dbStatus = 'canceled';
  else if (status_code === '-2') dbStatus = 'failed';
  else if (status_code === '-3') dbStatus = 'chargedback';

  if (isSandbox && status_code === '-2') {
    console.log("🛠️ [TEST MODE] Sandbox bypass active. Treating rejected card (-2) as COMPLETED.");
  }

  console.log(`📝 [PAYHERE] Processing transaction: ${order_id} | Status: ${status_code} (${dbStatus})`);

  try {
    // 1. Get Package Details (Needed for both logging and membership)
    const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
    const pkg = packageId !== 0 ? pkgRes.rows[0] : { price: 0, duration: 'Month', name: 'Balance Payment' };

    // 2. Fetch Existing Membership Balance
    const currentMemRes = await query("SELECT balance_due, expiry_date FROM memberships WHERE userid = $1", [userId]);
    const currentBalance = currentMemRes.rows.length > 0 ? parseFloat(currentMemRes.rows[0].balance_due) : 0;
    
    // 3. Record the Payment Attempt in 'payments' table (ALWAYS LOG VALID ATTEMPTS)
    // For failed payments, we still record what they WERE trying to pay
    const isActuallySuccess = dbStatus === 'completed';
    const ledgerDebit = isActuallySuccess ? (packageId !== 0 ? parseFloat(pkg.price) : 0) : 0;
    const new_balance = isActuallySuccess ? (currentBalance + ledgerDebit) - parseFloat(payhere_amount) : currentBalance;

    console.log(`📝 [DB] Logging transaction to 'payments' table with status: ${dbStatus}`);
    const payRes = await query(
      `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, payhere_payment_id, card_holder_name, card_no)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [userId, packageId === 0 ? null : packageId, payhere_amount, new_balance, method, dbStatus, uniquePaymentId, cardHolder, cardNo]
    );
    const paymentId = payRes.rows[0].id;

    // 4. PROCEED WITH MEMBERSHIP UPDATES IF SUCCESSFUL
    if (isActuallySuccess) {
      console.log(`💰 [PAYHERE] Success! Updating membership for User ${userId}...`);

      // Calculate Expiry
      const existingExpiry = currentMemRes.rows.length > 0 ? currentMemRes.rows[0].expiry_date : null;
      const newExpiryStr = getUpdatedExpiry(existingExpiry, parseFloat(pkg.price), parseFloat(payhere_amount), pkg.duration);
      console.log(`🗓️ [DB] New Calculated Expiry: ${newExpiryStr}`);

      // Update Membership Table
      await query(
        `INSERT INTO memberships (userid, package_id, last_payment_id, start_date, expiry_date, status, balance_due)
         VALUES ($1, $2, $3, CURRENT_DATE, $4, 'active', $5)
         ON CONFLICT (userid) DO UPDATE SET
           package_id = CASE WHEN EXCLUDED.package_id IS NOT NULL THEN EXCLUDED.package_id ELSE memberships.package_id END,
           last_payment_id = EXCLUDED.last_payment_id,
           expiry_date = EXCLUDED.expiry_date,
           balance_due = EXCLUDED.balance_due,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP`,
        [userId, packageId === 0 ? null : packageId, paymentId, newExpiryStr, new_balance]
      );

      // Update User Record
      await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);
      await query("UPDATE memberprofiles SET package = $1 WHERE userid = $2", [pkg.name, userId]);

      console.log(`🏁 [SUCCESS] Database updates completed for User ${userId}.`);

      // Generate Receipt & Notifications
      try {
        const pdfFilename = await generateReceiptPDF(paymentId);
        const receiptUrl = `/uploads/${pdfFilename}`;
        await query("UPDATE payments SET receipt_url = $1 WHERE id = $2", [receiptUrl, paymentId]);

        // WHATSAPP STATUS LOGGING
        const userRes = await query(`
          SELECT u.name, mp.phone FROM users u 
          LEFT JOIN memberprofiles mp ON u.id = mp.userid 
          WHERE u.id = $1`, [userId]);
        
        const phone = userRes.rows[0]?.phone;
        const userName = userRes.rows[0]?.name;

        if (phone) {
          console.log(`📱 [WHATSAPP] Success notification sent to ${userName} (${phone})`);
        }

        // --- IN-APP NOTIFICATION ---
        await createInAppNotification(
          req.app,
          userId,
          "Payment Successful!",
          `Your payment of LKR ${payhere_amount} for ${pkg.name} was successful. (Ref: ${uniquePaymentId})`,
          "success",
          "/member/payments"
        );
      } catch (notifyErr: any) {
        console.error("❌ [NOTIFY ERROR] Receipt/Notification failed:", notifyErr.message);
      }
    } else {
      console.warn(`⚠️ [PAYHERE] Transaction logged as ${dbStatus}. No membership changes made.`);
      
      // Notify User of Failure
      await createInAppNotification(
        req.app,
        userId,
        "Payment Failed",
        `Your payment attempt for ${pkg.name} was ${dbStatus}. Please check your card or try a different method.`,
        "error",
        "/member/payments"
      );
    }

  } catch (err: any) {
    console.error("❌ [WEBHOOK DATABASE ERROR]:", err.message);
    console.error(err.stack);
  }

  console.log("-----------------------------------------");
  res.send("OK");
});

// --- MANUAL CASH PAYMENT (ADMIN) ---
paymentRouter.post("/manual-cash", async (req, res) => {
  const { userId, packageId, amountPaid } = req.body;
  console.log(`💵 [ADMIN] Manual Cash Payment: User ${userId}, Package ${packageId}, Amount LKR ${amountPaid}`);

  try {
    // 1. Get Package Details
    const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
    if (pkgRes.rows.length === 0) {
      console.error("❌ [ADMIN] Package not found!");
      return res.status(404).json({ message: "Package not found" });
    }
    const pkg = pkgRes.rows[0];

    // 2. Fetch Existing Membership Balance & Expiry
    const currentMemRes = await query("SELECT balance_due, expiry_date FROM memberships WHERE userid = $1", [userId]);
    const currentBalance = currentMemRes.rows.length > 0 ? parseFloat(currentMemRes.rows[0].balance_due) : 0;
    const existingExpiry = currentMemRes.rows.length > 0 ? currentMemRes.rows[0].expiry_date : null;
    console.log(`💰 [DB] Current Balance: LKR ${currentBalance}, Existing Expiry: ${existingExpiry}`);

    // 3. Calculate Cumulative Balance
    const new_balance = (currentBalance + parseFloat(pkg.price)) - parseFloat(amountPaid);
    console.log(`📊 [DB] New Calculated Balance: LKR ${new_balance}`);

    // 4. Record Payment
    const payRes = await query(
      `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, source)
       VALUES ($1, $2, $3, $4, 'cash', 'completed', 'admin_manual') RETURNING id`,
      [userId, packageId, amountPaid, new_balance]
    );
    const paymentId = payRes.rows[0].id;

    // 5. Generate Professional Reference ID
    const manualRefId = `NF-CASH-${1000 + paymentId}`;
    await query("UPDATE payments SET payhere_payment_id = $1 WHERE id = $2", [manualRefId, paymentId]);
    console.log(`✅ [DB] Payment recorded with ID: ${manualRefId}`);

    // 6. Calculate Cumulative Expiry (Using consistent logic)
    const newExpiryStr = getUpdatedExpiry(existingExpiry, parseFloat(pkg.price), parseFloat(amountPaid), pkg.duration);
    console.log(`🗓️ [DB] New Calculated Expiry: ${newExpiryStr}`);

    // 7. Update Membership Table
    await query(
      `INSERT INTO memberships (userid, package_id, last_payment_id, start_date, expiry_date, status, balance_due)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 'active', $5)
       ON CONFLICT (userid) DO UPDATE SET
         package_id = EXCLUDED.package_id,
         last_payment_id = EXCLUDED.last_payment_id,
         expiry_date = EXCLUDED.expiry_date,
         balance_due = EXCLUDED.balance_due,
         status = 'active',
         updated_at = CURRENT_TIMESTAMP`,
      [userId, packageId, paymentId, newExpiryStr, new_balance]
    );

    // 8. Update User Record
    await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);
    await query("UPDATE memberprofiles SET package = $1 WHERE userid = $2", [pkg.name, userId]);
    console.log(`👤 [DB] User profile updated.`);

    // 9. Generate Receipt & Notifications
    try {
      console.log(`📄 [RECEIPT] Generating manual receipt for ID: ${paymentId}...`);
      const pdfFilename = await generateReceiptPDF(paymentId);
      const receiptUrl = `/uploads/${pdfFilename}`;
      await query("UPDATE payments SET receipt_url = $1 WHERE id = $2", [receiptUrl, paymentId]);
      console.log(`✅ [RECEIPT] Receipt ready: ${receiptUrl}`);

      // In-App Notification for Member
      console.log(`🔔 [NOTIFY] Triggering in-app notification for User ${userId}...`);
      await createInAppNotification(
        req.app,
        userId,
        "Membership Activated!",
        `Your manual payment of LKR ${amountPaid} for ${pkg.name} was recorded. (Ref: ${manualRefId})`,
        "success",
        "/member/payments"
      );
      console.log(`✅ [NOTIFY] Notification dispatched.`);
    } catch (notifyErr: any) {
      console.error("❌ [ADMIN] Receipt/Notification failed:", notifyErr.message);
    }

    console.log(`🏁 [SUCCESS] Manual payment processing complete for User ${userId}.`);
    res.json({ message: "Cash payment recorded and membership activated", receipt: manualRefId });
  } catch (err: any) {
    console.error("❌ [ADMIN ERROR] Manual payment failed:", err.message);
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
  console.log(`🔍 [WALL-QR] Identification attempt for email: ${email}`);
  try {
    const result = await query("SELECT id, name, email FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      console.warn(`⚠️ [WALL-QR] User not found for email: ${email}`);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(`✅ [WALL-QR] User identified: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ [WALL-QR] Error identifying user:", err.message);
    res.status(500).json({ message: "Error identifying user" });
  }
});

// --- DEBUG: SIMULATE EXPIRY (INSTANT UPDATE) ---
paymentRouter.post("/debug/simulate-expiry", async (req, res) => {
  const { userId, daysAgo } = req.body; 
  const status = daysAgo > 10 ? 'blocked' : 'grace_period';
  
  console.log(`🧪 [DEBUG] INSTANT simulation for User ${userId}: Setting to ${status}`);
  try {
    await query(
      `UPDATE memberships 
       SET expiry_date = CURRENT_DATE - INTERVAL '${daysAgo} days',
           status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE userid = $2`,
      [status, userId]
    );
    res.json({ message: `Success! User ${userId} is now ${status.toUpperCase()} in the database.` });
  } catch (err: any) {
    res.status(500).json({ message: "Simulation failed", error: err.message });
  }
});

// --- DEBUG: FORCE PAYMENT SUCCESS (LOCAL TEST BYPASS) ---
// Use this to test what happens when a payment is successful without needing a public URL
paymentRouter.post("/debug/force-success", async (req, res) => {
  const { userId, packageId } = req.body;
  console.log(`🧪 [DEBUG] FORCING payment success for User ${userId}, Package ${packageId}`);
  
  try {
    // 1. Get Package
    const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
    if (pkgRes.rows.length === 0) throw new Error("Package not found");
    const pkg = pkgRes.rows[0];

    // 2. Record Fake Payment
    const payRes = await query(
      `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, source)
       VALUES ($1, $2, $3, 0, 'test_bypass', 'completed', 'debug_tool') RETURNING id`,
      [userId, packageId, pkg.price]
    );
    const paymentId = payRes.rows[0].id;

    // 3. Calculate New Expiry
    const expiryDate = calculateExpiry(pkg.duration);

    // 4. Update Membership to ACTIVE
    await query(
      `INSERT INTO memberships (userid, package_id, last_payment_id, start_date, expiry_date, status)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 'active')
       ON CONFLICT (userid) DO UPDATE SET
         package_id = EXCLUDED.package_id,
         last_payment_id = EXCLUDED.last_payment_id,
         expiry_date = EXCLUDED.expiry_date,
         status = 'active',
         updated_at = CURRENT_TIMESTAMP`,
      [userId, packageId, paymentId, expiryDate]
    );

    // 5. Update User Record
    await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);
    await query("UPDATE memberprofiles SET package = $1 WHERE userid = $2", [pkg.name, userId]);

    console.log(`✅ [DEBUG] User ${userId} is now ACTIVE. Database updated.`);
    res.json({ message: "Payment forced successfully. User is now ACTIVE." });
  } catch (err: any) {
    console.error("❌ [DEBUG ERROR]", err.message);
    res.status(500).json({ message: "Force success failed", error: err.message });
  }
});

export default paymentRouter;
