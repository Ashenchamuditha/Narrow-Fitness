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
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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

  // SANDBOX BYPASS
  const isSandbox = merchant_id === '1235459'; 
  const isSuccess = status_code === '2' || (isSandbox && status_code === '-2');

  if (isSuccess) { 
    if (status_code === '-2') {
      console.log("🛠️ [TEST MODE] Sandbox bypass active. Processing rejected card as success...");
    }
    console.log(`💰 [PAYHERE] Payment Success. User: ${custom_1}, Package: ${custom_2}, Amount: ${payhere_amount}`);
    const userId = parseInt(custom_1);
    const packageId = parseInt(custom_2);
    const cardHolder = req.body.card_holder_name || '';
    const cardNo = req.body.card_no || '';

    try {
      // 1. Get Package Details
      console.log(`🔍 [DB] Fetching package details for ID: ${packageId}...`);
      const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
      if (pkgRes.rows.length === 0) {
        console.error("❌ [DB] Package not found in 'pricing' table!");
        throw new Error("Package not found");
      }
      const pkg = pkgRes.rows[0];
      console.log(`📦 [DB] Package identified: ${pkg.name} (${pkg.duration})`);

      // 2. Fetch Existing Membership Balance
      const currentMemRes = await query("SELECT balance_due FROM memberships WHERE userid = $1", [userId]);
      const currentBalance = currentMemRes.rows.length > 0 ? parseFloat(currentMemRes.rows[0].balance_due) : 0;
      console.log(`💰 [DB] Current User Balance: LKR ${currentBalance}`);

      // 3. Calculate Cumulative Balance
      // Logic: (What you owed before + New Package Price) - What you just paid
      const new_balance = (currentBalance + parseFloat(pkg.price)) - parseFloat(payhere_amount);
      console.log(`📊 [DB] New Calculated Balance: LKR ${new_balance}`);

      // 4. Insert Payment Record
      console.log(`📝 [DB] Recording payment in 'payments' table...`);
      const uniquePaymentId = (payment_id && payment_id !== '0') ? payment_id : order_id;
      
      const payRes = await query(
        `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, payhere_payment_id, card_holder_name, card_no)
         VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8) RETURNING id`,
        [userId, packageId, payhere_amount, new_balance, method, uniquePaymentId, cardHolder, cardNo]
      );
      const paymentId = payRes.rows[0].id;
      console.log(`✅ [DB] Payment recorded successfully. Internal ID: ${paymentId}`);

      // 5. Calculate Expiry
      console.log(`📅 [DB] Calculating membership duration and expiry...`);
      let expiryDate = calculateExpiry(pkg.duration);
      if (currentMemRes.rows.length > 0) {
        const currentExpiry = new Date(currentMemRes.rows[0].expiry_date);
        if (currentExpiry > new Date()) {
          console.log("⏳ [DB] User has an active membership. Extending from current expiry...");
          const date = new Date(currentExpiry);
          if (pkg.duration === 'Month') date.setMonth(date.getMonth() + 1);
          else if (pkg.duration === 'Year') date.setFullYear(date.getFullYear() + 1);
          else date.setMonth(date.getMonth() + 1);
          expiryDate = date;
        }
      }

      // 6. Update Membership Table (Cumulative)
      console.log(`🔄 [DB] Updating 'memberships' table for User: ${userId}...`);
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
        [userId, packageId, paymentId, expiryDate, new_balance]
      );
      console.log(`✅ [DB] Membership table updated to ACTIVE with Cumulative Balance.`);

      // 5. Update User Record
      console.log(`👤 [DB] Updating user profile and package associations...`);
      await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);
      await query("UPDATE memberprofiles SET package = $1 WHERE userid = $2", [pkg.name, userId]);

      console.log(`🏁 [SUCCESS] All database updates completed for User ${userId}.`);

      // 6. Generate Receipt & WhatsApp Status
      console.log(`📄 [RECEIPT] Generating receipt for Payment ${paymentId}...`);
      try {
        const pdfFilename = await generateReceiptPDF(paymentId);
        const receiptUrl = `/uploads/${pdfFilename}`;
        await query("UPDATE payments SET receipt_url = $1 WHERE id = $2", [receiptUrl, paymentId]);
        console.log(`✅ [RECEIPT] Receipt available at: ${receiptUrl}`);

        // WHATSAPP STATUS LOGGING
        const userRes = await query(`
          SELECT u.name, mp.phone FROM users u 
          LEFT JOIN memberprofiles mp ON u.id = mp.userid 
          WHERE u.id = $1`, [userId]);
        
        const phone = userRes.rows[0]?.phone;
        const userName = userRes.rows[0]?.name;

        if (phone) {
          console.log(`📱 [WHATSAPP STATUS] Recipient: ${userName} (${phone})`);
          console.log(`   📝 Message: Your payment of LKR ${payhere_amount} was successful.`);
          console.log(`   ⏳ Status: PAUSED (Credits preserved).`);
        } else {
          console.warn(`⚠️ [WHATSAPP STATUS] Skipped: No phone number found for ${userName}.`);
        }

        // --- NEW: IN-APP NOTIFICATION ---
        console.log(`🔔 [NOTIFY] Triggering in-app notification for User ${userId}...`);
        await createInAppNotification(
          req.app,
          userId,
          "Elite Access Active!",
          `Your payment of LKR ${payhere_amount} for ${pkg.name} was successful. Syncing profile...`,
          "success",
          "/member/payments"
        );
        console.log(`✅ [NOTIFY] Notification dispatched.`);
      } catch (notifyErr: any) {
        console.error("❌ [NOTIFY ERROR] Receipt/Notification failed:", notifyErr.message);
      }

    } catch (err: any) {
      console.error("❌ [WEBHOOK DATABASE ERROR]:", err.message);
      console.error(err.stack);
    }
  } else {
    console.warn(`⚠️ [PAYHERE] Transaction Not Successful. Status: ${status_code}, Order: ${order_id}`);
  }

  console.log("-----------------------------------------");
  res.send("OK");
});

