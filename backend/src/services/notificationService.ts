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
export const createInAppNotification = async (app: any, userId: number, title: string, message: string, type: string = 'info', redirectUrl?: string) => {
  try {
    const result = await query(
      `INSERT INTO notifications (userid, title, message, type, redirect_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, title, message, type, redirectUrl || null]
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
  console.log(`🔨 [PDF] Generating Professional Receipt for ID: ${paymentId}`);
  const paymentRes = await query(`
    SELECT 
      p.*, 
      u.name as user_name, 
      u.email as user_email, 
      pr.name as package_name, 
      pr.duration as package_duration,
      mp.phone as user_phone,
      mp.address as user_address
    FROM payments p
    JOIN users u ON p.userid = u.id
    JOIN pricing pr ON p.package_id = pr.id
    LEFT JOIN memberprofiles mp ON u.id = mp.userid
    WHERE p.id = $1
  `, [paymentId]);

  if (paymentRes.rows.length === 0) {
    throw new Error("Payment not found");
  }
  const payment = paymentRes.rows[0];

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const filename = `receipt_${paymentId}.pdf`;
  const filePath = path.join(process.cwd(), 'uploads', filename);
  const logoPath = path.join(process.cwd(), 'uploads', 'logo.jpeg');

  if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
    fs.mkdirSync(path.join(process.cwd(), 'uploads'));
  }

  return new Promise<string>((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // --- COLOR PALETTE ---
    const ORANGE = '#f97316';
    const BLACK = '#000000';
    const GRAY = '#4b5563';
    const LIGHT_GRAY = '#f3f4f6';

    // --- HEADER SECTION ---
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 50 });
    }
    
    doc.fillColor(BLACK)
       .font('Helvetica-Bold')
       .fontSize(22)
       .text('NARROW FITNESS', 120, 50, { align: 'right' })
       .fontSize(9)
       .font('Helvetica')
       .fillColor(GRAY)
       .text('ELITE PERFORMANCE & TRAINING HUB', 120, 75, { align: 'right' })
       .text('30/1, Alwis Place, Colombo 03, Sri Lanka', 120, 88, { align: 'right' })
       .text('Contact: +94 77 123 4567 | narrowfitness.lk', 120, 101, { align: 'right' });

    doc.moveDown(2);
    doc.rect(50, 130, 500, 1.5).fill(LIGHT_GRAY);

    // --- INFO GRID ---
    const gridTop = 160;
    const col2 = 300;

    // LEFT COL: RECEIPT INFO
    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(10).text('TRANSACTION RECEIPT', 50, gridTop);
    const displayId = (payment.payhere_payment_id || `NF-CASH-${payment.id}`).replace('ORDER_', '');
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(`#${displayId}`, 50, gridTop + 15);
    
    doc.fillColor(GRAY).font('Helvetica').fontSize(9).text('DATE:', 50, gridTop + 45);
    doc.fillColor(BLACK).font('Helvetica-Bold').text(new Date(payment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(), 100, gridTop + 45);

    doc.fillColor(GRAY).font('Helvetica').text('METHOD:', 50, gridTop + 60);
    doc.fillColor(BLACK).font('Helvetica-Bold').text(payment.payment_method.toUpperCase(), 100, gridTop + 60);

    // RIGHT COL: BILL TO
    doc.fillColor(GRAY).font('Helvetica-Bold').fontSize(9).text('BILL TO:', col2, gridTop);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(12).text(payment.user_name.toUpperCase(), col2, gridTop + 15);
    doc.fillColor(GRAY).font('Helvetica').fontSize(9)
       .text(payment.user_email, col2, gridTop + 32)
       .text(payment.user_phone || 'PHONE: N/A', col2, gridTop + 45)
       .text(payment.user_address || 'ADDRESS: NOT PROVIDED', col2, gridTop + 58, { width: 250 });

    // --- TABLE SECTION ---
    const tableTop = 270;
    doc.rect(50, tableTop, 500, 30).fill(BLACK);
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('DESCRIPTION', 70, tableTop + 11)
       .text('DURATION', 280, tableTop + 11)
       .text('STATUS', 380, tableTop + 11)
       .text('TOTAL (LKR)', 480, tableTop + 11, { align: 'right' });

    // TABLE ROW
    const rowTop = tableTop + 50;
    doc.fillColor(BLACK).font('Helvetica').fontSize(10)
       .text(`${payment.package_name} Membership Plan`, 70, rowTop)
       .text(payment.package_duration, 280, rowTop)
       .text(payment.status.toUpperCase(), 380, rowTop);
    
    doc.font('Helvetica-Bold').fontSize(11).text(parseFloat(payment.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 }), 480, rowTop, { align: 'right' });

    // SEPARATOR
    doc.rect(50, rowTop + 25, 500, 0.5).fill(LIGHT_GRAY);

    // --- SUMMARY SECTION ---
    const summaryTop = rowTop + 60;
    const summaryX = 350;

    doc.fillColor(GRAY).font('Helvetica').fontSize(9).text('Subtotal:', summaryX, summaryTop);
    doc.fillColor(BLACK).font('Helvetica-Bold').text(`LKR ${parseFloat(payment.amount_paid).toLocaleString()}`, 480, summaryTop, { align: 'right' });

    const balance = parseFloat(payment.balance_due);
    const balanceLabel = balance < 0 ? 'Credit Balance:' : 'Balance Due:';
    const balanceColor = balance < 0 ? '#16a34a' : ORANGE; // Green for credit

    doc.fillColor(GRAY).font('Helvetica').text(balanceLabel, summaryX, summaryTop + 20);
    doc.fillColor(balanceColor).font('Helvetica-Bold').text(`LKR ${Math.abs(balance).toLocaleString()}`, 480, summaryTop + 20, { align: 'right' });

    // TOTAL BOX
    doc.rect(330, summaryTop + 45, 220, 45).fill(LIGHT_GRAY);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text('TOTAL PAID:', 350, summaryTop + 62);
    doc.fontSize(16).text(`LKR ${parseFloat(payment.amount_paid).toLocaleString()}`, 480, summaryTop + 59, { align: 'right' });

    // --- FOOTER SECTION ---
    const footerTop = 700;
    doc.rect(50, footerTop, 500, 1).fill(LIGHT_GRAY);
    
    doc.fillColor(GRAY)
       .font('Helvetica-Oblique')
       .fontSize(9)
       .text('THANK YOU FOR BEING PART OF THE NARROW FITNESS ELITE.', 50, footerTop + 20, { align: 'center' })
       .font('Helvetica')
       .fontSize(8)
       .text('This is a computer-generated receipt. Valid for membership access. All payments are non-refundable.', 50, footerTop + 35, { align: 'center' });

    // AUTH SIGNATURE (Small professional touch)
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7).text('AUTHORIZED BY NARROW FITNESS DIGITAL', 50, footerTop + 60, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
};
