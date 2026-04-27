import axios from 'axios';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../index.js';

const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY || '';
const NOTIFY_USER_ID = process.env.NOTIFY_USER_ID || '';

export const sendWhatsAppMessage = async (to: string, message: string) => {
  if (!NOTIFY_API_KEY || !NOTIFY_USER_ID) {
    console.warn("⚠️ Notify.lk API credentials missing. Skipping WhatsApp.");
    return;
  }

  try {
    // Note: Notify.lk API endpoint and parameters might vary, using a placeholder for implementation
    // Assuming a typical REST API call for Notify.lk
    await axios.post('https://app.notify.lk/api/v1/send', {
      user_id: NOTIFY_USER_ID,
      api_key: NOTIFY_API_KEY,
      to,
      message,
    });
    console.log(`✅ WhatsApp sent to ${to}`);
  } catch (error: any) {
    console.error("❌ WhatsApp Error:", error.response?.data || error.message);
  }
};

export const generateReceiptPDF = async (paymentId: number) => {
  const paymentRes = await query(`
    SELECT p.*, u.name as user_name, u.email as user_email, pr.name as package_name, pr.duration as package_duration
    FROM payments p
    JOIN users u ON p.userid = u.id
    JOIN pricing pr ON p.package_id = pr.id
    WHERE p.id = $1
  `, [paymentId]);

  if (paymentRes.rows.length === 0) throw new Error("Payment not found");
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
    doc.moveDown(3);
    doc.fillColor('#444444')
       .fontSize(12)
       .text(`RECEIPT NO: #NF-PAY-${payment.id}`, { bold: true })
       .text(`DATE: ${new Date(payment.created_at).toLocaleDateString().toUpperCase()}`)
       .moveDown();

    // Bill To
    doc.fontSize(10).text('BILL TO:', { charSpacing: 1 });
    doc.fontSize(14).fillColor('#000000').text(payment.user_name.toUpperCase(), { bold: true });
    doc.fontSize(10).fillColor('#444444').text(payment.user_email);
    doc.moveDown(2);

    // Table Header
    const tableTop = 280;
    doc.rect(50, tableTop, 500, 25).fill('#f3f4f6');
    doc.fillColor('#000000')
       .fontSize(10)
       .text('DESCRIPTION', 60, tableTop + 8)
       .text('DURATION', 250, tableTop + 8)
       .text('STATUS', 380, tableTop + 8)
       .text('AMOUNT', 480, tableTop + 8, { align: 'right' });

    // Table Content
    const rowTop = tableTop + 35;
    doc.fontSize(11)
       .text(`${payment.package_name} Membership Plan`, 60, rowTop)
       .text(payment.package_duration, 250, rowTop)
       .text(payment.status.toUpperCase(), 380, rowTop);
    
    doc.fontSize(12).text(`LKR ${parseFloat(payment.amount_paid).toLocaleString()}`, 480, rowTop, { align: 'right', bold: true });

    // Summary
    doc.moveDown(4);
    const summaryTop = doc.y;
    doc.rect(300, summaryTop, 250, 100).stroke('#eeeeee');
    
    doc.fontSize(10).fillColor('#444444').text('TOTAL PAID:', 320, summaryTop + 20);
    doc.fontSize(14).fillColor('#000000').text(`LKR ${parseFloat(payment.amount_paid).toLocaleString()}`, 450, summaryTop + 18, { align: 'right', bold: true });

    doc.fontSize(10).fillColor('#f97316').text('BALANCE DUE:', 320, summaryTop + 50);
    doc.fontSize(12).fillColor('#f97316').text(`LKR ${parseFloat(payment.balance_due).toLocaleString()}`, 450, summaryTop + 48, { align: 'right', bold: true });

    doc.fontSize(10).fillColor('#444444').text('METHOD:', 320, summaryTop + 75);
    doc.fontSize(10).fillColor('#000000').text(payment.payment_method.toUpperCase(), 450, summaryTop + 75, { align: 'right' });

    // Footer
    doc.moveDown(8);
    doc.fontSize(10).fillColor('#aaaaaa').text('Thank you for being part of the Narrow Fitness Elite.', { align: 'center', italic: true });
    doc.text('Valid for membership access. Non-refundable.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
};