// --- MANUAL CASH PAYMENT (ADMIN) ---
paymentRouter.post("/manual-cash", async (req, res) => {
  const { userId, packageId, amountPaid } = req.body;

  try {
    const pkgRes = await query("SELECT * FROM pricing WHERE id = $1", [packageId]);
    if (pkgRes.rows.length === 0) return res.status(404).json({ message: "Package not found" });
    const pkg = pkgRes.rows[0];

    // Fetch existing balance
    const currentMemRes = await query("SELECT balance_due FROM memberships WHERE userid = $1", [userId]);
    const currentBalance = currentMemRes.rows.length > 0 ? parseFloat(currentMemRes.rows[0].balance_due) : 0;

    // Calculate new cumulative balance
    const new_balance = (currentBalance + parseFloat(pkg.price)) - parseFloat(amountPaid);

    const payRes = await query(
      `INSERT INTO payments (userid, package_id, amount_paid, balance_due, payment_method, status, source)
       VALUES ($1, $2, $3, $4, 'cash', 'completed', 'admin_manual') RETURNING id`,
      [userId, packageId, amountPaid, new_balance]
    );
    const paymentId = payRes.rows[0].id;

    // Generate a professional reference ID for the manual payment
    const manualRefId = `NF-CASH-${1000 + paymentId}`;
    await query("UPDATE payments SET payhere_payment_id = $1 WHERE id = $2", [manualRefId, paymentId]);

    const expiry = calculateExpiry(pkg.duration);
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
      [userId, packageId, paymentId, expiry, new_balance]
    );

    await query("UPDATE users SET package_id = $1 WHERE id = $2", [packageId, userId]);

    const pdfFilename = await generateReceiptPDF(paymentId);
    const receiptUrl = `/uploads/${pdfFilename}`;
    await query("UPDATE payments SET receipt_url = $1 WHERE id = $2", [receiptUrl, paymentId]);

    res.json({ message: "Cash payment recorded and membership activated", receipt: receiptUrl });
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
