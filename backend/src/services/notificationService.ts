import axios from 'axios';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../index.js';

const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY || '';
const NOTIFY_USER_ID = process.env.NOTIFY_USER_ID || '';
const NOTIFY_SENDER_ID = process.env.NOTIFY_SENDER_ID || 'NotifyDEMO';

/**
 * Creates an in-app notification and optionally emits a socket event
 */
export const createInAppNotification = async (app: any, userId: number, title: string, message: string, type: string = 'info') => {
  try {
    const result = await query(
      `INSERT INTO notifications (userid, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, title, message, type]
    );
    
    const notification = result.rows[0];
    const io = app.get("socketio");
    if (io) {
      io.emit(`notification_${userId}`, notification);
      io.emit('new_global_notification', notification); // For admin or global updates
    }
    
    return notification;
  } catch (err: any) {
    console.error("❌ [NOTIFICATION SERVICE] Error:", err.message);
  }
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
  // Format number: Remove leading 0 and prepend 94 (Sri Lanka code)
  let formattedNumber = to.replace(/[^0-9]/g, ''); 
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '94' + formattedNumber.substring(1);
  } else if (!formattedNumber.startsWith('94') && formattedNumber.length === 9) {
    formattedNumber = '94' + formattedNumber;
  }

  console.log(`🚀 [NOTIFICATION] Target: ${formattedNumber}`);
  
  if (!NOTIFY_API_KEY || !NOTIFY_USER_ID) {
    console.warn("⚠️ [NOTIFICATION] Credentials missing. WhatsApp skipped.");
    return;
  }

  try {
    // Attempting Notify.lk send (Defaulting to SMS)
    const response = await axios.post('https://app.notify.lk/api/v1/send', {
      user_id: NOTIFY_USER_ID,
      api_key: NOTIFY_API_KEY,
      sender_id: NOTIFY_SENDER_ID,
      to: formattedNumber,
      message: message
    });
    
    console.log(`✅ [NOTIFICATION] Dispatch Successful.`);
    console.log(`🔗 [DEBUG] WhatsApp Link: https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`);

  } catch (error: any) {
    console.error("❌ [NOTIFICATION] API Error:", error.response?.data || error.message);
  }
};

export const generateReceiptPDF = async (paymentId: number) => {
  console.log(`🔨 [PDF] Starting generation for Payment ID: ${paymentId}`);
  const paymentRes = await query(`
    SELECT p.*, u.name as user_name, u.email as user_email, pr.name as package_name, pr.duration as package_duration
    FROM payments p
    JOIN users u ON p.userid = u.id
    JOIN pricing pr ON p.package_id = pr.id
    WHERE p.id = $1
  `, [paymentId]);

  if (paymentRes.rows.length === 0) {
    console.error(`❌ [PDF] Payment record ${paymentId} not found in DB!`);
    throw new Error("Payment not found");
  }
  const payment = paymentRes.rows[0];

  const doc = new PDFDocument({ margin: 50 });
  const filename = `receipt_${paymentId}.pdf`;
  const filePath = path.join(process.cwd(), 'uploads', filename);
  const logoPath = path.join(process.cwd(), 'uploads', 'logo.jpeg');

  if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
    fs.mkdirSync(path.join(process.cwd(), 'uploads'));
  }

  return new Promise<string>((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 60 });
    }
    
    doc.fillColor('#000000')
       .fontSize(20)
       .text('NARROW FITNESS', 120, 50, { align: 'right' })
       .fontSize(10)
       .text('Elite Performance & Training Hub', 120, 75, { align: 'right' })
       .text('Colombo, Sri Lanka | +94 77 123 4567', 120, 90, { align: 'right' });

    doc.moveDown(2);
    doc.rect(50, 120, 500, 2).fill('#f97316'); // Orange line

    // Receipt Info
    const paymentDate = new Date(payment.created_at);
    doc.moveDown(3);
    doc.fillColor('#444444')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`RECEIPT NO: #NF-PAY-${payment.id}`)
       .font('Helvetica')
       .text(`DATE: ${paymentDate.toLocaleDateString().toUpperCase()}`)
       .text(`TIME: ${paymentDate.toLocaleTimeString().toUpperCase()}`)
       .moveDown();

    // Bill To
    doc.fontSize(10).text('BILL TO:');
    doc.fontSize(14).fillColor('#000000').font('Helvetica-Bold').text(payment.user_name.toUpperCase());
    doc.fontSize(10).fillColor('#444444').font('Helvetica').text(payment.user_email);
    doc.moveDown(2);

    // Table Header
    const tableTop = 280;
    doc.rect(50, tableTop, 500, 25).fill('#f3f4f6');
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('DESCRIPTION', 60, tableTop + 8)
       .text('DURATION', 250, tableTop + 8)
       .text('STATUS', 380, tableTop + 8)
       .text('AMOUNT', 480, tableTop + 8, { align: 'right' });

    // Table Content
    const rowTop = tableTop + 35;
    doc.fontSize(11)
       .font('Helvetica')
       .text(`${payment.package_name} Membership Plan`, 60, rowTop)
       .text(payment.package_duration, 250, rowTop)
       .text(payment.status.toUpperCase(), 380, rowTop);
    
    doc.fontSize(12).font('Helvetica-Bold').text(`LKR ${parseFloat(payment.amount_paid).toLocaleString()}`, 480, rowTop, { align: 'right' });

    // Summary
    doc.moveDown(4);
    const summaryTop = doc.y;
    doc.rect(300, summaryTop, 250, 100).stroke('#eeeeee');
    
    doc.font('Helvetica').fontSize(10).fillColor('#444444').text('TOTAL PAID:', 320, summaryTop + 20);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000').text(`LKR ${parseFloat(payment.amount_paid).toLocaleString()}`, 450, summaryTop + 18, { align: 'right' });

    doc.font('Helvetica').fontSize(10).fillColor('#f97316').text('BALANCE DUE:', 320, summaryTop + 50);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#f97316').text(`LKR ${parseFloat(payment.balance_due).toLocaleString()}`, 450, summaryTop + 48, { align: 'right' });

    doc.fontSize(10).fillColor('#444444').text('METHOD:', 320, summaryTop + 75);
    doc.fontSize(10).fillColor('#000000').text(payment.payment_method.toUpperCase(), 450, summaryTop + 75, { align: 'right' });

    // Footer
    doc.moveDown(8);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#aaaaaa').text('Thank you for being part of the Narrow Fitness Elite.', { align: 'center' });
    doc.font('Helvetica').text('Valid for membership access. Non-refundable.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
};
